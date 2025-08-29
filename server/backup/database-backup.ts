import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { google } from 'googleapis';

/**
 * Sistema de backup automático do banco de dados PostgreSQL
 * Cria backup SQL, compacta em ZIP e envia para Google Drive
 * 
 * Funciona em qualquer plataforma: Replit, Render, VPS, etc.
 */

interface BackupConfig {
  googleDrive: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  database: {
    url: string;
    name?: string;
  };
  backup: {
    maxRetries: number;
    compressionLevel: number;
    keepLocalCopies: number;
  };
}

class DatabaseBackupSystem {
  private config: BackupConfig;
  private oauth2Client: any;
  private drive: any;

  constructor(config: BackupConfig) {
    this.config = config;
    this.initializeGoogleDrive();
  }

  private initializeGoogleDrive() {
    this.oauth2Client = new google.auth.OAuth2(
      this.config.googleDrive.clientId,
      this.config.googleDrive.clientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    this.oauth2Client.setCredentials({
      refresh_token: this.config.googleDrive.refreshToken,
    });

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Cria backup do banco de dados PostgreSQL
   */
  async createDatabaseBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    const sqlFile = path.join(backupDir, `backup_${timestamp}.sql`);

    // Criar diretório de backup se não existir
    await fs.ensureDir(backupDir);

    console.log(`[BACKUP] Iniciando backup do banco de dados...`);
    console.log(`[BACKUP] Arquivo SQL: ${sqlFile}`);

    return new Promise((resolve, reject) => {
      // Usar pg_dump para criar o backup
      const pgDump = spawn('pg_dump', [
        this.config.database.url,
        '--verbose',
        '--clean',
        '--no-acl',
        '--no-owner',
        '--format=plain',
        '--file', sqlFile
      ]);

      let errorOutput = '';

      pgDump.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`[BACKUP] ${output.trim()}`);
        if (output.includes('ERROR')) {
          errorOutput += output;
        }
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          console.log(`[BACKUP] ✅ Backup SQL criado com sucesso`);
          resolve(sqlFile);
        } else {
          console.error(`[BACKUP] ❌ Erro no pg_dump (código ${code}):`, errorOutput);
          reject(new Error(`pg_dump falhou com código ${code}`));
        }
      });
    });
  }

  /**
   * Compacta o arquivo SQL em ZIP
   */
  async compressBackup(sqlFile: string): Promise<string> {
    const zipFile = sqlFile.replace('.sql', '.zip');
    
    console.log(`[BACKUP] Compactando backup...`);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFile);
      const archive = archiver('zip', {
        zlib: { level: this.config.backup.compressionLevel || 9 }
      });

      output.on('close', () => {
        const stats = fs.statSync(zipFile);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`[BACKUP] ✅ Backup compactado: ${sizeMB}MB`);
        resolve(zipFile);
      });

      archive.on('error', reject);
      archive.pipe(output);

      // Adicionar o arquivo SQL ao ZIP
      const fileName = path.basename(sqlFile);
      archive.file(sqlFile, { name: fileName });
      archive.finalize();
    });
  }

  /**
   * Envia backup para Google Drive
   */
  async uploadToGoogleDrive(zipFile: string): Promise<string> {
    console.log(`[BACKUP] Enviando para Google Drive...`);

    try {
      // Verificar se pasta de backup existe, criar se necessário
      const folderName = 'Fottufy_Backups';
      const folderId = await this.ensureBackupFolder(folderName);

      const fileName = path.basename(zipFile);
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream(zipFile),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,name,size',
      });

      const uploadedFile = response.data;
      const sizeMB = uploadedFile.size ? (parseInt(uploadedFile.size) / (1024 * 1024)).toFixed(2) : 'N/A';
      
      console.log(`[BACKUP] ✅ Upload concluído:`);
      console.log(`[BACKUP]    Arquivo: ${uploadedFile.name}`);
      console.log(`[BACKUP]    ID: ${uploadedFile.id}`);
      console.log(`[BACKUP]    Tamanho: ${sizeMB}MB`);

      return uploadedFile.id as string;

    } catch (error: any) {
      console.error(`[BACKUP] ❌ Erro no upload:`, error.message);
      throw error;
    }
  }

  /**
   * Verifica/cria pasta de backup no Google Drive
   */
  private async ensureBackupFolder(folderName: string): Promise<string> {
    try {
      // Procurar pasta existente
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
      });

      if (response.data.files && response.data.files.length > 0) {
        console.log(`[BACKUP] Pasta existente encontrada: ${folderName}`);
        return response.data.files[0].id;
      }

      // Criar nova pasta
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      console.log(`[BACKUP] ✅ Pasta criada: ${folderName} (${folder.data.id})`);
      return folder.data.id;

    } catch (error: any) {
      console.error(`[BACKUP] ❌ Erro ao criar pasta:`, error.message);
      throw error;
    }
  }

  /**
   * Limpa arquivos locais antigos
   */
  async cleanupLocalFiles(currentFile: string) {
    const backupDir = path.dirname(currentFile);
    const files = await fs.readdir(backupDir);
    
    const backupFiles = files
      .filter(f => f.startsWith('backup_') && (f.endsWith('.sql') || f.endsWith('.zip')))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        stats: fs.statSync(path.join(backupDir, f))
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    // Manter apenas os N backups mais recentes
    const toDelete = backupFiles.slice(this.config.backup.keepLocalCopies || 3);
    
    for (const file of toDelete) {
      await fs.remove(file.path);
      console.log(`[BACKUP] 🗑️ Arquivo local removido: ${file.name}`);
    }
  }

  /**
   * Executa backup completo
   */
  async performBackup(): Promise<{ success: boolean; message: string; driveFileId?: string }> {
    const startTime = Date.now();
    
    try {
      console.log(`[BACKUP] 🚀 Iniciando backup automático...`);
      console.log(`[BACKUP] Data/Hora: ${new Date().toLocaleString('pt-BR')}`);

      // 1. Criar backup SQL
      const sqlFile = await this.createDatabaseBackup();
      
      // 2. Compactar em ZIP
      const zipFile = await this.compressBackup(sqlFile);
      
      // 3. Enviar para Google Drive
      const driveFileId = await this.uploadToGoogleDrive(zipFile);
      
      // 4. Limpar arquivos locais antigos
      await this.cleanupLocalFiles(zipFile);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const message = `Backup concluído com sucesso em ${duration}s`;
      
      console.log(`[BACKUP] ✅ ${message}`);
      
      return { success: true, message, driveFileId };

    } catch (error: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const message = `Erro no backup após ${duration}s: ${error.message}`;
      
      console.error(`[BACKUP] ❌ ${message}`);
      
      return { success: false, message };
    }
  }
}

/**
 * Cria instância do sistema de backup com configuração das variáveis de ambiente
 */
export function createBackupSystem(): DatabaseBackupSystem {
  const config: BackupConfig = {
    googleDrive: {
      clientId: process.env.GOOGLE_DRIVE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN!,
    },
    database: {
      url: process.env.DATABASE_URL!,
      name: process.env.DB_NAME || 'fottufy',
    },
    backup: {
      maxRetries: parseInt(process.env.BACKUP_MAX_RETRIES || '3'),
      compressionLevel: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '9'),
      keepLocalCopies: parseInt(process.env.BACKUP_KEEP_LOCAL_COPIES || '3'),
    },
  };

  // Validar configuração
  const requiredVars = [
    'GOOGLE_DRIVE_CLIENT_ID',
    'GOOGLE_DRIVE_CLIENT_SECRET', 
    'GOOGLE_DRIVE_REFRESH_TOKEN',
    'DATABASE_URL'
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Variável de ambiente obrigatória não encontrada: ${varName}`);
    }
  }

  return new DatabaseBackupSystem(config);
}

export { DatabaseBackupSystem };