#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações das databases
const NEON_CONNECTION = {
  connectionString: 'postgresql://neondb_owner:npg_wqC0LP7yRHlT@ep-small-resonance-a45diqst-pooler.us-east-1.aws.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

const REPLIT_CONNECTION = {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: false
};

console.log('🚀 INICIANDO BACKUP E MIGRAÇÃO COMPLETA');
console.log('=====================================');
console.log('');
console.log('ORIGEM: Neon Database (Produção)');
console.log('DESTINO: Replit PostgreSQL (Local)');
console.log('');

async function connectToNeon() {
  console.log('📡 Conectando ao banco Neon...');
  const neonPool = new Pool(NEON_CONNECTION);
  
  try {
    await neonPool.query('SELECT 1');
    console.log('✅ Conexão com Neon estabelecida');
    return neonPool;
  } catch (error) {
    console.error('❌ Erro ao conectar com Neon:', error.message);
    throw error;
  }
}

async function connectToReplit() {
  console.log('🏠 Conectando ao banco Replit...');
  const replitPool = new Pool(REPLIT_CONNECTION);
  
  try {
    await replitPool.query('SELECT 1');
    console.log('✅ Conexão com Replit estabelecida');
    return replitPool;
  } catch (error) {
    console.error('❌ Erro ao conectar com Replit:', error.message);
    throw error;
  }
}

async function getTableStructure(pool, tableName) {
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

async function getTableData(pool, tableName) {
  const query = `SELECT * FROM ${tableName}`;
  const result = await pool.query(query);
  return result.rows;
}

function generateCreateTableSQL(tableName, structure) {
  let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
  
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
  sql += '\n);';
  
  return sql;
}

function generateInsertSQL(tableName, data) {
  if (data.length === 0) return '';
  
  const columns = Object.keys(data[0]);
  const columnNames = columns.join(', ');
  
  const values = data.map(row => {
    const rowValues = columns.map(col => {
      const value = row[col];
      if (value === null) return 'NULL';
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      return value;
    });
    return `(${rowValues.join(', ')})`;
  });
  
  return `INSERT INTO ${tableName} (${columnNames}) VALUES\n${values.join(',\n')};`;
}

async function createSequences(replitPool, neonPool) {
  console.log('🔢 Criando sequences...');
  
  const sequenceQuery = `
    SELECT sequence_name, last_value 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public';
  `;
  
  try {
    const result = await neonPool.query(sequenceQuery);
    
    for (const seq of result.rows) {
      const createSeqSQL = `CREATE SEQUENCE IF NOT EXISTS ${seq.sequence_name};`;
      const setValSQL = `SELECT setval('${seq.sequence_name}', ${seq.last_value});`;
      
      await replitPool.query(createSeqSQL);
      await replitPool.query(setValSQL);
      console.log(`  ✅ Sequence ${seq.sequence_name} criada`);
    }
  } catch (error) {
    console.log('⚠️  Erro ao criar sequences (continuando):', error.message);
  }
}

async function performBackupAndMigration() {
  let neonPool, replitPool;
  
  try {
    // Conectar aos bancos
    neonPool = await connectToNeon();
    replitPool = await connectToReplit();
    
    // Listar todas as tabelas do Neon
    console.log('\n📋 Listando tabelas do Neon...');
    const tables = await getAllTables(neonPool);
    console.log(`✅ Encontradas ${tables.length} tabelas:`, tables.join(', '));
    
    // Criar diretório de backup
    const backupDir = path.join(__dirname, 'backup-neon-complete');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    let totalRecords = 0;
    const migrationReport = {
      timestamp: new Date().toISOString(),
      source: 'Neon Database',
      destination: 'Replit PostgreSQL',
      tables: {},
      totalRecords: 0,
      status: 'in_progress'
    };
    
    // Criar sequences primeiro
    await createSequences(replitPool, neonPool);
    
    // Processar cada tabela
    for (const tableName of tables) {
      console.log(`\n📦 Processando tabela: ${tableName}`);
      
      try {
        // 1. Obter estrutura da tabela
        const structure = await getTableStructure(neonPool, tableName);
        
        // 2. Obter dados da tabela
        const data = await getTableData(neonPool, tableName);
        totalRecords += data.length;
        
        console.log(`  📊 ${data.length} registros encontrados`);
        
        // 3. Gerar SQL de criação
        const createSQL = generateCreateTableSQL(tableName, structure);
        
        // 4. Criar tabela no Replit
        await replitPool.query(createSQL);
        console.log(`  ✅ Tabela criada no Replit`);
        
        // 5. Inserir dados se existirem
        if (data.length > 0) {
          // Limpar tabela antes de inserir
          await replitPool.query(`DELETE FROM ${tableName}`);
          
          const insertSQL = generateInsertSQL(tableName, data);
          await replitPool.query(insertSQL);
          console.log(`  ✅ ${data.length} registros inseridos`);
        }
        
        // 6. Salvar backup local
        const backupData = {
          tableName,
          structure,
          data,
          recordCount: data.length,
          timestamp: new Date().toISOString()
        };
        
        const backupFile = path.join(backupDir, `${tableName}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        
        migrationReport.tables[tableName] = {
          recordCount: data.length,
          status: 'completed',
          backupFile: backupFile
        };
        
      } catch (error) {
        console.error(`  ❌ Erro ao processar ${tableName}:`, error.message);
        migrationReport.tables[tableName] = {
          recordCount: 0,
          status: 'failed',
          error: error.message
        };
      }
    }
    
    // Finalizar relatório
    migrationReport.totalRecords = totalRecords;
    migrationReport.status = 'completed';
    
    // Salvar relatório
    const reportFile = path.join(backupDir, 'migration-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(migrationReport, null, 2));
    
    console.log('\n🎉 MIGRAÇÃO COMPLETA!');
    console.log('===================');
    console.log(`✅ ${tables.length} tabelas migradas`);
    console.log(`✅ ${totalRecords.toLocaleString()} registros transferidos`);
    console.log(`📁 Backup salvo em: ${backupDir}`);
    console.log('');
    console.log('🔐 SEU BANCO NEON PERMANECE INTACTO');
    console.log('🏠 TODAS AS OPERAÇÕES AGORA SERÃO NO REPLIT');
    
    return migrationReport;
    
  } catch (error) {
    console.error('\n❌ ERRO NA MIGRAÇÃO:', error.message);
    throw error;
  } finally {
    // Fechar conexões
    if (neonPool) await neonPool.end();
    if (replitPool) await replitPool.end();
  }
}

// Executar migração
if (import.meta.url === `file://${process.argv[1]}`) {
  performBackupAndMigration()
    .then(() => {
      console.log('\n✅ Processo finalizado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Processo falhou:', error.message);
      process.exit(1);
    });
}

export { performBackupAndMigration };