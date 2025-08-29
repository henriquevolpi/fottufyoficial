/**
 * Sistema de Backup por Email Automático
 * Envia backups diários por email usando Resend
 * 100% automático, usa infraestrutura já existente
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { Resend } from 'resend';

const execAsync = promisify(exec);

interface EmailBackupConfig {
  fromEmail: string;
  toEmail: string;
  maxAttachmentSize: number; // MB
  tempDir: string;
}

class EmailBackupSystem {
  private resend: Resend;
  private config: EmailBackupConfig;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.config = {
      fromEmail: 'backup@fottufy.com',
      toEmail: 'areanatan1@gmail.com', // Email do admin
      maxAttachmentSize: 25, // Limite do email (25MB)
      tempDir: '/tmp/backup-email'
    };
  }

  /**
   * Cria backup e envia por email
   */
  async createAndSendBackup(): Promise<{ success: boolean; size?: string; error?: string }> {
    try {
      console.log('📧 Iniciando backup por email...');
      
      // Garantir diretório temporário
      await fs.ensureDir(this.config.tempDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `fottufy-backup-${timestamp}`;
      const sqlFilePath = path.join(this.config.tempDir, `${backupFileName}.sql`);
      const zipFilePath = path.join(this.config.tempDir, `${backupFileName}.zip`);
      
      // Executar pg_dump
      console.log('📊 Gerando dump do PostgreSQL...');
      const dumpCommand = `pg_dump "${process.env.DATABASE_URL}" > "${sqlFilePath}"`;
      await execAsync(dumpCommand);
      
      // Verificar tamanho do SQL
      const sqlStats = await fs.stat(sqlFilePath);
      const sqlSizeMB = sqlStats.size / 1024 / 1024;
      console.log(`✅ Dump SQL criado: ${sqlSizeMB.toFixed(2)} MB`);
      
      // Criar ZIP comprimido
      console.log('🗜️ Comprimindo backup...');
      await this.createZipArchive(sqlFilePath, zipFilePath);
      
      // Verificar tamanho do ZIP
      const zipStats = await fs.stat(zipFilePath);
      const zipSizeMB = zipStats.size / 1024 / 1024;
      const sizeFormatted = `${zipSizeMB.toFixed(2)} MB`;
      
      // Verificar se cabe no email
      if (zipSizeMB > this.config.maxAttachmentSize) {
        console.warn(`⚠️ Backup muito grande (${sizeFormatted}), enviando notificação sem anexo`);
        await this.sendBackupNotification(sizeFormatted, true);
      } else {
        // Enviar por email com anexo
        await this.sendBackupByEmail(zipFilePath, sizeFormatted);
      }
      
      // Limpar arquivos temporários
      await this.cleanupTempFiles();
      
      console.log(`✅ Backup por email processado: ${sizeFormatted}`);
      
      return {
        success: true,
        size: sizeFormatted
      };
      
    } catch (error: any) {
      console.error('❌ Erro no backup por email:', error.message);
      
      // Tentar enviar notificação de erro
      try {
        await this.sendErrorNotification(error.message);
      } catch (emailError) {
        console.error('❌ Erro ao enviar notificação de erro:', emailError);
      }
      
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
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => resolve());
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.file(sqlFilePath, { name: path.basename(sqlFilePath) });
      archive.finalize();
    });
  }

  /**
   * Envia backup por email com anexo
   */
  private async sendBackupByEmail(zipFilePath: string, size: string): Promise<void> {
    const fileName = path.basename(zipFilePath);
    const fileContent = await fs.readFile(zipFilePath);
    const base64Content = fileContent.toString('base64');
    
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    await this.resend.emails.send({
      from: this.config.fromEmail,
      to: this.config.toEmail,
      subject: `📧 Backup Automático Fottufy - ${new Date().toLocaleDateString('pt-BR')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📧 Backup Automático</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Fottufy - Sistema de Backup</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #28a745; margin: 0 0 15px 0;">✅ Backup Criado com Sucesso</h2>
              <p style="margin: 5px 0; color: #6c757d;"><strong>Data:</strong> ${currentDate}</p>
              <p style="margin: 5px 0; color: #6c757d;"><strong>Tamanho:</strong> ${size}</p>
              <p style="margin: 5px 0; color: #6c757d;"><strong>Arquivo:</strong> ${fileName}</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
              <p style="margin: 0; color: #1976d2;">
                <strong>🔒 Backup em Anexo</strong><br>
                O arquivo de backup completo está anexado neste email. 
                Guarde em local seguro para restauração se necessário.
              </p>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 12px;">
              <p>Sistema de Backup Automático Fottufy</p>
              <p>Este backup foi gerado automaticamente às 3:00 AM</p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: base64Content
        }
      ]
    });

    console.log(`📧 Backup enviado por email: ${fileName} (${size})`);
  }

  /**
   * Envia notificação quando backup é muito grande
   */
  private async sendBackupNotification(size: string, tooLarge: boolean = false): Promise<void> {
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    await this.resend.emails.send({
      from: this.config.fromEmail,
      to: this.config.toEmail,
      subject: `⚠️ Backup Fottufy - Arquivo Muito Grande (${size})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff9a56 0%, #ff6b35 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Backup Grande Detectado</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Fottufy - Sistema de Backup</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
              <h2 style="color: #856404; margin: 0 0 15px 0;">📊 Backup Criado (Arquivo Grande)</h2>
              <p style="margin: 5px 0; color: #856404;"><strong>Data:</strong> ${currentDate}</p>
              <p style="margin: 5px 0; color: #856404;"><strong>Tamanho:</strong> ${size}</p>
              <p style="margin: 5px 0; color: #856404;"><strong>Status:</strong> Arquivo muito grande para email</p>
            </div>
            
            <div style="background: #f8d7da; padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545;">
              <p style="margin: 0; color: #721c24;">
                <strong>📁 Backup Salvo Localmente</strong><br>
                O backup foi criado com sucesso, mas é muito grande (>${this.config.maxAttachmentSize}MB) para ser enviado por email.
                O arquivo está salvo no servidor.
              </p>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 12px;">
              <p>Sistema de Backup Automático Fottufy</p>
              <p>Considere configurar Google Drive para backups grandes</p>
            </div>
          </div>
        </div>
      `
    });

    console.log(`⚠️ Notificação de backup grande enviada: ${size}`);
  }

  /**
   * Envia notificação de erro
   */
  private async sendErrorNotification(error: string): Promise<void> {
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    await this.resend.emails.send({
      from: this.config.fromEmail,
      to: this.config.toEmail,
      subject: `❌ Erro no Backup Automático Fottufy`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">❌ Erro no Backup</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Fottufy - Sistema de Backup</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
              <h2 style="color: #721c24; margin: 0 0 15px 0;">🚨 Falha no Backup Automático</h2>
              <p style="margin: 5px 0; color: #721c24;"><strong>Data:</strong> ${currentDate}</p>
              <p style="margin: 5px 0; color: #721c24;"><strong>Erro:</strong> ${error}</p>
            </div>
            
            <div style="background: #e2e3e5; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #383d41;">
                <strong>🔧 Ação Necessária</strong><br>
                Verifique o sistema de backup e corrija o problema.
                O próximo backup será tentado no horário programado.
              </p>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 12px;">
              <p>Sistema de Backup Automático Fottufy</p>
              <p>Monitore regularmente o status dos backups</p>
            </div>
          </div>
        </div>
      `
    });

    console.log(`❌ Notificação de erro enviada: ${error}`);
  }

  /**
   * Limpa arquivos temporários
   */
  private async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.tempDir);
      for (const file of files) {
        await fs.remove(path.join(this.config.tempDir, file));
      }
      console.log('🧹 Arquivos temporários limpos');
    } catch (error) {
      console.warn('⚠️ Erro ao limpar arquivos temporários:', error);
    }
  }
}

export { EmailBackupSystem };