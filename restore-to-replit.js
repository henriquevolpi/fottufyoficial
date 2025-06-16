#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do banco Replit usando variáveis de ambiente
const REPLIT_CONNECTION = {
  connectionString: process.env.DATABASE_URL
};

console.log('🚀 RESTAURANDO DUMP NO POSTGRESQL DO REPLIT');
console.log('===========================================');

async function connectToReplit() {
  console.log('🏠 Conectando ao PostgreSQL do Replit...');
  const replitPool = new Pool(REPLIT_CONNECTION);
  
  try {
    await replitPool.query('SELECT 1');
    console.log('✅ Conexão estabelecida com sucesso');
    return replitPool;
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    throw error;
  }
}

async function restoreFromDump() {
  let replitPool;
  
  try {
    replitPool = await connectToReplit();
    
    // Ler o arquivo de dump
    const dumpPath = path.join(__dirname, 'neon-complete-dump.sql');
    
    if (!fs.existsSync(dumpPath)) {
      throw new Error(`Arquivo de dump não encontrado: ${dumpPath}`);
    }
    
    console.log('📖 Lendo arquivo de dump...');
    const sqlContent = fs.readFileSync(dumpPath, 'utf8');
    
    console.log('🧹 Limpando banco atual...');
    
    // Obter lista de tabelas existentes
    const tablesResult = await replitPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    // Dropar tabelas existentes
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      console.log(`  🗑️ Removendo tabela: ${tableName}`);
      await replitPool.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
    }
    
    // Dropar sequences existentes
    const sequencesResult = await replitPool.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    for (const row of sequencesResult.rows) {
      const sequenceName = row.sequence_name;
      console.log(`  🗑️ Removendo sequence: ${sequenceName}`);
      await replitPool.query(`DROP SEQUENCE IF EXISTS ${sequenceName} CASCADE`);
    }
    
    console.log('🔄 Executando dump SQL...');
    
    // Dividir o SQL em comandos individuais
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Executando ${sqlCommands.length} comandos SQL...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      if (command.length === 0) continue;
      
      try {
        await replitPool.query(command);
        successCount++;
        
        if (i % 100 === 0) {
          console.log(`  ⏳ Progresso: ${i}/${sqlCommands.length} comandos`);
        }
        
      } catch (error) {
        errorCount++;
        console.log(`  ⚠️ Erro no comando ${i}: ${error.message}`);
        
        // Para alguns erros específicos, continuar
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist')) {
          continue;
        }
        
        // Para erros críticos, parar
        if (errorCount > 10) {
          throw new Error(`Muitos erros durante a restauração (${errorCount})`);
        }
      }
    }
    
    console.log('\n📊 Verificando dados restaurados...');
    
    // Verificar tabelas criadas
    const newTablesResult = await replitPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`✅ ${newTablesResult.rows.length} tabelas criadas:`);
    
    let totalRecords = 0;
    
    for (const row of newTablesResult.rows) {
      const tableName = row.table_name;
      
      try {
        const countResult = await replitPool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(countResult.rows[0].count);
        totalRecords += count;
        
        console.log(`  📦 ${tableName}: ${count.toLocaleString()} registros`);
        
      } catch (error) {
        console.log(`  ❌ Erro ao contar ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 RESTAURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('====================================');
    console.log(`✅ Comandos executados: ${successCount}`);
    console.log(`⚠️ Erros encontrados: ${errorCount}`);
    console.log(`📦 Tabelas restauradas: ${newTablesResult.rows.length}`);
    console.log(`📊 Total de registros: ${totalRecords.toLocaleString()}`);
    console.log('');
    console.log('🎯 PRÓXIMO PASSO:');
    console.log('Atualizar a configuração do projeto para usar o banco local do Replit');
    
    return {
      tablesRestored: newTablesResult.rows.length,
      totalRecords,
      successCommands: successCount,
      errorCount
    };
    
  } catch (error) {
    console.error('\n❌ ERRO NA RESTAURAÇÃO:', error.message);
    throw error;
  } finally {
    if (replitPool) await replitPool.end();
  }
}

// Executar restauração
if (import.meta.url === `file://${process.argv[1]}`) {
  restoreFromDump()
    .then(() => {
      console.log('✅ Processo de restauração finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Processo falhou:', error.message);
      process.exit(1);
    });
}

export { restoreFromDump };