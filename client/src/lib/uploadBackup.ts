/**
 * SISTEMA DE BACKUP AUTOMÁTICO DE UPLOADS
 * 
 * Sistema de recuperação que salva progresso do upload automaticamente
 * e permite recuperação em caso de falha ou recarga da página
 */

export interface UploadBackupData {
  sessionId: string;
  projectData: {
    nome: string;
    cliente: string;
    emailCliente: string;
    dataEvento: string;
    observacoes?: string;
  };
  files: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }[];
  progress: {
    stage: 'compression' | 'upload' | 'completed' | 'failed';
    percentage: number;
    processedFiles: number;
    totalFiles: number;
    timestamp: number;
  };
  compressedFiles?: {
    name: string;
    size: number;
    originalSize: number;
    dataUrl?: string; // Para arquivos pequenos
  }[];
  uploadedFiles?: {
    name: string;
    url: string;
    id: string;
  }[];
  errors?: string[];
}

const BACKUP_KEY_PREFIX = 'fottufy_upload_backup_';
const MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Salva backup do progresso atual
 */
export function saveUploadBackup(sessionId: string, data: Partial<UploadBackupData>): void {
  try {
    const backupKey = BACKUP_KEY_PREFIX + sessionId;
    const existing = getUploadBackup(sessionId);
    
    const backupData: UploadBackupData = {
      sessionId,
      projectData: data.projectData || existing?.projectData || {
        nome: '',
        cliente: '',
        emailCliente: '',
        dataEvento: '',
        observacoes: ''
      },
      files: data.files || existing?.files || [],
      progress: {
        stage: data.progress?.stage || 'compression',
        percentage: data.progress?.percentage || 0,
        processedFiles: data.progress?.processedFiles || 0,
        totalFiles: data.progress?.totalFiles || 0,
        timestamp: Date.now()
      },
      compressedFiles: data.compressedFiles || existing?.compressedFiles,
      uploadedFiles: data.uploadedFiles || existing?.uploadedFiles,
      errors: data.errors || existing?.errors
    };
    
    localStorage.setItem(backupKey, JSON.stringify(backupData));
    console.log(`[Backup] Progresso salvo: ${backupData.progress.stage} - ${backupData.progress.percentage}%`);
  } catch (error) {
    console.warn('[Backup] Erro ao salvar backup:', error);
  }
}

/**
 * Recupera backup de upload
 */
export function getUploadBackup(sessionId: string): UploadBackupData | null {
  try {
    const backupKey = BACKUP_KEY_PREFIX + sessionId;
    const backupStr = localStorage.getItem(backupKey);
    
    if (!backupStr) return null;
    
    const backup: UploadBackupData = JSON.parse(backupStr);
    
    // Verificar se backup não é muito antigo
    const age = Date.now() - backup.progress.timestamp;
    if (age > MAX_BACKUP_AGE_MS) {
      removeUploadBackup(sessionId);
      return null;
    }
    
    return backup;
  } catch (error) {
    console.warn('[Backup] Erro ao recuperar backup:', error);
    return null;
  }
}

/**
 * Remove backup após conclusão ou cancelamento
 */
export function removeUploadBackup(sessionId: string): void {
  try {
    const backupKey = BACKUP_KEY_PREFIX + sessionId;
    localStorage.removeItem(backupKey);
    console.log(`[Backup] Backup removido: ${sessionId}`);
  } catch (error) {
    console.warn('[Backup] Erro ao remover backup:', error);
  }
}

/**
 * Lista todos os backups existentes
 */
export function listUploadBackups(): UploadBackupData[] {
  const backups: UploadBackupData[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(BACKUP_KEY_PREFIX)) {
        const sessionId = key.replace(BACKUP_KEY_PREFIX, '');
        const backup = getUploadBackup(sessionId);
        if (backup) {
          backups.push(backup);
        }
      }
    }
  } catch (error) {
    console.warn('[Backup] Erro ao listar backups:', error);
  }
  
  return backups.sort((a, b) => b.progress.timestamp - a.progress.timestamp);
}

/**
 * Limpa backups antigos automaticamente
 */
