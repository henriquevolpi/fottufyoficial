/**
 * Sistema de Agendamento de Backup Automático
 * Configura backup local + email usando node-cron
 * 100% automático, sem necessidade de credenciais externas
 */

import cron from 'node-cron';
import { AutomaticBackupSystem } from './automatic-backup-system';

class BackupScheduler {
  private backupSystem: AutomaticBackupSystem;
  private scheduledTask: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor() {
    this.backupSystem = new AutomaticBackupSystem();
  }

  /**
   * Inicia o agendamento de backup diário (3:00 AM)
   */
  start(): void {
    if (this.isRunning) {
      console.log('[BACKUP-SCHEDULER] ⚠️ Agendamento já está rodando');
      return;
    }

    const cronSchedule = process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *';
    
    console.log(`[BACKUP-SCHEDULER] 📅 AGENDANDO BACKUP AUTOMÁTICO: ${cronSchedule}`);
    console.log('[BACKUP-SCHEDULER] 🎯 Sistema: Local + Email (100% automático)');
    
    this.scheduledTask = cron.schedule(cronSchedule, async () => {
      console.log('\n[BACKUP-SCHEDULER] 🚀 EXECUTANDO BACKUP AUTOMÁTICO AGENDADO');
      console.log('[BACKUP-SCHEDULER] ' + '='.repeat(60));
      
      try {
        const result = await this.backupSystem.executeFullBackup();
        
        if (result.success) {
          console.log('\n[BACKUP-SCHEDULER] ✅ BACKUP AUTOMÁTICO CONCLUÍDO COM SUCESSO');
          if (result.localBackup?.success) {
            console.log(`[BACKUP-SCHEDULER] 📁 Local: ${result.localBackup.size}`);
          }
          if (result.emailBackup?.success) {
            console.log(`[BACKUP-SCHEDULER] 📧 Email: ${result.emailBackup.size}`);
          }
          console.log(`[BACKUP-SCHEDULER] ⏱️ Tempo: ${((result.totalTime || 0) / 1000).toFixed(2)}s`);

          // Log de sucesso
          this.logBackupSuccess(result);
        } else {
          console.error('\n[BACKUP-SCHEDULER] ❌ FALHA NO BACKUP AUTOMÁTICO');
          if (result.localBackup?.error) {
            console.error(`[BACKUP-SCHEDULER] 📁 Local: ${result.localBackup.error}`);
          }
          if (result.emailBackup?.error) {
            console.error(`[BACKUP-SCHEDULER] 📧 Email: ${result.emailBackup.error}`);
          }

          // Log de falha
          this.logBackupFailure(`Local: ${result.localBackup?.error || 'OK'}, Email: ${result.emailBackup?.error || 'OK'}`);
        }

        const nextRun = this.getNextRunTime();
        console.log(`[BACKUP-SCHEDULER] ⏰ Próximo backup: ${nextRun}`);

      } catch (error: any) {
        console.error('\n[BACKUP-SCHEDULER] ❌ ERRO CRÍTICO NO BACKUP AUTOMÁTICO:', error.message);
        this.logBackupFailure(error.message);
      }
      
      console.log('[BACKUP-SCHEDULER] ' + '='.repeat(60));
    }, {
      scheduled: false,
      timezone: 'America/Sao_Paulo'
    });

    this.scheduledTask.start();
    this.isRunning = true;

    console.log('[BACKUP-SCHEDULER] ✅ Scheduler de backup iniciado com sucesso');
    console.log('[BACKUP-SCHEDULER] 📋 Funcionalidades ativas:');
    console.log('[BACKUP-SCHEDULER]    • Backup local com rotação (7 dias)');
    console.log('[BACKUP-SCHEDULER]    • Backup por email automático');
    console.log('[BACKUP-SCHEDULER]    • Limpeza automática de arquivos temporários');
  }

