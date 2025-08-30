#!/usr/bin/env node
/**
 * BACKUP SETEMBRO 2025 - BANCO DE DADOS FOTTUFY
 * 
 * Backup completo e seguro do banco atual do Replit
 * APENAS LEITURA - não modifica nenhum dado
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Usar a mesma configuração do sistema atual
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function formatDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `${day}-${month}-${year}_${hour}-${minute}`;
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

async function getTableData(tableName) {
  try {
    const result = await pool.query(`SELECT * FROM "${tableName}"`);
    return result.rows;
  } catch (error) {
    console.log(`❌ Erro ao buscar dados da tabela ${tableName}:`, error.message);
    return [];
  }
}

async function getTableCount(tableName) {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    return 0;
  }
}

function generateInsertSQL(tableName, data) {
  if (!data || data.length === 0) {
    return `-- Tabela ${tableName} está vazia\n\n`;
  }

  let sql = `-- Dados da tabela: ${tableName}\n`;
  
  // Obter colunas da primeira linha
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
  sql += ';\n\n';
  
  return sql;
}

async function createBackupSetembro() {
  const timestamp = formatDate();
  const filename = `backup_setembro_${timestamp}.sql`;
  
  console.log('============================================================');
  console.log('BACKUP SETEMBRO 2025 - BANCO DE DADOS FOTTUFY');
  console.log('============================================================');
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`📁 Arquivo: ${filename}`);
  console.log('');

  let sql = '';
  sql += `-- ================================================================\n`;
  sql += `-- BACKUP SETEMBRO 2025 - BANCO DE DADOS FOTTUFY\n`;
  sql += `-- Data: ${new Date().toLocaleString('pt-BR')}\n`;
  sql += `-- Sistema: Replit PostgreSQL\n`;
  sql += `-- ================================================================\n\n`;

  try {
    // Testar conexão
    await pool.query('SELECT 1');
    console.log('✅ Conexão com banco de dados estabelecida');

    // Listar todas as tabelas
    const tables = await getAllTables();
    console.log(`📋 Encontradas ${tables.length} tabelas:`, tables.join(', '));
    console.log('');

    let totalRecords = 0;
    const tableStats = [];

    // Fazer backup de cada tabela
    for (const tableName of tables) {
      console.log(`🔄 Processando tabela: ${tableName}`);
      
      const count = await getTableCount(tableName);
      const data = await getTableData(tableName);
      
      tableStats.push({ table: tableName, records: count });
      totalRecords += count;
      
      sql += generateInsertSQL(tableName, data);
      
      console.log(`   ✅ ${count} registros salvos`);
    }

    // Adicionar resumo ao final do arquivo
    sql += `\n-- ================================================================\n`;
    sql += `-- RESUMO DO BACKUP\n`;
    sql += `-- ================================================================\n`;
    sql += `-- Total de tabelas: ${tables.length}\n`;
    sql += `-- Total de registros: ${totalRecords}\n`;
    sql += `-- Data/Hora: ${new Date().toLocaleString('pt-BR')}\n`;
    
    tableStats.forEach(stat => {
      sql += `-- ${stat.table}: ${stat.records} registros\n`;
    });
    
    sql += `-- ================================================================\n`;

    // Salvar arquivo
    fs.writeFileSync(filename, sql, 'utf8');
    
    console.log('');
    console.log('📊 RESUMO DO BACKUP:');
    console.log(`   📁 Arquivo: ${filename}`);
    console.log(`   📋 Tabelas: ${tables.length}`);
    console.log(`   📝 Registros: ${totalRecords.toLocaleString('pt-BR')}`);
    console.log(`   💾 Tamanho: ${(fs.statSync(filename).size / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
    
    tableStats.forEach(stat => {
      console.log(`   ${stat.table}: ${stat.records.toLocaleString('pt-BR')} registros`);
    });
    
    console.log('');
    console.log('✅ BACKUP SETEMBRO 2025 CONCLUÍDO COM SUCESSO!');
    console.log('============================================================');

  } catch (error) {
    console.error('❌ ERRO DURANTE O BACKUP:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar backup
createBackupSetembro().catch(error => {
  console.error('Falha no backup:', error);
  process.exit(1);
});