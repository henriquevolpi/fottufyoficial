import cron from 'node-cron';
import { createBackupSystem } from './database-backup';

/**
 * Sistema de agendamento de backups automáticos
 * Funciona em qualquer plataforma: Replit, Render, VPS, etc.
 * 
 * Configurações de agendamento:
 * - Padrão: Todo dia às 3:00 AM
 * - Customizável via variável de ambiente BACKUP_CRON_SCHEDULE
 */

class BackupScheduler {
  private backupSystem: any;
  private cronJob: any;
  private isRunning = false;

  constructor() {
    try {
      this.backupSystem = createBackupSystem();
      console.log('[BACKUP-SCHEDULER] Sistema de backup inicializado');
    } catch (error: any) {
      console.error('[BACKUP-SCHEDULER] ❌ Erro ao inicializar:', error.message);
      throw error;
    }
  }

  /**
   * Inicia agendamento automático
   */
  start() {
    if (this.isRunning) {
      console.log('[BACKUP-SCHEDULER] ⚠️ Agendamento já está rodando');
      return;
    }

    // Configuração do agendamento (padrão: todo dia às 3:00 AM)
    const schedule = process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *';
    
    console.log(`[BACKUP-SCHEDULER] 📅 Configurando agendamento: ${schedule}`);
    console.log(`[BACKUP-SCHEDULER] ⏰ Próximo backup: ${this.getNextRunTime(schedule)}`);

    this.cronJob = cron.schedule(schedule, async () => {
      await this.executeScheduledBackup();
    }, {
      scheduled: false,
      timezone: 'America/Sao_Paulo' // Adjust to your timezone
    });

    this.cronJob.start();
    this.isRunning = true;
    
    console.log('[BACKUP-SCHEDULER] ✅ Agendamento automático iniciado');
  }

  /**
   * Para o agendamento
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('[BACKUP-SCHEDULER] 🛑 Agendamento interrompido');
    }
  }

  /**
   * Executa backup agendado
   */
  private async executeScheduledBackup() {
    console.log('[BACKUP-SCHEDULER] 🔄 Executando backup agendado...');
    
    try {
      const result = await this.backupSystem.performBackup();
      
      if (result.success) {
        console.log(`[BACKUP-SCHEDULER] ✅ ${result.message}`);
        
        // Log para monitoramento
        this.logBackupSuccess(result);
      } else {
        console.error(`[BACKUP-SCHEDULER] ❌ ${result.message}`);
        
        // Log para monitoramento de falhas
        this.logBackupFailure(result.message);
      }
      
    } catch (error: any) {
      console.error('[BACKUP-SCHEDULER] ❌ Erro no backup agendado:', error.message);
      this.logBackupFailure(error.message);
    }

    const nextRun = this.getNextRunTime();
    console.log(`[BACKUP-SCHEDULER] ⏰ Próximo backup: ${nextRun}`);
  }

  /**
   * Executa backup manual (para testes)
   */
  async executeManualBackup(): Promise<{ success: boolean; message: string }> {
    console.log('[BACKUP-SCHEDULER] 🔧 Executando backup manual...');
    
    try {
      const result = await this.backupSystem.performBackup();
      return result;
    } catch (error: any) {
      return {
        success: false,
        message: `Erro no backup manual: ${error.message}`
      };
    }
  }

  /**
   * Calcula próxima execução do cron
   */
  private getNextRunTime(schedule?: string): string {
    const cronSchedule = schedule || process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *';
    
    // Parse básico do cron para estimar próxima execução
    const parts = cronSchedule.split(' ');
    if (parts.length >= 5) {
      const minute = parts[0];
      const hour = parts[1];
      
      const now = new Date();
      const next = new Date();
      
      next.setMinutes(minute === '*' ? now.getMinutes() : parseInt(minute));
      next.setHours(hour === '*' ? now.getHours() : parseInt(hour));
      next.setSeconds(0);
      
      // Se o horário já passou hoje, agenda para amanhã
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next.toLocaleString('pt-BR');
    }
    
    return 'Horário não calculado';
  }

  /**
   * Log de backup bem-sucedido (para monitoramento)
   */
  private logBackupSuccess(result: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      message: result.message,
      driveFileId: result.driveFileId,
    };
    
    // Em produção, você poderia enviar isso para um sistema de monitoramento
    console.log('[BACKUP-LOG]', JSON.stringify(logEntry));
  }

  /**
   * Log de backup com falha (para monitoramento)
   */
  private logBackupFailure(message: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: 'FAILURE',
      message: message,
    };
    
    // Em produção, você poderia enviar isso para um sistema de monitoramento
    // ou enviar notificação por email/slack
    console.error('[BACKUP-LOG]', JSON.stringify(logEntry));
  }

  /**
   * Status do agendamento
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      schedule: process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *',
      nextRun: this.isRunning ? this.getNextRunTime() : 'Agendamento parado',
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