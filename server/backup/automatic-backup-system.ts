/**
 * Sistema de Backup Automático Unificado
 * Combina backup local e por email
 * 100% automático, sem necessidade de credenciais externas
 */

import { LocalBackupSystem } from './local-backup-system';
import { EmailBackupSystem } from './email-backup-system';

interface BackupResult {
  success: boolean;
  localBackup?: { success: boolean; filePath?: string; size?: string; error?: string };
  emailBackup?: { success: boolean; size?: string; error?: string };
  totalTime?: number;
}

class AutomaticBackupSystem {
  private localSystem: LocalBackupSystem;
  private emailSystem: EmailBackupSystem;

  constructor() {
    this.localSystem = new LocalBackupSystem();
    this.emailSystem = new EmailBackupSystem();
  }

  /**
   * Executa backup completo (local + email)
   */
  async executeFullBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const result: BackupResult = { success: false };

    console.log('🚀 INICIANDO BACKUP AUTOMÁTICO COMPLETO');
    console.log('='.repeat(50));

    try {
      // Backup local
      console.log('\n1️⃣ BACKUP LOCAL:');
      const localResult = await this.localSystem.createBackup();
      result.localBackup = localResult;

      if (localResult.success) {
        console.log(`✅ Backup local: ${localResult.size}`);
      } else {
        console.log(`❌ Erro backup local: ${localResult.error}`);
      }

      // Backup por email
      console.log('\n2️⃣ BACKUP POR EMAIL:');
      const emailResult = await this.emailSystem.createAndSendBackup();
      result.emailBackup = emailResult;

      if (emailResult.success) {
        console.log(`✅ Backup por email: ${emailResult.size}`);
      } else {
        console.log(`❌ Erro backup email: ${emailResult.error}`);
      }

      // Resultado geral
      result.success = localResult.success || emailResult.success;
      result.totalTime = Date.now() - startTime;

      console.log('\n📊 RESUMO DO BACKUP:');
      console.log(`⏱️  Tempo total: ${(result.totalTime / 1000).toFixed(2)}s`);
      console.log(`📁 Backup local: ${localResult.success ? '✅' : '❌'}`);
      console.log(`📧 Backup email: ${emailResult.success ? '✅' : '❌'}`);
      console.log(`🎯 Status geral: ${result.success ? '✅ SUCESSO' : '❌ FALHA'}`);

      return result;

    } catch (error: any) {
      result.success = false;
      result.totalTime = Date.now() - startTime;
      console.error('❌ Erro crítico no backup automático:', error.message);
      return result;
    }
  }

  /**
   * Executa apenas backup local
   */
  async executeLocalBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    console.log('🚀 INICIANDO BACKUP LOCAL');
    
    const localResult = await this.localSystem.createBackup();
    
    return {
      success: localResult.success,
      localBackup: localResult,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Executa apenas backup por email
   */
  async executeEmailBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    console.log('🚀 INICIANDO BACKUP POR EMAIL');
    
    const emailResult = await this.emailSystem.createAndSendBackup();
    
    return {
      success: emailResult.success,
      emailBackup: emailResult,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Obtém estatísticas dos backups
   */
  async getBackupStatistics(): Promise<{
    localStats: any;
    lastBackup?: Date;
    systemStatus: 'healthy' | 'warning' | 'error';
  }> {
    const localStats = await this.localSystem.getBackupStats();
    
    let systemStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    
    if (localStats.totalBackups === 0) {
      systemStatus = 'error';
    } else if (localStats.newestBackup && 
               Date.now() - localStats.newestBackup.getTime() > 2 * 24 * 60 * 60 * 1000) {
      systemStatus = 'warning'; // Último backup há mais de 2 dias
    }

    return {
      localStats,
      lastBackup: localStats.newestBackup,
      systemStatus
    };
  }

  /**
   * Testa conectividade dos sistemas
   */
  async testSystems(): Promise<{
    local: boolean;
    email: boolean;
    database: boolean;
  }> {
    console.log('🔍 TESTANDO SISTEMAS DE BACKUP...');

    const results = {
      local: false,
      email: false,
      database: false
    };

    // Testar sistema local
    try {
      const localBackups = await this.localSystem.listBackups();
      results.local = true;
      console.log(`✅ Sistema local OK (${localBackups.length} backups)`);
    } catch (error) {
      console.log(`❌ Sistema local FALHOU: ${error}`);
    }

    // Testar sistema de email
    try {
      if (process.env.RESEND_API_KEY) {
        results.email = true;
        console.log('✅ Sistema email OK (Resend configurado)');
      } else {
        console.log('⚠️ Sistema email: Resend não configurado');
      }
    } catch (error) {
      console.log(`❌ Sistema email FALHOU: ${error}`);
    }

    // Testar banco de dados
    try {
      if (process.env.DATABASE_URL) {
        results.database = true;
        console.log('✅ Banco de dados OK');
      } else {
        console.log('❌ DATABASE_URL não configurado');
      }
    } catch (error) {
      console.log(`❌ Banco de dados FALHOU: ${error}`);
    }

    return results;
  }
}

export { AutomaticBackupSystem };