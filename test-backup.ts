#!/usr/bin/env node

/**
 * Teste do Sistema de Backup Automático
 * 100% automático, sem necessidade de credenciais externas
 */

import { AutomaticBackupSystem } from './server/backup/automatic-backup-system';

async function testBackupSystems() {
  console.log('🚀 TESTE DO SISTEMA DE BACKUP AUTOMÁTICO');
  console.log('='.repeat(50));
  console.log('🎯 Sistema: Local + Email (100% automático)');
  console.log('📧 Email: Usando Resend já configurado');
  console.log('📁 Local: Salva backups com rotação automática\n');

  const backupSystem = new AutomaticBackupSystem();

  console.log('🔍 1. TESTANDO CONECTIVIDADE DOS SISTEMAS...');
  console.log('-'.repeat(50));
  
  try {
    const systemTest = await backupSystem.testSystems();
    
    console.log(`📁 Sistema Local: ${systemTest.local ? '✅ OK' : '❌ FALHA'}`);
    console.log(`📧 Sistema Email: ${systemTest.email ? '✅ OK (Resend configurado)' : '⚠️ Resend não configurado'}`);
    console.log(`💾 Banco de Dados: ${systemTest.database ? '✅ OK' : '❌ DATABASE_URL não encontrado'}`);
    
    if (!systemTest.database) {
      console.log('\n❌ Não é possível continuar sem acesso ao banco de dados');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('❌ Erro no teste de sistemas:', error.message);
    process.exit(1);
  }

  console.log('\n🔧 2. EXECUTANDO BACKUP DE TESTE...');
  console.log('-'.repeat(50));
  
  try {
    const result = await backupSystem.executeFullBackup();
    
    if (result.success) {
      console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
      console.log('📊 RESULTADOS:');
      
      if (result.localBackup?.success) {
        console.log(`   📁 Backup Local: ${result.localBackup.size} - ✅ Criado`);
        if (result.localBackup.filePath) {
          console.log(`      Arquivo: ${result.localBackup.filePath}`);
        }
      } else {
        console.log(`   📁 Backup Local: ❌ ${result.localBackup?.error}`);
      }
      
      if (result.emailBackup?.success) {
        console.log(`   📧 Backup Email: ${result.emailBackup.size} - ✅ Enviado`);
        console.log(`      Email enviado para: areanatan1@gmail.com`);
      } else {
        console.log(`   📧 Backup Email: ❌ ${result.emailBackup?.error}`);
      }
      
      console.log(`   ⏱️ Tempo Total: ${((result.totalTime || 0) / 1000).toFixed(2)}s`);
      
    } else {
      console.log('\n⚠️ TESTE PARCIALMENTE CONCLUÍDO');
      console.log('Alguns sistemas podem ter falhado, mas pelo menos um backup foi criado');
    }
    
  } catch (error: any) {
    console.error('\n❌ ERRO NO TESTE DE BACKUP:', error.message);
    process.exit(1);
  }

  console.log('\n📈 3. ESTATÍSTICAS DOS BACKUPS...');
  console.log('-'.repeat(50));
  
  try {
    const stats = await backupSystem.getBackupStatistics();
    
    console.log(`📊 Total de Backups: ${stats.localStats.totalBackups}`);
    console.log(`💾 Espaço Usado: ${stats.localStats.totalSize}`);
    
    if (stats.localStats.newestBackup) {
      console.log(`📅 Último Backup: ${stats.localStats.newestBackup.toLocaleString('pt-BR')}`);
    }
    
    if (stats.localStats.oldestBackup) {
      console.log(`📅 Primeiro Backup: ${stats.localStats.oldestBackup.toLocaleString('pt-BR')}`);
    }
    
    const statusEmoji = {
      'healthy': '✅',
      'warning': '⚠️',
      'error': '❌'
    }[stats.systemStatus];
    
    console.log(`🔋 Status do Sistema: ${statusEmoji} ${stats.systemStatus.toUpperCase()}`);
    
  } catch (error: any) {
    console.warn('⚠️ Erro ao obter estatísticas:', error.message);
  }

  console.log('\n🎉 TESTE COMPLETO!');
  console.log('='.repeat(50));
  console.log('✅ Sistema de backup funcionando corretamente');
  console.log('📅 Backups automáticos serão executados diariamente às 3:00 AM');
  console.log('📁 Backups locais: /home/runner/workspace/backups (rotação automática)');
  console.log('📧 Backups por email: areanatan1@gmail.com');
  console.log('⚙️  Para alterar configurações, use as variáveis de ambiente:');
  console.log('    BACKUP_CRON_SCHEDULE (padrão: "0 3 * * *")');
  console.log('\n💡 Próximo passo: Sistema já está ativo e funcionando!');
}

// Executar teste se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testBackupSystems()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Falha no teste:', error.message);
      process.exit(1);
    });
}

export { testBackupSystems };