export function cleanupOldBackups(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(BACKUP_KEY_PREFIX)) {
        const backupStr = localStorage.getItem(key);
        if (backupStr) {
          try {
            const backup: UploadBackupData = JSON.parse(backupStr);
            const age = Date.now() - backup.progress.timestamp;
            
            if (age > MAX_BACKUP_AGE_MS) {
              keysToRemove.push(key);
            }
          } catch (e) {
            // Backup corrompido, remover
            keysToRemove.push(key);
          }
        }
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`[Backup] Backup antigo removido: ${key}`);
    });
    
    if (keysToRemove.length > 0) {
      console.log(`[Backup] ${keysToRemove.length} backups antigos limpos`);
    }
  } catch (error) {
    console.warn('[Backup] Erro na limpeza de backups:', error);
  }
}

/**
 * Verifica se há uploads incompletos que podem ser recuperados
 */
export function checkRecoverableUploads(): UploadBackupData[] {
  const backups = listUploadBackups();
  
  return backups.filter(backup => 
    backup.progress.stage !== 'completed' && 
    backup.progress.stage !== 'failed' &&
    backup.progress.percentage > 0
  );
}

/**
 * Gera ID de sessão único para backup
 */
export function generateBackupSessionId(): string {
  return 'backup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Salva arquivos comprimidos em backup (para arquivos pequenos)
 */
export function saveCompressedFilesToBackup(
  sessionId: string, 
  files: { file: File; originalSize: number }[]
): void {
  try {
    const compressedFiles = files.map(({ file, originalSize }) => ({
      name: file.name,
      size: file.size,
      originalSize,
      // Só salvar dataUrl para arquivos pequenos (< 1MB)
      dataUrl: file.size < 1024 * 1024 ? '' : undefined
    }));
    
    saveUploadBackup(sessionId, { compressedFiles });
  } catch (error) {
    console.warn('[Backup] Erro ao salvar arquivos comprimidos:', error);
  }
}

/**
 * Atualiza progresso de upload no backup
 */
export function updateUploadProgress(
  sessionId: string,
  stage: UploadBackupData['progress']['stage'],
  percentage: number,
  processedFiles: number,
  totalFiles: number
): void {
  try {
    const progress = {
      stage,
      percentage,
      processedFiles,
      totalFiles,
      timestamp: Date.now()
    };
    
    saveUploadBackup(sessionId, { progress });
  } catch (error) {
    console.warn('[Backup] Erro ao atualizar progresso:', error);
  }
}

/**
 * Adiciona erro ao backup
 */
export function addErrorToBackup(sessionId: string, error: string): void {
  try {
    const existing = getUploadBackup(sessionId);
    const errors = [...(existing?.errors || []), error];
    
    saveUploadBackup(sessionId, { errors });
  } catch (err) {
    console.warn('[Backup] Erro ao salvar erro:', err);
  }
}

/**
 * Calcula estatísticas do backup
 */
export function getBackupStats(backup: UploadBackupData): {
  totalFiles: number;
  processedFiles: number;
  remainingFiles: number;
  percentage: number;
  estimatedTimeLeft: number;
  canResume: boolean;
} {
  const totalFiles = backup.files.length;
  const processedFiles = backup.progress.processedFiles;
  const remainingFiles = totalFiles - processedFiles;
  const percentage = backup.progress.percentage;
  
  // Estimar tempo restante baseado no progresso atual
  const elapsedTime = Date.now() - (backup.progress.timestamp - (percentage * 1000)); // Estimativa
  const estimatedTotalTime = percentage > 0 ? (elapsedTime / percentage) * 100 : 0;
  const estimatedTimeLeft = estimatedTotalTime - elapsedTime;
  
  const canResume = backup.progress.stage !== 'completed' && 
                   backup.progress.stage !== 'failed' &&
                   remainingFiles > 0;
  
  return {
    totalFiles,
    processedFiles,
    remainingFiles,
    percentage,
    estimatedTimeLeft: Math.max(0, estimatedTimeLeft),
    canResume
  };
}

// Limpar backups antigos na inicialização
cleanupOldBackups();