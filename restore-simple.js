#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPLIT_CONNECTION = {
  connectionString: process.env.DATABASE_URL
};

console.log('🚀 RESTAURAÇÃO SIMPLIFICADA DO BANCO');
console.log('===================================');

async function connectToReplit() {
  const replitPool = new Pool(REPLIT_CONNECTION);
  await replitPool.query('SELECT 1');
  console.log('✅ Conectado ao PostgreSQL do Replit');
  return replitPool;
}

async function restoreSimple() {
  let replitPool;
  
  try {
    replitPool = await connectToReplit();
    
    console.log('🧹 Limpando banco...');
    await replitPool.query('DROP SCHEMA public CASCADE');
    await replitPool.query('CREATE SCHEMA public');
    await replitPool.query('GRANT ALL ON SCHEMA public TO postgres');
    await replitPool.query('GRANT ALL ON SCHEMA public TO public');
    
    console.log('📖 Lendo dump...');
    const dumpPath = path.join(__dirname, 'neon-complete-dump.sql');
    const sqlContent = fs.readFileSync(dumpPath, 'utf8');
    
    // Dividir em comandos e filtrar
    const lines = sqlContent.split('\n');
    const commands = [];
    let currentCommand = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Pular comentários e linhas vazias
      if (trimmed.startsWith('--') || trimmed === '') {
        continue;
      }
      
      currentCommand += line + '\n';
      
      // Se termina com ';', é fim do comando
      if (trimmed.endsWith(';')) {
        commands.push(currentCommand.trim());
        currentCommand = '';
      }
    }
    
    console.log(`📝 Executando ${commands.length} comandos...`);
    
    let completed = 0;
    
    for (const command of commands) {
      if (command.length === 0) continue;
      
      try {
        await replitPool.query(command);
        completed++;
        
        if (completed % 50 === 0) {
          console.log(`  ⏳ ${completed}/${commands.length} concluídos`);
        }
        
      } catch (error) {
        // Ignorar erros de sequência não existente
        if (error.message.includes('does not exist') || 
            error.message.includes('already exists')) {
          continue;
        }
        console.log(`  ⚠️ Erro: ${error.message.substring(0, 100)}`);
      }
    }
    
    console.log('\n📊 Verificando resultado...');
    
    const tablesResult = await replitPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`✅ ${tablesResult.rows.length} tabelas restauradas:`);
    
    let totalRecords = 0;
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      const countResult = await replitPool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = parseInt(countResult.rows[0].count);
      totalRecords += count;
      console.log(`  📦 ${tableName}: ${count.toLocaleString()} registros`);
    }
    
    console.log('\n🎉 RESTAURAÇÃO CONCLUÍDA!');
    console.log(`📊 Total: ${totalRecords.toLocaleString()} registros`);
    console.log(`📦 Tabelas: ${tablesResult.rows.length}`);
    
    return { tablesCount: tablesResult.rows.length, totalRecords };
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    if (replitPool) await replitPool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  restoreSimple()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { restoreSimple };