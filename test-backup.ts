#!/usr/bin/env node

/**
 * Script de teste do sistema de backup
 * Testa a conexão com Google Drive e executa um backup de demonstração
 */

import { createBackupSystem, DatabaseBackupSystem } from './server/backup/database-backup';
import { initializeBackupScheduler } from './server/backup/backup-scheduler';

async function testBackupSystem() {
  console.log('\n🧪 TESTE DO SISTEMA DE BACKUP');
  console.log('='.repeat(50));

  try {
    // 1. Verificar variáveis de ambiente
    console.log('\n📋 Verificando configuração...');
    
    const requiredVars = [
      'GOOGLE_DRIVE_CLIENT_ID',
      'GOOGLE_DRIVE_CLIENT_SECRET',
      'GOOGLE_DRIVE_REFRESH_TOKEN',
      'DATABASE_URL'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`❌ Variáveis de ambiente não encontradas: ${missingVars.join(', ')}`);
      console.error('\n🔧 Execute primeiro: npx tsx setup-google-drive-backup.ts');
      process.exit(1);
    }

    console.log('✅ Todas as variáveis de ambiente configuradas');

    // 2. Inicializar sistema de backup
    console.log('\n🔄 Inicializando sistema de backup...');
    const backupSystem = createBackupSystem();
    console.log('✅ Sistema de backup inicializado');

    // 3. Testar backup manual
    console.log('\n🚀 Executando backup de teste...');
    const result = await backupSystem.performBackup();

    if (result.success) {
      console.log(`\n✅ TESTE CONCLUÍDO COM SUCESSO!`);
      console.log(`📁 Arquivo no Google Drive: ID ${result.driveFileId}`);
      console.log(`📝 ${result.message}`);
    } else {
      console.error(`\n❌ TESTE FALHOU:`);
      console.error(`📝 ${result.message}`);
      process.exit(1);
    }

    // 4. Testar agendador (sem iniciar)
    console.log('\n📅 Testando sistema de agendamento...');
    const scheduler = initializeBackupScheduler();
    const status = scheduler.getStatus();
    
    console.log(`✅ Agendamento configurado:`);
    console.log(`   - Horário: ${status.schedule} (${status.timezone})`);
    console.log(`   - Status: ${status.isRunning ? 'Ativo' : 'Inativo'}`);
    console.log(`   - Próxima execução: ${status.nextRun}`);

    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('\n💡 Para ativar backups automáticos no servidor principal:');
    console.log('   - O sistema já está integrado e será iniciado automaticamente');
    console.log('   - Backups diários às 3:00 AM (configurável)');
    console.log('   - Arquivos salvos na pasta "Fottufy_Backups" no seu Google Drive');

  } catch (error: any) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    
    if (error.message.includes('credentials')) {
      console.error('\n🔧 Possível solução: Execute setup-google-drive-backup.ts novamente');
    }
    
    process.exit(1);
  }
}

// Executar teste
testBackupSystem();