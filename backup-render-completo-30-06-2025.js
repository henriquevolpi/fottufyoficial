#!/usr/bin/env node

/**
 * BACKUP COMPLETO DO BANCO RENDER - 30/06/2025
 * 
 * Este script faz backup completo do banco de dados do Render
 * sem modificar nenhum dado - apenas leitura
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Configuração da conexão com o banco Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = './backup_render';
const backupFile = `${backupDir}/backup_render_completo_${timestamp}.sql`;

// Criar diretório de backup
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function getAllTables() {
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

async function getTableStructure(tableName) {
  const query = `
    SELECT 
      column_name, 
      data_type, 
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = $1 
    AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

async function getTableConstraints(tableName) {
  const query = `
    SELECT 
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.table_name = $1 AND tc.table_schema = 'public';
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

async function getTableData(tableName) {
  console.log(`📊 Fazendo backup da tabela: ${tableName}`);
  
  // Primeiro, contar registros
  const countQuery = `SELECT COUNT(*) as total FROM "${tableName}"`;
  const countResult = await pool.query(countQuery);
  const totalRows = parseInt(countResult.rows[0].total);
  
  console.log(`   - Total de registros: ${totalRows}`);
  
  if (totalRows === 0) {
    return [];
  }
  
  // Buscar todos os dados
  const dataQuery = `SELECT * FROM "${tableName}" ORDER BY 1`;
  const result = await pool.query(dataQuery);
  
  return result.rows;
}

function generateCreateTableSQL(tableName, structure, constraints) {
  let sql = `\n-- Estrutura da tabela ${tableName}\n`;
  sql += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
  sql += `CREATE TABLE "${tableName}" (\n`;
  
  const columns = structure.map(col => {
    let colDef = `  "${col.column_name}" ${col.data_type}`;
    
    if (col.character_maximum_length) {
      colDef += `(${col.character_maximum_length})`;
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
  
  // Adicionar constraints
  const primaryKeys = constraints.filter(c => c.constraint_type === 'PRIMARY KEY');
  if (primaryKeys.length > 0) {
    const pkColumns = primaryKeys.map(pk => `"${pk.column_name}"`).join(', ');
    sql += `,\n  PRIMARY KEY (${pkColumns})`;
  }
  
  sql += '\n);\n';
  
  return sql;
}

function generateInsertSQL(tableName, data) {
  if (!data || data.length === 0) {
    return `\n-- Tabela ${tableName} está vazia\n`;
  }
  
  let sql = `\n-- Dados da tabela ${tableName}\n`;
  
  const columns = Object.keys(data[0]);
  const columnNames = columns.map(col => `"${col}"`).join(', ');
  
  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col];
      if (value === null) return 'NULL';
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }
      if (typeof value === 'boolean') return value.toString();
      if (value instanceof Date) {
        return `'${value.toISOString()}'`;
      }
      return value;
    }).join(', ');
    
    sql += `INSERT INTO "${tableName}" (${columnNames}) VALUES (${values});\n`;
  }
  
  return sql;
}

async function createCompleteBackup() {
  console.log('🔄 INICIANDO BACKUP COMPLETO DO BANCO RENDER');
  console.log(`📁 Arquivo de backup: ${backupFile}`);
  
  let backupContent = '';
  backupContent += `-- BACKUP COMPLETO DO BANCO RENDER\n`;
  backupContent += `-- Data: ${new Date().toISOString()}\n`;
  backupContent += `-- Gerado automaticamente\n\n`;
  backupContent += `SET statement_timeout = 0;\n`;
  backupContent += `SET lock_timeout = 0;\n`;
  backupContent += `SET client_encoding = 'UTF8';\n`;
  backupContent += `SET standard_conforming_strings = on;\n`;
  backupContent += `SET check_function_bodies = false;\n`;
  backupContent += `SET xmloption = content;\n`;
  backupContent += `SET client_min_messages = warning;\n\n`;
  
  try {
    // Listar todas as tabelas
    const tables = await getAllTables();
    console.log(`📋 Encontradas ${tables.length} tabelas: ${tables.join(', ')}`);
    
    let totalRecords = 0;
    
    // Para cada tabela, fazer backup da estrutura e dados
    for (const tableName of tables) {
      console.log(`\n🔧 Processando tabela: ${tableName}`);
      
      // Estrutura da tabela
      const structure = await getTableStructure(tableName);
      const constraints = await getTableConstraints(tableName);
      
      backupContent += generateCreateTableSQL(tableName, structure, constraints);
      
      // Dados da tabela
      const data = await getTableData(tableName);
      totalRecords += data.length;
      
      backupContent += generateInsertSQL(tableName, data);
    }
    
    console.log(`\n📊 Total de registros salvos: ${totalRecords}`);
    
    // Salvar o arquivo
    fs.writeFileSync(backupFile, backupContent, 'utf8');
    
    // Criar também um resumo
    const summaryFile = `${backupDir}/resumo_backup_${timestamp}.txt`;
    const summary = `RESUMO DO BACKUP - ${new Date().toISOString()}

Banco de origem: Render PostgreSQL
Total de tabelas: ${tables.length}
Total de registros: ${totalRecords}
Arquivo gerado: ${backupFile}

Tabelas incluídas:
${tables.map(t => `- ${t}`).join('\n')}

Status: BACKUP CONCLUÍDO COM SUCESSO
Banco permaneceu intacto durante o processo.
`;
    
    fs.writeFileSync(summaryFile, summary, 'utf8');
    
    console.log('\n✅ BACKUP CONCLUÍDO COM SUCESSO!');
    console.log(`📁 Arquivo principal: ${backupFile}`);
    console.log(`📋 Resumo: ${summaryFile}`);
    console.log(`💾 Tamanho do backup: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
    console.log('\n🔒 BANCO DO RENDER PERMANECEU COMPLETAMENTE INTACTO');
    
  } catch (error) {
    console.error('❌ Erro durante o backup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar o backup
createCompleteBackup()
  .then(() => {
    console.log('\n🎯 Processo finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha no backup:', error);
    process.exit(1);
  });