  /**
   * Para o agendamento
   */
  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      this.isRunning = false;
      console.log('[BACKUP-SCHEDULER] ⏹️ Scheduler de backup interrompido');
    }
  }

  /**
   * Executa backup manual completo para teste
   */
  async executeManualBackup(): Promise<{ success: boolean; message: string; details?: any }> {
    console.log('\n[BACKUP-SCHEDULER] 🔧 EXECUTANDO BACKUP MANUAL...');
    
    try {
      const result = await this.backupSystem.executeFullBackup();
      
      const message = result.success 
        ? `Backup concluído em ${((result.totalTime || 0) / 1000).toFixed(2)}s`
        : 'Falha no backup';

      return {
        success: result.success,
        message,
        details: result
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro crítico: ${error.message}`
      };
    }
  }

  /**
   * Executa apenas backup local para teste
   */
  async executeLocalBackupOnly(): Promise<{ success: boolean; message: string }> {
    console.log('\n[BACKUP-SCHEDULER] 📁 EXECUTANDO BACKUP LOCAL...');
    
    try {
      const result = await this.backupSystem.executeLocalBackup();
      
      return {
        success: result.success,
        message: result.success 
          ? `Backup local: ${result.localBackup?.size}`
          : `Erro: ${result.localBackup?.error}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro: ${error.message}`
      };
    }
  }

  /**
   * Executa apenas backup por email para teste
   */
  async executeEmailBackupOnly(): Promise<{ success: boolean; message: string }> {
    console.log('\n[BACKUP-SCHEDULER] 📧 EXECUTANDO BACKUP POR EMAIL...');
    
    try {
      const result = await this.backupSystem.executeEmailBackup();
      
      return {
        success: result.success,
        message: result.success 
          ? `Backup por email: ${result.emailBackup?.size}`
          : `Erro: ${result.emailBackup?.error}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro: ${error.message}`
      };
    }
  }

  /**
   * Testa todos os sistemas
   */
  async testBackupSystems(): Promise<{
    success: boolean;
    systems: { local: boolean; email: boolean; database: boolean };
    statistics?: any;
  }> {
    console.log('\n[BACKUP-SCHEDULER] 🔍 TESTANDO SISTEMAS DE BACKUP...');
    
    try {
      const systems = await this.backupSystem.testSystems();
      const statistics = await this.backupSystem.getBackupStatistics();
      
      return {
        success: Object.values(systems).some(Boolean),
        systems,
        statistics
      };
    } catch (error: any) {
      return {
        success: false,
        systems: { local: false, email: false, database: false }
      };
    }
  }

  /**
   * Calcula próxima execução do cron
   */
  private getNextRunTime(schedule?: string): string {
    const cronSchedule = schedule || process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *';
    
    const parts = cronSchedule.split(' ');
    if (parts.length >= 5) {
      const minute = parts[0];
      const hour = parts[1];
      
      const now = new Date();
      const next = new Date();
      
      next.setMinutes(minute === '*' ? now.getMinutes() : parseInt(minute));
      next.setHours(hour === '*' ? now.getHours() : parseInt(hour));
      next.setSeconds(0);
      
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next.toLocaleString('pt-BR');
    }
    
    return 'Horário não calculado';
  }

  /**
   * Log de backup bem-sucedido
   */
  private logBackupSuccess(result: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      localBackup: result.localBackup?.success || false,
      emailBackup: result.emailBackup?.success || false,
      totalTime: result.totalTime,
      localSize: result.localBackup?.size,
      emailSize: result.emailBackup?.size
    };
    
    console.log('[BACKUP-LOG]', JSON.stringify(logEntry));
  }

  /**
   * Log de backup com falha
   */
  private logBackupFailure(message: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: 'FAILURE',
      message: message,
    };
    
    console.error('[BACKUP-LOG]', JSON.stringify(logEntry));
  }

  /**
   * Verifica status do scheduler
   */
  getStatus(): {
    isRunning: boolean;
    schedule: string;
    nextRun: string;
    systemType: string;
    features: string[];
    timezone: string;
  } {
    return {
      isRunning: this.isRunning,
      schedule: process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *',
      nextRun: this.isRunning ? this.getNextRunTime() : 'Agendamento parado',
      systemType: 'Local + Email',
      features: [
        'Backup local com rotação automática',
        'Backup por email automático', 
        'Limpeza de arquivos temporários',
        '100% sem credenciais externas'
      ],
      timezone: 'America/Sao_Paulo'
    };
  }
}

// Instância global do agendador
let backupScheduler: BackupScheduler | null = null;

/**
 * Inicializa sistema de backup automático
 */
export function initializeBackupScheduler(): BackupScheduler {
  if (!backupScheduler) {
    backupScheduler = new BackupScheduler();
  }
  return backupScheduler;
}

/**
 * Obtém instância do agendador (se inicializado)
 */
export function getBackupScheduler(): BackupScheduler | null {
  return backupScheduler;
}

export { BackupScheduler };