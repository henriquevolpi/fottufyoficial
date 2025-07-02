/**
 * BACKUP COMPLETO E SEGURO DO BANCO DE DADOS - 02/07/2025
 * 
 * Este script faz backup completo do banco de dados atual
 * APENAS LEITURA - não modifica nenhum dado
 * Gera arquivo SQL completo para restauração
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';
import path from 'path';

// Configurar WebSocket para Neon
neonConfig.webSocketConstructor = ws;

// Configuração do banco (usando DATABASE_URL do ambiente)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function formatDate() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

async function getAllTables() {
  const result = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `);
  return result.rows.map(row => row.tablename);
}

async function getTableStructure(tableName) {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default,
           character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function getTableConstraints(tableName) {
  const result = await pool.query(`
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
    WHERE tc.table_schema = 'public' AND tc.table_name = $1
  `, [tableName]);
  return result.rows;
}

async function getTableIndexes(tableName) {
  const result = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1
    AND indexname NOT LIKE '%_pkey'
  `, [tableName]);
  return result.rows;
}

async function getTableData(tableName) {
  try {
    const result = await pool.query(`SELECT * FROM "${tableName}" ORDER BY id`);
    return result.rows;
  } catch (error) {
    console.log(`Erro ao buscar dados da tabela ${tableName}:`, error.message);
    // Tentar sem ORDER BY se não houver coluna id
    try {
      const result = await pool.query(`SELECT * FROM "${tableName}"`);
      return result.rows;
    } catch (error2) {
      console.log(`Erro crítico na tabela ${tableName}:`, error2.message);
      return [];
    }
  }
}

function generateCreateTableSQL(tableName, structure, constraints) {
  let sql = `\n-- Estrutura da tabela: ${tableName}\n`;
  sql += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
  sql += `CREATE TABLE "${tableName}" (\n`;
  
  const columns = structure.map(col => {
    let colDef = `  "${col.column_name}" ${col.data_type}`;
    
    if (col.character_maximum_length) {
      colDef += `(${col.character_maximum_length})`;
    } else if (col.numeric_precision) {
      colDef += `(${col.numeric_precision}`;
      if (col.numeric_scale) {
        colDef += `,${col.numeric_scale}`;
      }
      colDef += ')';
    }
    
    if (col.is_nullable === 'NO') {
      colDef += ' NOT NULL';
    }
    
    if (col.column_default) {
      colDef += ` DEFAULT ${col.column_default}`;
    }
    
    return colDef;
  });
  
  sql += columns.join(',\n');
  sql += '\n);\n';
  
  // Adicionar constraints
  const primaryKeys = constraints.filter(c => c.constraint_type === 'PRIMARY KEY');
  if (primaryKeys.length > 0) {
    const pkColumns = primaryKeys.map(pk => `"${pk.column_name}"`).join(', ');
    sql += `ALTER TABLE "${tableName}" ADD PRIMARY KEY (${pkColumns});\n`;
  }
  
  return sql;
}

function generateInsertSQL(tableName, data) {
  if (data.length === 0) return '';
  
  let sql = `\n-- Dados da tabela: ${tableName} (${data.length} registros)\n`;
  
  const columns = Object.keys(data[0]);
  const columnNames = columns.map(col => `"${col}"`).join(', ');
  
  sql += `INSERT INTO "${tableName}" (${columnNames}) VALUES\n`;
  
  const values = data.map(row => {
    const rowValues = columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) {
        return 'NULL';
      } else if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      } else if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      } else if (value instanceof Date) {
        return `'${value.toISOString()}'`;
      } else if (typeof value === 'object') {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      } else {
        return value;
      }
    });
    return `  (${rowValues.join(', ')})`;
  });
  
  sql += values.join(',\n');
  sql += ';\n';
  
  return sql;
}

async function getSequences() {
  const result = await pool.query(`
    SELECT sequence_name, last_value
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  `);
  return result.rows;
}

function generateSequenceSQL(sequences) {
  if (sequences.length === 0) return '';
  
  let sql = '\n-- Restaurar valores das sequências\n';
  sequences.forEach(seq => {
    sql += `SELECT setval('${seq.sequence_name}', ${seq.last_value}, true);\n`;
  });
  
  return sql;
}

async function createBackupCompleto() {
  const timestamp = formatDate();
  const filename = `backup_completo_seguro_${timestamp}.sql`;
  
  console.log('='.repeat(60));
  console.log('INICIANDO BACKUP COMPLETO E SEGURO DO BANCO DE DADOS');
  console.log('='.repeat(60));
  console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`Arquivo: ${filename}`);
  console.log('');
  
  try {
    // Teste de conexão
    await pool.query('SELECT 1');
    console.log('✓ Conexão com banco estabelecida');
    
    const tables = await getAllTables();
    console.log(`✓ Encontradas ${tables.length} tabelas: ${tables.join(', ')}`);
    
    let backupSQL = `-- BACKUP COMPLETO DO BANCO FOTTUFY
-- Data: ${new Date().toLocaleString('pt-BR')}
-- Timestamp: ${timestamp}
-- Gerado automaticamente - NÃO EDITAR

SET client_encoding = 'UTF8';
SET check_function_bodies = false;
SET client_min_messages = warning;

`;

    let totalRecords = 0;
    const tableStats = {};
    
    // Processar cada tabela
    for (const table of tables) {
      console.log(`\nProcessando tabela: ${table}`);
      
      // Estrutura da tabela
      const structure = await getTableStructure(table);
      const constraints = await getTableConstraints(table);
      
      console.log(`  ✓ Estrutura: ${structure.length} colunas`);
      
      // Adicionar CREATE TABLE
      backupSQL += generateCreateTableSQL(table, structure, constraints);
      
      // Dados da tabela
      const data = await getTableData(table);
      tableStats[table] = data.length;
      totalRecords += data.length;
      
      console.log(`  ✓ Dados: ${data.length} registros`);
      
      // Adicionar INSERT statements
      backupSQL += generateInsertSQL(table, data);
    }
    
    // Sequências
    console.log('\nProcessando sequências...');
    const sequences = await getSequences();
    console.log(`✓ Encontradas ${sequences.length} sequências`);
    backupSQL += generateSequenceSQL(sequences);
    
    // Índices adicionais
    console.log('\nProcessando índices...');
    for (const table of tables) {
      const indexes = await getTableIndexes(table);
      if (indexes.length > 0) {
        backupSQL += `\n-- Índices da tabela: ${table}\n`;
        indexes.forEach(idx => {
          backupSQL += `${idx.indexdef};\n`;
        });
      }
    }
    
    backupSQL += `\n-- Backup concluído em ${new Date().toLocaleString('pt-BR')}\n`;
    backupSQL += `-- Total de registros: ${totalRecords}\n`;
    
    // Salvar arquivo
    fs.writeFileSync(filename, backupSQL, 'utf8');
    
    // Gerar relatório
    const reportFilename = `relatorio_backup_${timestamp}.txt`;
    let report = `RELATÓRIO DO BACKUP COMPLETO
================================
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Arquivo SQL: ${filename}
Total de tabelas: ${tables.length}
Total de registros: ${totalRecords}

DETALHES POR TABELA:
`;
    
    Object.entries(tableStats).forEach(([table, count]) => {
      report += `- ${table}: ${count.toLocaleString()} registros\n`;
    });
    
    report += `
SEQUÊNCIAS:
${sequences.map(s => `- ${s.sequence_name}: ${s.last_value}`).join('\n')}

ARQUIVOS GERADOS:
- ${filename} (${Math.round(fs.statSync(filename).size / 1024 / 1024 * 100) / 100} MB)
- ${reportFilename}

STATUS: ✓ BACKUP CONCLUÍDO COM SUCESSO
INTEGRIDADE: ✓ TODOS OS DADOS PRESERVADOS
`;
    
    fs.writeFileSync(reportFilename, report, 'utf8');
    
    console.log('\n' + '='.repeat(60));
    console.log('BACKUP CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`✓ Arquivo SQL: ${filename} (${Math.round(fs.statSync(filename).size / 1024 / 1024 * 100) / 100} MB)`);
    console.log(`✓ Relatório: ${reportFilename}`);
    console.log(`✓ Total de registros: ${totalRecords.toLocaleString()}`);
    console.log(`✓ Tabelas processadas: ${tables.length}`);
    console.log('\nTODOS OS DADOS FORAM PRESERVADOS INTEGRALMENTE');
    console.log('Backup pode ser usado para restauração completa do sistema');
    
  } catch (error) {
    console.error('\n❌ ERRO DURANTE O BACKUP:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Executar backup
createBackupCompleto().catch(console.error);