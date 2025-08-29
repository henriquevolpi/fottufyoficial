/**
 * Sistema de Backup Local Automático
 * Mantém backups locais com rotação automática (7 dias)
 * 100% automático, sem necessidade de credenciais externas
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';

const execAsync = promisify(exec);

interface BackupConfig {
  backupDir: string;
  maxBackups: number;
  compressionLevel: number;
}

class LocalBackupSystem {
  private config: BackupConfig;

  constructor() {
    this.config = {
      backupDir: '/home/runner/workspace/backups',
      maxBackups: 7, // Mantém últimos 7 backups
      compressionLevel: 9 // Máxima compressão
    };
  }

  /**
   * Cria backup completo do banco de dados
   */
  async createBackup(): Promise<{ success: boolean; filePath?: string; size?: string; error?: string }> {
    try {
      console.log('🔄 Iniciando backup local automático...');
      
      // Garantir que diretório existe
      await fs.ensureDir(this.config.backupDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-local-${timestamp}`;
      const sqlFilePath = path.join(this.config.backupDir, `${backupFileName}.sql`);
      const zipFilePath = path.join(this.config.backupDir, `${backupFileName}.zip`);
      
      // Executar pg_dump
      console.log('📊 Gerando dump do PostgreSQL...');
      const dumpCommand = `pg_dump "${process.env.DATABASE_URL}" > "${sqlFilePath}"`;
      await execAsync(dumpCommand);
      
      // Verificar se arquivo foi criado
      const sqlStats = await fs.stat(sqlFilePath);
      console.log(`✅ Dump SQL criado: ${(sqlStats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Criar ZIP comprimido
      console.log('🗜️ Comprimindo backup...');
      await this.createZipArchive(sqlFilePath, zipFilePath);
      
      // Remover arquivo SQL (manter só o ZIP)
      await fs.remove(sqlFilePath);
      
      // Verificar resultado final
      const zipStats = await fs.stat(zipFilePath);
      const sizeFormatted = `${(zipStats.size / 1024 / 1024).toFixed(2)} MB`;
      
      // Limpar backups antigos
      await this.cleanOldBackups();
      
      console.log(`✅ Backup local criado: ${path.basename(zipFilePath)} (${sizeFormatted})`);
      
      return {
        success: true,
        filePath: zipFilePath,
        size: sizeFormatted
      };
      
    } catch (error: any) {
      console.error('❌ Erro no backup local:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cria arquivo ZIP comprimido
   */
  private async createZipArchive(sqlFilePath: string, zipFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: this.config.compressionLevel } });
      
      output.on('close', () => resolve());
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.file(sqlFilePath, { name: path.basename(sqlFilePath) });
      archive.finalize();
    });
  }

  /**
   * Remove backups antigos mantendo apenas os mais recentes
   */
  private async cleanOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-local-') && file.endsWith('.zip'))
        .map(file => ({
          name: file,
          path: path.join(this.config.backupDir, file),
          mtime: fs.statSync(path.join(this.config.backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Remover arquivos excedentes
      if (backupFiles.length > this.config.maxBackups) {
        const filesToRemove = backupFiles.slice(this.config.maxBackups);
        
        for (const file of filesToRemove) {
          await fs.remove(file.path);
          console.log(`🗑️ Backup antigo removido: ${file.name}`);
        }
      }
      
      console.log(`📁 Mantendo ${Math.min(backupFiles.length, this.config.maxBackups)} backups locais`);
      
    } catch (error) {
      console.warn('⚠️ Erro ao limpar backups antigos:', error);
    }
  }

  /**
   * Lista backups disponíveis
   */
  async listBackups(): Promise<Array<{ name: string; size: string; date: Date }>> {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-local-') && file.endsWith('.zip'))
        .map(file => {
          const filePath = path.join(this.config.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
            date: stats.mtime
          };
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      return backupFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * Obter estatísticas do sistema de backup
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: string;
    oldestBackup?: Date;
    newestBackup?: Date;
  }> {
    const backups = await this.listBackups();
    
    if (backups.length === 0) {
      return { totalBackups: 0, totalSize: '0 MB' };
    }

    const totalBytes = backups.reduce((acc, backup) => {
      return acc + (parseFloat(backup.size) * 1024 * 1024);
    }, 0);

    return {
      totalBackups: backups.length,
      totalSize: `${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
      oldestBackup: backups[backups.length - 1]?.date,
      newestBackup: backups[0]?.date
    };
  }
}

export { LocalBackupSystem };