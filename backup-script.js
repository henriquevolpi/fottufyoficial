#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração da conexão usando o banco Neon correto
const DATABASE_URL = "postgresql://neondb_owner:npg_wqC0LP7yRHlT@ep-small-resonance-a45diqst-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Função para criar diretório de backup
function ensureBackupDirectory() {
  const backupDir = path.join(__dirname, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('✓ Diretório /backup criado');
  }
  return backupDir;
}

// Função para listar todas as tabelas do banco
async function listAllTables() {
  const client = await pool.connect();
  try {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const result = await client.query(query);
    return result.rows.map(row => row.table_name);
  } finally {
    client.release();
  }
}

// Função para obter a estrutura de uma tabela (DDL)
async function getTableStructure(tableName) {
  const client = await pool.connect();
  try {
    // Obter colunas da tabela
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position;
    `;
    const columnsResult = await client.query(columnsQuery, [tableName]);
    
    // Obter constraints (chaves primárias, únicas, etc.)
    const constraintsQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        ccu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
        AND tc.table_name = ccu.table_name
      WHERE tc.table_schema = 'public' 
      AND tc.table_name = $1;
    `;
    const constraintsResult = await client.query(constraintsQuery, [tableName]);
    
    return {
      columns: columnsResult.rows,
      constraints: constraintsResult.rows
    };
  } finally {
    client.release();
  }
}

