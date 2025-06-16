#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração da conexão para o banco Render
const RENDER_DATABASE_URL = "postgresql://fottufy_user:ls7dGvLeojlTv0YpxclVRMYWhpNfwLKy@dpg-d17j2fgdl3ps73ahtrs0-a.oregon-postgres.render.com/fottufy";

const pool = new Pool({
  connectionString: RENDER_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Função para listar arquivos de backup disponíveis
function listBackupFiles() {
  const backupDir = path.join(__dirname, 'backup');
  
  if (!fs.existsSync(backupDir)) {
    console.log('❌ Diretório /backup não encontrado');
    return { sqlFiles: [], jsonFiles: [] };
  }
  
  const files = fs.readdirSync(backupDir);
  const sqlFiles = files.filter(f => f.endsWith('.sql') && f.startsWith('backup_'));
  const jsonFiles = files.filter(f => f.endsWith('.json') && f.startsWith('backup_'));
  
  return { sqlFiles, jsonFiles };
}

// Função para restaurar usando arquivos SQL
async function restoreFromSQL(sqlFiles) {
  console.log('🔄 Restaurando dados usando arquivos SQL...\n');
  
  const results = [];
  
  for (const sqlFile of sqlFiles) {
    const tableName = sqlFile.replace('backup_', '').replace('.sql', '');
    console.log(`📦 Restaurando tabela: ${tableName}`);
    
    try {
      const sqlContent = fs.readFileSync(path.join(__dirname, 'backup', sqlFile), 'utf8');
      
      if (sqlContent.includes('-- sem dados')) {
        console.log(`  ⚠️  Tabela ${tableName}: sem dados para restaurar`);
        results.push({ table: tableName, success: true, records: 0 });
        continue;
      }
      
      const client = await pool.connect();
      
      try {
        // Executar o SQL
        await client.query(sqlContent);
        
        // Contar registros inseridos
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const recordCount = parseInt(countResult.rows[0].count);
        
        console.log(`  ✓ ${recordCount} registros restaurados`);
        results.push({ table: tableName, success: true, records: recordCount });
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error(`  ❌ Erro ao restaurar ${tableName}:`, error.message);
      results.push({ table: tableName, success: false, error: error.message });
    }
    
    console.log('');
  }
  
  return results;
}

// Função para restaurar usando arquivos JSON
async function restoreFromJSON(jsonFiles) {
  console.log('🔄 Restaurando dados usando arquivos JSON...\n');
  
  const results = [];
  
  for (const jsonFile of jsonFiles) {
    const tableName = jsonFile.replace('backup_', '').replace('.json', '');
    console.log(`📦 Restaurando tabela: ${tableName}`);
    
    try {
      const jsonContent = fs.readFileSync(path.join(__dirname, 'backup', jsonFile), 'utf8');
      const backupData = JSON.parse(jsonContent);
      
      if (!backupData.data || backupData.data.length === 0) {
        console.log(`  ⚠️  Tabela ${tableName}: sem dados para restaurar`);
        results.push({ table: tableName, success: true, records: 0 });
        continue;
      }
      
      const client = await pool.connect();
      
      try {
        const data = backupData.data;
        const columns = Object.keys(data[0]);
        
        // Preparar statement para inserção
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const insertSQL = `INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')}) VALUES (${placeholders})`;
        
        // Inserir dados em lotes
        const batchSize = 100;
        let totalInserted = 0;
        
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = columns.map(col => row[col]);
            await client.query(insertSQL, values);
            totalInserted++;
          }
        }
        
        console.log(`  ✓ ${totalInserted} registros restaurados`);
        results.push({ table: tableName, success: true, records: totalInserted });
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error(`  ❌ Erro ao restaurar ${tableName}:`, error.message);
      results.push({ table: tableName, success: false, error: error.message });
    }
    
    console.log('');
  }
  
  return results;
}

// Função principal de restauração
async function performRestore(useSQL = true) {
  console.log('🔄 Iniciando restauração do banco de dados...\n');
  
  try {
    // Verificar conexão
    const client = await pool.connect();
    const dbResult = await client.query('SELECT current_database(), current_user');
    console.log(`✓ Conectado ao banco: ${dbResult.rows[0].current_database}`);
    console.log(`✓ Usuário: ${dbResult.rows[0].current_user}`);
    client.release();
    
    // Listar arquivos de backup
    const { sqlFiles, jsonFiles } = listBackupFiles();
    
    if (useSQL && sqlFiles.length > 0) {
      console.log(`\n📋 Encontrados ${sqlFiles.length} arquivos SQL de backup`);
      console.log(`Tabelas: ${sqlFiles.map(f => f.replace('backup_', '').replace('.sql', '')).join(', ')}\n`);
      
      const results = await restoreFromSQL(sqlFiles);
      
      // Resumo
      const successful = results.filter(r => r.success).length;
      const totalRecords = results.reduce((sum, r) => sum + (r.records || 0), 0);
      
      console.log('📊 RESUMO DA RESTAURAÇÃO:');
      console.log(`✓ Tabelas processadas: ${results.length}`);
      console.log(`✓ Restaurações bem-sucedidas: ${successful}`);
      console.log(`✓ Total de registros restaurados: ${totalRecords.toLocaleString()}`);
      
      if (successful < results.length) {
        console.log(`❌ Falhas: ${results.length - successful}`);
        const failed = results.filter(r => !r.success);
        failed.forEach(f => console.log(`  - ${f.table}: ${f.error}`));
      }
      
    } else if (jsonFiles.length > 0) {
      console.log(`\n📋 Encontrados ${jsonFiles.length} arquivos JSON de backup`);
      console.log(`Tabelas: ${jsonFiles.map(f => f.replace('backup_', '').replace('.json', '')).join(', ')}\n`);
      
      const results = await restoreFromJSON(jsonFiles);
      
      // Resumo igual ao SQL
      const successful = results.filter(r => r.success).length;
      const totalRecords = results.reduce((sum, r) => sum + (r.records || 0), 0);
      
      console.log('📊 RESUMO DA RESTAURAÇÃO:');
      console.log(`✓ Tabelas processadas: ${results.length}`);
      console.log(`✓ Restaurações bem-sucedidas: ${successful}`);
      console.log(`✓ Total de registros restaurados: ${totalRecords.toLocaleString()}`);
      
    } else {
      console.log('❌ Nenhum arquivo de backup encontrado!');
      console.log('Execute primeiro o backup-script.js para gerar os arquivos de backup.');
      return;
    }
    
    console.log('\n🎉 Restauração concluída!');
    
  } catch (error) {
    console.error('💥 Erro crítico durante a restauração:', error);
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

// Executar restauração
if (import.meta.url === `file://${process.argv[1]}`) {
  const useSQL = process.argv.includes('--sql') || !process.argv.includes('--json');
  
  performRestore(useSQL)
    .then(() => cleanup())
    .then(() => {
      console.log('✅ Script de restauração finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      cleanup().finally(() => process.exit(1));
    });
}

export { performRestore, cleanup };