#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do banco Neon
const NEON_CONNECTION = {
  connectionString: 'postgresql://neondb_owner:npg_wqC0LP7yRHlT@ep-small-resonance-a45diqst-pooler.us-east-1.aws.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

console.log('🚀 CRIANDO DUMP SQL COMPLETO DO BANCO NEON');
console.log('==========================================');

async function connectToNeon() {
  console.log('📡 Conectando ao banco Neon...');
  const neonPool = new Pool(NEON_CONNECTION);
  
  try {
    await neonPool.query('SELECT 1');
    console.log('✅ Conexão estabelecida com sucesso');
    return neonPool;
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    throw error;
  }
}

async function getAllTables(pool) {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => row.table_name);
}

async function getTableStructure(pool, tableName) {
  // Obter estrutura da tabela
  const structureQuery = `
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position;
  `;
  
  const constraintsQuery = `
    SELECT 
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = $1;
  `;
  
  const [columnsResult, constraintsResult] = await Promise.all([
    pool.query(structureQuery, [tableName]),
    pool.query(constraintsQuery, [tableName])
  ]);
  
  return {
    columns: columnsResult.rows,
    constraints: constraintsResult.rows
  };
}

function generateCreateTableSQL(tableName, structure) {
  let sql = `-- Tabela: ${tableName}\n`;
  sql += `DROP TABLE IF EXISTS ${tableName} CASCADE;\n`;
  sql += `CREATE TABLE ${tableName} (\n`;
  
  const columnDefinitions = structure.columns.map(col => {
    let def = `  ${col.column_name} ${col.data_type}`;
    
    if (col.character_maximum_length) {
      def += `(${col.character_maximum_length})`;
    }
    
    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }
    
    if (col.column_default) {
      def += ` DEFAULT ${col.column_default}`;
    }
    
    return def;
  });
  
  sql += columnDefinitions.join(',\n');
  sql += '\n);\n\n';
  
  return sql;
}

async function getTableData(pool, tableName) {
  const query = `SELECT * FROM ${tableName}`;
  const result = await pool.query(query);
  return result.rows;
}

function generateInsertSQL(tableName, data) {
  if (data.length === 0) {
    return `-- Tabela ${tableName} está vazia\n\n`;
  }
  
  let sql = `-- Dados da tabela: ${tableName}\n`;
  const columns = Object.keys(data[0]);
  const columnNames = columns.join(', ');
  
  // Processar dados em lotes para evitar SQLs muito grandes
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const values = batch.map(row => {
      const rowValues = columns.map(col => {
        const value = row[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (value instanceof Date) return `'${value.toISOString()}'`;
        return value;
      });
      return `(${rowValues.join(', ')})`;
    });
    
    sql += `INSERT INTO ${tableName} (${columnNames}) VALUES\n`;
    sql += values.join(',\n');
    sql += ';\n\n';
  }
  
  return sql;
}

async function getSequences(pool) {
  const query = `
    SELECT 
      sequence_name, 
      last_value,
      start_value,
      increment_by
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public';
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.log('⚠️ Não foi possível obter sequences');
    return [];
  }
}

function generateSequenceSQL(sequences) {
  if (sequences.length === 0) return '';
  
  let sql = '-- Sequences\n';
  sequences.forEach(seq => {
    sql += `DROP SEQUENCE IF EXISTS ${seq.sequence_name} CASCADE;\n`;
    sql += `CREATE SEQUENCE ${seq.sequence_name}`;
    sql += ` START ${seq.start_value}`;
    sql += ` INCREMENT ${seq.increment_by};\n`;
    sql += `SELECT setval('${seq.sequence_name}', ${seq.last_value});\n\n`;
  });
  
  return sql;
}

async function createSQLDump() {
  let neonPool;
  
  try {
    neonPool = await connectToNeon();
    
    console.log('📋 Obtendo lista de tabelas...');
    const tables = await getAllTables(neonPool);
    console.log(`✅ Encontradas ${tables.length} tabelas:`, tables.join(', '));
    
    console.log('🔢 Obtendo sequences...');
    const sequences = await getSequences(neonPool);
    console.log(`✅ Encontradas ${sequences.length} sequences`);
    
    let fullSQL = '';
    fullSQL += '-- BACKUP COMPLETO DO BANCO NEON\n';
    fullSQL += `-- Data: ${new Date().toISOString()}\n`;
    fullSQL += `-- Origem: Neon Database (neondb)\n`;
    fullSQL += `-- Destino: Replit PostgreSQL\n\n`;
    
    // Adicionar sequences
    fullSQL += generateSequenceSQL(sequences);
    
    let totalRecords = 0;
    
    // Processar cada tabela
    for (const tableName of tables) {
      console.log(`📦 Processando: ${tableName}`);
      
      try {
        const structure = await getTableStructure(neonPool, tableName);
        const data = await getTableData(neonPool, tableName);
        
        totalRecords += data.length;
        console.log(`  📊 ${data.length} registros`);
        
        // Gerar SQL de criação
        fullSQL += generateCreateTableSQL(tableName, structure);
        
        // Gerar SQL de inserção
        fullSQL += generateInsertSQL(tableName, data);
        
      } catch (error) {
        console.error(`  ❌ Erro em ${tableName}:`, error.message);
        fullSQL += `-- ERRO ao processar tabela ${tableName}: ${error.message}\n\n`;
      }
    }
    
    // Salvar dump
    const dumpPath = path.join(__dirname, 'neon-complete-dump.sql');
    fs.writeFileSync(dumpPath, fullSQL);
    
    console.log('\n🎉 DUMP SQL CRIADO COM SUCESSO!');
    console.log('===============================');
    console.log(`📁 Arquivo: ${dumpPath}`);
    console.log(`📊 Total de registros: ${totalRecords.toLocaleString()}`);
    console.log(`📦 Tabelas: ${tables.length}`);
    console.log(`🔢 Sequences: ${sequences.length}`);
    console.log('');
    console.log('🔐 SEU BANCO NEON PERMANECE INTACTO');
    
    return {
      dumpPath,
      totalRecords,
      tablesCount: tables.length,
      sequencesCount: sequences.length
    };
    
  } catch (error) {
    console.error('\n❌ ERRO AO CRIAR DUMP:', error.message);
    throw error;
  } finally {
    if (neonPool) await neonPool.end();
  }
}

// Executar
if (import.meta.url === `file://${process.argv[1]}`) {
  createSQLDump()
    .then(() => {
      console.log('✅ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Processo falhou:', error.message);
      process.exit(1);
    });
}

export { createSQLDump };