// Função para exportar dados de uma tabela
async function exportTableData(tableName) {
  const client = await pool.connect();
  try {
    // Contar registros
    const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const totalRecords = parseInt(countResult.rows[0].count);
    
    if (totalRecords === 0) {
      console.log(`⚠️  Tabela ${tableName}: 0 registros (pulando)`);
      return { success: true, records: 0 };
    }
    
    // Exportar todos os dados
    const dataResult = await client.query(`SELECT * FROM "${tableName}"`);
    
    return {
      success: true,
      records: totalRecords,
      data: dataResult.rows
    };
  } catch (error) {
    console.error(`❌ Erro ao exportar dados da tabela ${tableName}:`, error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// Função para gerar SQL INSERT a partir dos dados
function generateInsertSQL(tableName, data, structure) {
  if (!data || data.length === 0) {
    return `-- Tabela ${tableName}: sem dados\n`;
  }
  
  const columns = Object.keys(data[0]);
  let sql = `-- Backup da tabela: ${tableName}\n`;
  sql += `-- Total de registros: ${data.length}\n`;
  sql += `-- Data do backup: ${new Date().toISOString()}\n\n`;
  
  // Desabilitar triggers e constraints temporariamente
  sql += `-- Desabilitar triggers\n`;
  sql += `ALTER TABLE "${tableName}" DISABLE TRIGGER ALL;\n\n`;
  
  // Gerar INSERTs em lotes de 100 registros
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    sql += `INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')}) VALUES\n`;
    
    const values = batch.map(row => {
      const rowValues = columns.map(col => {
        const value = row[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        }
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (value instanceof Date) return `'${value.toISOString()}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return value;
      });
      return `(${rowValues.join(', ')})`;
    });
    
    sql += values.join(',\n');
    sql += ';\n\n';
  }
  
  // Reabilitar triggers
  sql += `-- Reabilitar triggers\n`;
  sql += `ALTER TABLE "${tableName}" ENABLE TRIGGER ALL;\n\n`;
  
  return sql;
}

// Função principal de backup
async function performBackup() {
  console.log('🚀 Iniciando backup completo do banco de dados...\n');
  
  try {
    // Verificar conexão
    const client = await pool.connect();
    const dbResult = await client.query('SELECT current_database(), current_user, version()');
    console.log(`✓ Conectado ao banco: ${dbResult.rows[0].current_database}`);
    console.log(`✓ Usuário: ${dbResult.rows[0].current_user}`);
    client.release();
    
    // Criar diretório de backup
    const backupDir = ensureBackupDirectory();
    
    // Listar todas as tabelas
    console.log('\n📋 Listando tabelas do banco...');
    const tables = await listAllTables();
    console.log(`✓ Encontradas ${tables.length} tabelas: ${tables.join(', ')}\n`);
    
    if (tables.length === 0) {
      console.log('⚠️  Nenhuma tabela encontrada no banco!');
      return;
    }
    
    // Backup de cada tabela
    const results = [];
    let totalRecords = 0;
    
    for (const tableName of tables) {
      console.log(`📦 Processando tabela: ${tableName}`);
      
      try {
        // Obter estrutura da tabela
        const structure = await getTableStructure(tableName);
        
        // Exportar dados
        const exportResult = await exportTableData(tableName);
        
        if (exportResult.success) {
          // Salvar como JSON (para estrutura de dados)
          const jsonFile = path.join(backupDir, `backup_${tableName}.json`);
          const jsonData = {
            tableName,
            timestamp: new Date().toISOString(),
            recordCount: exportResult.records,
            structure: structure,
            data: exportResult.data || []
          };
          fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2));
          
          // Salvar como SQL (para restauração direta)
          const sqlFile = path.join(backupDir, `backup_${tableName}.sql`);
          const sqlContent = generateInsertSQL(tableName, exportResult.data, structure);
          fs.writeFileSync(sqlFile, sqlContent);
          
          console.log(`  ✓ ${exportResult.records} registros salvos em:`);
          console.log(`    - ${jsonFile}`);
          console.log(`    - ${sqlFile}`);
          
          totalRecords += exportResult.records;
          results.push({ table: tableName, success: true, records: exportResult.records });
        } else {
          console.log(`  ❌ Falha no backup: ${exportResult.error}`);
          results.push({ table: tableName, success: false, error: exportResult.error });
        }
      } catch (error) {
        console.error(`  ❌ Erro inesperado na tabela ${tableName}:`, error.message);
        results.push({ table: tableName, success: false, error: error.message });
      }
      
      console.log(''); // Linha em branco para separar
    }
    
    // Criar arquivo de resumo
    const summaryFile = path.join(backupDir, 'backup_summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      database: dbResult.rows[0].current_database,
      totalTables: tables.length,
      totalRecords: totalRecords,
      results: results,
      successfulTables: results.filter(r => r.success).length,
      failedTables: results.filter(r => !r.success).length
    };
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    // Resumo final
    console.log('📊 RESUMO DO BACKUP:');
    console.log(`✓ Total de tabelas: ${tables.length}`);
    console.log(`✓ Backup bem-sucedido: ${summary.successfulTables}`);
    console.log(`✓ Total de registros: ${totalRecords.toLocaleString()}`);
    if (summary.failedTables > 0) {
      console.log(`❌ Falhas: ${summary.failedTables}`);
    }
    console.log(`📁 Arquivos salvos em: ${backupDir}`);
    console.log(`📋 Resumo detalhado: ${summaryFile}`);
    
    console.log('\n🎉 Backup concluído com sucesso!');
    
  } catch (error) {
    console.error('💥 Erro crítico durante o backup:', error);
    process.exit(1);
  }
}

// Função para fechar conexões
async function cleanup() {
  try {
    await pool.end();
    console.log('✓ Conexões com o banco fechadas');
  } catch (error) {
    console.error('Erro ao fechar conexões:', error);
  }
}

// Tratamento de sinais para limpeza
process.on('SIGINT', async () => {
  console.log('\n⚠️  Interrupção detectada, fechando conexões...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Terminação detectada, fechando conexões...');
  await cleanup();
  process.exit(0);
});

// Executar backup
if (import.meta.url === `file://${process.argv[1]}`) {
  performBackup()
    .then(() => {
      return cleanup();
    })
    .then(() => {
      console.log('✅ Script finalizado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      cleanup().finally(() => process.exit(1));
    });
}

export { performBackup, cleanup };