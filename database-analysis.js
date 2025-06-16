#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = "postgresql://neondb_owner:npg_wqC0LP7yRHlT@ep-small-resonance-a45diqst-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Função para obter todas as tabelas
async function getAllTables() {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        table_name,
        table_type,
        is_insertable_into,
        is_typed
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

// Função para obter estrutura detalhada de uma tabela
async function getTableStructure(tableName) {
  const client = await pool.connect();
  try {
    // Colunas da tabela
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default,
        ordinal_position,
        udt_name,
        is_updatable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position;
    `;
    const columnsResult = await client.query(columnsQuery, [tableName]);
    
    // Constraints da tabela
    const constraintsQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        tc.is_deferrable,
        tc.initially_deferred
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      WHERE tc.table_schema = 'public' 
      AND tc.table_name = $1
      ORDER BY tc.constraint_type, kcu.ordinal_position;
    `;
    const constraintsResult = await client.query(constraintsQuery, [tableName]);
    
    // Foreign keys da tabela
    const foreignKeysQuery = `
      SELECT 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.constraint_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.constraint_column_usage ccu 
        ON kcu.constraint_name = ccu.constraint_name
      JOIN information_schema.referential_constraints rc 
        ON kcu.constraint_name = rc.constraint_name
      WHERE kcu.table_schema = 'public'
      AND kcu.table_name = $1;
    `;
    const foreignKeysResult = await client.query(foreignKeysQuery, [tableName]);
    
    // Índices da tabela
    const indexesQuery = `
      SELECT 
        indexname,
        indexdef,
        tablespace
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = $1;
    `;
    const indexesResult = await client.query(indexesQuery, [tableName]);
    
    // Contagem de registros
    const countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
    const countResult = await client.query(countQuery);
    
    // Tamanho da tabela
    const sizeQuery = `
      SELECT 
        pg_size_pretty(pg_total_relation_size($1)) as total_size,
        pg_size_pretty(pg_relation_size($1)) as table_size,
        pg_size_pretty(pg_total_relation_size($1) - pg_relation_size($1)) as index_size
    `;
    const sizeResult = await client.query(sizeQuery, [`public.${tableName}`]);
    
    return {
      columns: columnsResult.rows,
      constraints: constraintsResult.rows,
      foreignKeys: foreignKeysResult.rows,
      indexes: indexesResult.rows,
      recordCount: parseInt(countResult.rows[0].count),
      sizes: sizeResult.rows[0]
    };
  } finally {
    client.release();
  }
}

// Função para analisar relacionamentos órfãos
async function analyzeOrphanedRelationships() {
  const client = await pool.connect();
  try {
    const issues = [];
    
    // Verificar projects órfãos (sem photographer_id válido)
    const orphanedProjectsQuery = `
      SELECT p.id, p.name, p.photographer_id
      FROM projects p
      LEFT JOIN users u ON p.photographer_id = u.id
      WHERE u.id IS NULL AND p.photographer_id IS NOT NULL;
    `;
    const orphanedProjects = await client.query(orphanedProjectsQuery);
    if (orphanedProjects.rows.length > 0) {
      issues.push({
        type: 'orphaned_records',
        table: 'projects',
        description: 'Projetos com photographer_id que não existem na tabela users',
        count: orphanedProjects.rows.length,
        examples: orphanedProjects.rows.slice(0, 5)
      });
    }
    
    // Verificar new_projects órfãos
    const orphanedNewProjectsQuery = `
      SELECT np.id, np.name, np.user_id
      FROM new_projects np
      LEFT JOIN users u ON np.user_id = u.id
      WHERE u.id IS NULL AND np.user_id IS NOT NULL;
    `;
    const orphanedNewProjects = await client.query(orphanedNewProjectsQuery);
    if (orphanedNewProjects.rows.length > 0) {
      issues.push({
        type: 'orphaned_records',
        table: 'new_projects',
        description: 'Novos projetos com user_id que não existem na tabela users',
        count: orphanedNewProjects.rows.length,
        examples: orphanedNewProjects.rows.slice(0, 5)
      });
    }
    
    // Verificar photos órfãs
    const orphanedPhotosQuery = `
      SELECT ph.id, ph.filename, ph.project_id
      FROM photos ph
      LEFT JOIN new_projects np ON ph.project_id = np.id
      WHERE np.id IS NULL AND ph.project_id IS NOT NULL;
    `;
    const orphanedPhotos = await client.query(orphanedPhotosQuery);
    if (orphanedPhotos.rows.length > 0) {
      issues.push({
        type: 'orphaned_records',
        table: 'photos',
        description: 'Fotos com project_id que não existem na tabela new_projects',
        count: orphanedPhotos.rows.length,
        examples: orphanedPhotos.rows.slice(0, 5)
      });
    }
    
    // Verificar password_reset_tokens órfãos
    const orphanedTokensQuery = `
      SELECT prt.id, prt.token, prt.user_id
      FROM password_reset_tokens prt
      LEFT JOIN users u ON prt.user_id = u.id
      WHERE u.id IS NULL AND prt.user_id IS NOT NULL;
    `;
    const orphanedTokens = await client.query(orphanedTokensQuery);
    if (orphanedTokens.rows.length > 0) {
      issues.push({
        type: 'orphaned_records',
        table: 'password_reset_tokens',
        description: 'Tokens de reset com user_id que não existem na tabela users',
        count: orphanedTokens.rows.length,
        examples: orphanedTokens.rows.slice(0, 5)
      });
    }
    
    return issues;
  } finally {
    client.release();
  }
}

// Função para analisar campos não utilizados
async function analyzeUnusedFields() {
  const client = await pool.connect();
  try {
    const issues = [];
    
    // Verificar campos sempre NULL ou com valores padrão
    const tables = ['users', 'projects', 'new_projects', 'photos', 'photo_comments', 'password_reset_tokens'];
    
    for (const tableName of tables) {
      const columnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1;
      `;
      const columns = await client.query(columnsQuery, [tableName]);
      
      for (const column of columns.rows) {
        const fieldName = column.column_name;
        
        // Verificar se o campo está sempre NULL
        const nullCheckQuery = `
          SELECT COUNT(*) as total,
                 COUNT(${fieldName}) as non_null
          FROM "${tableName}";
        `;
        const nullCheck = await client.query(nullCheckQuery);
        const total = parseInt(nullCheck.rows[0].total);
        const nonNull = parseInt(nullCheck.rows[0].non_null);
        
        if (total > 0 && nonNull === 0) {
          issues.push({
            type: 'unused_field',
            table: tableName,
            field: fieldName,
            description: `Campo sempre NULL em ${total} registros`,
            severity: 'medium'
          });
        }
        
        // Verificar campos com valores repetitivos (mais de 95% iguais)
        if (nonNull > 10) {
          const diversityQuery = `
            SELECT COUNT(DISTINCT ${fieldName}) as unique_values,
                   COUNT(*) as total_records
            FROM "${tableName}"
            WHERE ${fieldName} IS NOT NULL;
          `;
          const diversity = await client.query(diversityQuery);
          const uniqueValues = parseInt(diversity.rows[0].unique_values);
          const totalRecords = parseInt(diversity.rows[0].total_records);
          
          if (totalRecords > 0 && (uniqueValues / totalRecords) < 0.05) {
            issues.push({
              type: 'low_diversity_field',
              table: tableName,
              field: fieldName,
              description: `Campo com baixa diversidade: ${uniqueValues} valores únicos em ${totalRecords} registros`,
              severity: 'low'
            });
          }
        }
      }
    }
    
    return issues;
  } finally {
    client.release();
  }
}

// Função para analisar redundâncias
async function analyzeRedundancies() {
  const issues = [];
  
  // Verificar se há duas tabelas de projetos (projects e new_projects)
  issues.push({
    type: 'table_redundancy',
    description: 'Existem duas tabelas de projetos: "projects" e "new_projects"',
    tables: ['projects', 'new_projects'],
    recommendation: 'Considerar migrar todos os dados para uma única tabela',
    severity: 'high'
  });
  
  // Verificar sessions muito antigas
  const client = await pool.connect();
  try {
    const oldSessionsQuery = `
      SELECT COUNT(*) as count
      FROM session
      WHERE expire < NOW() - INTERVAL '30 days';
    `;
    const oldSessions = await client.query(oldSessionsQuery);
    const oldCount = parseInt(oldSessions.rows[0].count);
    
    if (oldCount > 0) {
      issues.push({
        type: 'data_cleanup',
        table: 'session',
        description: `${oldCount} sessões expiradas há mais de 30 dias`,
        recommendation: 'Implementar limpeza automática de sessões antigas',
        severity: 'medium'
      });
    }
    
    // Verificar tokens de reset expirados
    const expiredTokensQuery = `
      SELECT COUNT(*) as count
      FROM password_reset_tokens
      WHERE expires_at < NOW();
    `;
    const expiredTokens = await client.query(expiredTokensQuery);
    const expiredCount = parseInt(expiredTokens.rows[0].count);
    
    if (expiredCount > 0) {
      issues.push({
        type: 'data_cleanup',
        table: 'password_reset_tokens',
        description: `${expiredCount} tokens de reset de senha expirados`,
        recommendation: 'Implementar limpeza automática de tokens expirados',
        severity: 'medium'
      });
    }
    
  } finally {
    client.release();
  }
  
  return issues;
}

// Função principal de análise
async function performDatabaseAnalysis() {
  console.log('🔍 ANÁLISE COMPLETA DA ESTRUTURA DO BANCO DE DADOS\n');
  console.log('=' .repeat(80));
  
  try {
    const client = await pool.connect();
    const dbInfo = await client.query('SELECT current_database(), current_user, version()');
    console.log(`\nBANCO: ${dbInfo.rows[0].current_database}`);
    console.log(`USUÁRIO: ${dbInfo.rows[0].current_user}`);
    console.log(`VERSÃO: ${dbInfo.rows[0].version.split(',')[0]}\n`);
    client.release();
    
    // 1. Obter todas as tabelas
    console.log('📋 1. INVENTÁRIO DE TABELAS');
    console.log('=' .repeat(50));
    const tables = await getAllTables();
    console.log(`Total de tabelas encontradas: ${tables.length}\n`);
    
    const analysis = {
      database: dbInfo.rows[0].current_database,
      timestamp: new Date().toISOString(),
      tables: {},
      summary: {
        totalTables: tables.length,
        totalRecords: 0,
        totalSize: '0 MB'
      },
      issues: {
        orphanedRecords: [],
        unusedFields: [],
        redundancies: [],
        structuralIssues: []
      }
    };
    
    // 2. Analisar cada tabela
    console.log('🔬 2. ANÁLISE DETALHADA POR TABELA');
    console.log('=' .repeat(50));
    
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\n📦 TABELA: ${tableName.toUpperCase()}`);
      console.log('-' .repeat(40));
      
      const structure = await getTableStructure(tableName);
      analysis.tables[tableName] = {
        type: table.table_type,
        recordCount: structure.recordCount,
        sizes: structure.sizes,
        columns: structure.columns,
        constraints: structure.constraints,
        foreignKeys: structure.foreignKeys,
        indexes: structure.indexes
      };
      
      analysis.summary.totalRecords += structure.recordCount;
      
      console.log(`Registros: ${structure.recordCount.toLocaleString()}`);
      console.log(`Tamanho total: ${structure.sizes.total_size}`);
      console.log(`Tamanho da tabela: ${structure.sizes.table_size}`);
      console.log(`Tamanho dos índices: ${structure.sizes.index_size}`);
      
      console.log('\nCOLUNAS:');
      structure.columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        console.log(`  ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });
      
      if (structure.constraints.length > 0) {
        console.log('\nCONSTRAINTS:');
        structure.constraints.forEach(constraint => {
          console.log(`  ${constraint.constraint_type}: ${constraint.constraint_name} (${constraint.column_name || 'múltiplas colunas'})`);
        });
      }
      
      if (structure.foreignKeys.length > 0) {
        console.log('\nCHAVES ESTRANGEIRAS:');
        structure.foreignKeys.forEach(fk => {
          console.log(`  ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
          console.log(`    Update: ${fk.update_rule}, Delete: ${fk.delete_rule}`);
        });
      }
      
      if (structure.indexes.length > 0) {
        console.log('\nÍNDICES:');
        structure.indexes.forEach(idx => {
          console.log(`  ${idx.indexname}: ${idx.indexdef}`);
        });
      }
    }
    
    // 3. Analisar relacionamentos órfãos
    console.log('\n\n🔗 3. ANÁLISE DE RELACIONAMENTOS');
    console.log('=' .repeat(50));
    const orphanedIssues = await analyzeOrphanedRelationships();
    analysis.issues.orphanedRecords = orphanedIssues;
    
    if (orphanedIssues.length === 0) {
      console.log('✅ Nenhum relacionamento órfão encontrado');
    } else {
      orphanedIssues.forEach(issue => {
        console.log(`❌ ${issue.description}`);
        console.log(`   Tabela: ${issue.table}`);
        console.log(`   Registros afetados: ${issue.count}`);
        if (issue.examples.length > 0) {
          console.log(`   Exemplos: ${JSON.stringify(issue.examples.slice(0, 2), null, 2)}`);
        }
        console.log('');
      });
    }
    
    // 4. Analisar campos não utilizados
    console.log('\n📊 4. ANÁLISE DE UTILIZAÇÃO DE CAMPOS');
    console.log('=' .repeat(50));
    const unusedFieldsIssues = await analyzeUnusedFields();
    analysis.issues.unusedFields = unusedFieldsIssues;
    
    if (unusedFieldsIssues.length === 0) {
      console.log('✅ Todos os campos estão sendo utilizados adequadamente');
    } else {
      unusedFieldsIssues.forEach(issue => {
        console.log(`⚠️  ${issue.table}.${issue.field}: ${issue.description}`);
      });
    }
    
    // 5. Analisar redundâncias
    console.log('\n🔄 5. ANÁLISE DE REDUNDÂNCIAS');
    console.log('=' .repeat(50));
    const redundancyIssues = await analyzeRedundancies();
    analysis.issues.redundancies = redundancyIssues;
    
    redundancyIssues.forEach(issue => {
      const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      console.log(`${severity} ${issue.description}`);
      if (issue.recommendation) {
        console.log(`   Recomendação: ${issue.recommendation}`);
      }
      console.log('');
    });
    
    // 6. Resumo final
    console.log('\n📈 6. RESUMO EXECUTIVO');
    console.log('=' .repeat(50));
    console.log(`Total de tabelas: ${analysis.summary.totalTables}`);
    console.log(`Total de registros: ${analysis.summary.totalRecords.toLocaleString()}`);
    console.log(`Relacionamentos órfãos: ${analysis.issues.orphanedRecords.length}`);
    console.log(`Campos subutilizados: ${analysis.issues.unusedFields.length}`);
    console.log(`Problemas de redundância: ${analysis.issues.redundancies.length}`);
    
    // Salvar relatório
    const reportFile = path.join(__dirname, 'database-analysis-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Relatório detalhado salvo em: ${reportFile}`);
    
    return analysis;
    
  } catch (error) {
    console.error('💥 Erro durante a análise:', error);
    throw error;
  }
}

// Executar análise
if (import.meta.url === `file://${process.argv[1]}`) {
  performDatabaseAnalysis()
    .then(() => {
      return pool.end();
    })
    .then(() => {
      console.log('\n✅ Análise completa finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      pool.end().finally(() => process.exit(1));
    });
}

export { performDatabaseAnalysis };