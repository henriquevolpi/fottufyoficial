
const { Pool } = require('pg');

// Usando a mesma configuração do server/db.ts
const FORCED_DATABASE_URL = "postgresql://neondb_owner:npg_wqC0LP7yRHlT@ep-small-resonance-a45diqst-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: FORCED_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function analyzeDatabaseStructure() {
  console.log('='.repeat(80));
  console.log('RELATÓRIO COMPLETO DA ESTRUTURA DO BANCO DE DADOS');
  console.log('='.repeat(80));
  console.log(`Database: ${FORCED_DATABASE_URL.split('@')[1].split('/')[0]}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  try {
    // 1. LISTAR TODAS AS TABELAS
    console.log('\n📋 1. TABELAS EXISTENTES NO BANCO');
    console.log('-'.repeat(50));
    
    const tablesQuery = `
      SELECT 
        schemaname,
        tablename,
        tableowner,
        hasindexes,
        hasrules,
        hastriggers
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    console.log(`Total de tabelas encontradas: ${tablesResult.rows.length}`);
    console.log();
    
    tablesResult.rows.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename}`);
      console.log(`   - Schema: ${table.schemaname}`);
      console.log(`   - Owner: ${table.tableowner}`);
      console.log(`   - Possui índices: ${table.hasindexes}`);
      console.log(`   - Possui regras: ${table.hasrules}`);
      console.log(`   - Possui triggers: ${table.hastriggers}`);
      console.log();
    });

    // 2. ESTRUTURA DETALHADA DE CADA TABELA
    console.log('\n🏗️  2. ESTRUTURA DETALHADA DAS TABELAS');
    console.log('-'.repeat(50));

    for (const table of tablesResult.rows) {
      console.log(`\n📊 TABELA: ${table.tablename.toUpperCase()}`);
      console.log('─'.repeat(40));

      // Colunas da tabela
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await pool.query(columnsQuery, [table.tablename]);
      console.log(`Colunas (${columnsResult.rows.length}):`);
      
      columnsResult.rows.forEach((col) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        
        console.log(`  ${col.ordinal_position}. ${col.column_name}`);
        console.log(`     Tipo: ${col.data_type}${maxLength}`);
        console.log(`     Nulo: ${nullable}`);
        if (defaultValue) console.log(`     Padrão: ${col.column_default}`);
        console.log();
      });

      // Contagem de registros
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as total FROM "${table.tablename}"`);
        console.log(`📈 Total de registros: ${countResult.rows[0].total}`);
      } catch (error) {
        console.log(`❌ Erro ao contar registros: ${error.message}`);
      }
      
      console.log();
    }

    // 3. CHAVES PRIMÁRIAS
    console.log('\n🔑 3. CHAVES PRIMÁRIAS');
    console.log('-'.repeat(50));
    
    const primaryKeysQuery = `
      SELECT 
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.ordinal_position;
    `;
    
    const primaryKeysResult = await pool.query(primaryKeysQuery);
    
    const primaryKeysByTable = {};
    primaryKeysResult.rows.forEach(row => {
      if (!primaryKeysByTable[row.table_name]) {
        primaryKeysByTable[row.table_name] = [];
      }
      primaryKeysByTable[row.table_name].push(row.column_name);
    });
    
    Object.entries(primaryKeysByTable).forEach(([tableName, columns]) => {
      console.log(`${tableName}: ${columns.join(', ')}`);
    });

    // 4. CHAVES ESTRANGEIRAS E RELACIONAMENTOS
    console.log('\n🔗 4. CHAVES ESTRANGEIRAS E RELACIONAMENTOS');
    console.log('-'.repeat(50));
    
    const foreignKeysQuery = `
      SELECT 
        tc.table_name as tabela_origem,
        kcu.column_name as coluna_origem,
        ccu.table_name as tabela_destino,
        ccu.column_name as coluna_destino,
        tc.constraint_name as nome_constraint,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `;
    
    const foreignKeysResult = await pool.query(foreignKeysQuery);
    
    if (foreignKeysResult.rows.length === 0) {
      console.log('❌ Nenhuma chave estrangeira encontrada');
    } else {
      foreignKeysResult.rows.forEach((fk, index) => {
        console.log(`${index + 1}. ${fk.tabela_origem}.${fk.coluna_origem} → ${fk.tabela_destino}.${fk.coluna_destino}`);
        console.log(`   Constraint: ${fk.nome_constraint}`);
        console.log(`   Delete Rule: ${fk.delete_rule}`);
        console.log(`   Update Rule: ${fk.update_rule}`);
        console.log();
      });
    }

    // 5. ÍNDICES
    console.log('\n📇 5. ÍNDICES DAS TABELAS');
    console.log('-'.repeat(50));
    
    const indexesQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    
    const indexesResult = await pool.query(indexesQuery);
    
    const indexesByTable = {};
    indexesResult.rows.forEach(row => {
      if (!indexesByTable[row.tablename]) {
        indexesByTable[row.tablename] = [];
      }
      indexesByTable[row.tablename].push({
        name: row.indexname,
        definition: row.indexdef
      });
    });
    
    Object.entries(indexesByTable).forEach(([tableName, indexes]) => {
      console.log(`\n${tableName}:`);
      indexes.forEach((index, i) => {
        console.log(`  ${i + 1}. ${index.name}`);
        console.log(`     ${index.definition}`);
      });
    });

    // 6. CONSTRAINTS E VALIDAÇÕES
    console.log('\n✅ 6. CONSTRAINTS E VALIDAÇÕES');
    console.log('-'.repeat(50));
    
    const constraintsQuery = `
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('CHECK', 'UNIQUE')
      ORDER BY tc.table_name, tc.constraint_type;
    `;
    
    const constraintsResult = await pool.query(constraintsQuery);
    
    if (constraintsResult.rows.length === 0) {
      console.log('❌ Nenhuma constraint CHECK ou UNIQUE encontrada');
    } else {
      constraintsResult.rows.forEach((constraint) => {
        console.log(`${constraint.table_name}.${constraint.constraint_name}`);
        console.log(`  Tipo: ${constraint.constraint_type}`);
        if (constraint.check_clause) {
          console.log(`  Regra: ${constraint.check_clause}`);
        }
        console.log();
      });
    }

    // 7. ANÁLISE DE PROBLEMAS POTENCIAIS
    console.log('\n⚠️  7. ANÁLISE DE PROBLEMAS POTENCIAIS');
    console.log('-'.repeat(50));
    
    // Verificar tabelas sem chave primária
    console.log('\n🔍 Tabelas sem chave primária:');
    const tablesWithoutPK = tablesResult.rows.filter(table => 
      !primaryKeysByTable[table.tablename]
    );
    
    if (tablesWithoutPK.length === 0) {
      console.log('✅ Todas as tabelas possuem chave primária');
    } else {
      tablesWithoutPK.forEach(table => {
        console.log(`❌ ${table.tablename}`);
      });
    }
    
    // Verificar relacionamentos quebrados
    console.log('\n🔍 Verificação de integridade referencial:');
    for (const fk of foreignKeysResult.rows) {
      try {
        const integrityQuery = `
          SELECT COUNT(*) as broken_refs
          FROM "${fk.tabela_origem}" o
          LEFT JOIN "${fk.tabela_destino}" d ON o."${fk.coluna_origem}" = d."${fk.coluna_destino}"
          WHERE o."${fk.coluna_origem}" IS NOT NULL 
            AND d."${fk.coluna_destino}" IS NULL;
        `;
        
        const integrityResult = await pool.query(integrityQuery);
        const brokenRefs = integrityResult.rows[0].broken_refs;
        
        if (brokenRefs > 0) {
          console.log(`❌ ${fk.tabela_origem}.${fk.coluna_origem} → ${fk.tabela_destino}.${fk.coluna_destino}: ${brokenRefs} referências quebradas`);
        } else {
          console.log(`✅ ${fk.tabela_origem}.${fk.coluna_origem} → ${fk.tabela_destino}.${fk.coluna_destino}: OK`);
        }
      } catch (error) {
        console.log(`❌ Erro ao verificar ${fk.tabela_origem}.${fk.coluna_origem}: ${error.message}`);
      }
    }

    // 8. DETALHAMENTO DE CAMPOS JSON/JSONB
    console.log('\n📄 8. CAMPOS JSON/JSONB IDENTIFICADOS');
    console.log('-'.repeat(50));
    
    const jsonFieldsQuery = `
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND data_type IN ('json', 'jsonb')
      ORDER BY table_name, column_name;
    `;
    
    const jsonFieldsResult = await pool.query(jsonFieldsQuery);
    
    if (jsonFieldsResult.rows.length === 0) {
      console.log('❌ Nenhum campo JSON/JSONB encontrado');
    } else {
      for (const field of jsonFieldsResult.rows) {
        console.log(`\n${field.table_name}.${field.column_name} (${field.data_type})`);
        
        // Verificar estrutura dos dados JSON
        try {
          const sampleQuery = `
            SELECT "${field.column_name}"
            FROM "${field.table_name}" 
            WHERE "${field.column_name}" IS NOT NULL 
            LIMIT 3;
          `;
          
          const sampleResult = await pool.query(sampleQuery);
          console.log('  Exemplos de dados:');
          sampleResult.rows.forEach((row, i) => {
            console.log(`    ${i + 1}. ${JSON.stringify(row[field.column_name], null, 2).substring(0, 200)}${JSON.stringify(row[field.column_name]).length > 200 ? '...' : ''}`);
          });
        } catch (error) {
          console.log(`    ❌ Erro ao acessar dados: ${error.message}`);
        }
      }
    }

    // 9. RESUMO EXECUTIVO
    console.log('\n📋 9. RESUMO EXECUTIVO');
    console.log('-'.repeat(50));
    
    const totalTables = tablesResult.rows.length;
    const totalRelationships = foreignKeysResult.rows.length;
    const totalIndexes = indexesResult.rows.length;
    
    console.log(`📊 Total de tabelas: ${totalTables}`);
    console.log(`🔗 Total de relacionamentos: ${totalRelationships}`);
    console.log(`📇 Total de índices: ${totalIndexes}`);
    console.log(`📄 Total de campos JSON: ${jsonFieldsResult.rows.length}`);
    
    // Contar total de registros em todas as tabelas
    let totalRecords = 0;
    for (const table of tablesResult.rows) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as total FROM "${table.tablename}"`);
        totalRecords += parseInt(countResult.rows[0].total);
      } catch (error) {
        console.log(`❌ Erro ao contar ${table.tablename}: ${error.message}`);
      }
    }
    console.log(`📈 Total de registros no banco: ${totalRecords.toLocaleString()}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('FIM DO RELATÓRIO');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erro durante a análise:', error);
  } finally {
    await pool.end();
  }
}

// Executar a análise
analyzeDatabaseStructure().catch(console.error);
