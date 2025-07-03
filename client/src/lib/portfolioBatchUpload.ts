/**
 * SISTEMA DE UPLOAD EM LOTES ESPECÍFICO PARA PORTFÓLIOS
 * 
 * Sistema completamente independente do batchUpload.ts da dashboard.
 * Otimizado para uploads de alta qualidade com verificações específicas.
 * 
 * Diferenças da dashboard:
 * - Lotes menores para melhor qualidade
 * - Timeouts maiores para arquivos de alta resolução
 * - Verificações específicas para portfólios
 * - Headers e endpoints específicos
 */

import { apiRequest } from './queryClient';
import type { PortfolioCompressionResult } from './portfolioImageCompression';

export interface PortfolioUploadOptions {
  portfolioId: number;
  files: File[];
  onProgress?: (uploaded: number, total: number) => void;
  onError?: (error: string) => void;
}

export interface PortfolioUploadResult {
  success: boolean;
  photos?: Array<{
    id: number;
    portfolioId: number;
    photoUrl: string;
    originalName: string;
    description: string | null;
    order: number;
    createdAt: string;
  }>;
  message?: string;
  error?: string;
}

// Configurações específicas para upload de portfólios
const PORTFOLIO_UPLOAD_CONFIG = {
  BATCH_SIZE: 15,           // Menor que dashboard (100) para melhor qualidade
  TIMEOUT: 120000,          // 2 minutos (vs 60s dashboard) para arquivos maiores
  RETRY_ATTEMPTS: 3,        // Mesma quantidade de tentativas
  RETRY_DELAY: 2000,        // Delay maior entre tentativas
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB por arquivo (vs limites menores dashboard)
};

/**
 * Faz upload de um lote de fotos para um portfólio específico
 */
async function uploadPortfolioBatch(
  portfolioId: number, 
  files: File[],
  retryCount = 0
): Promise<PortfolioUploadResult> {
  const formData = new FormData();
  
  // Adiciona cada arquivo ao FormData
  files.forEach((file) => {
    formData.append('photos', file);
  });

  console.log(`[Portfolio] Uploading batch de ${files.length} arquivos para portfolio ${portfolioId}`);

  try {
    const response = await fetch(`/api/portfolios/${portfolioId}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      signal: AbortSignal.timeout(PORTFOLIO_UPLOAD_CONFIG.TIMEOUT),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result: PortfolioUploadResult = await response.json();

    if (result.success) {
      console.log(`[Portfolio] Batch upload concluído: ${files.length} arquivos enviados`);
      return result;
    } else {
      throw new Error(result.error || 'Falha no upload');
    }
  } catch (error: any) {
    console.error(`[Portfolio] Erro no batch upload (tentativa ${retryCount + 1}):`, error);
    
    // Retry logic para portfólios
    if (retryCount < PORTFOLIO_UPLOAD_CONFIG.RETRY_ATTEMPTS) {
      console.log(`[Portfolio] Tentando novamente em ${PORTFOLIO_UPLOAD_CONFIG.RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, PORTFOLIO_UPLOAD_CONFIG.RETRY_DELAY));
      return uploadPortfolioBatch(portfolioId, files, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Processa upload de múltiplos arquivos em lotes para portfólios
 */
export async function uploadPortfolioPhotos(options: PortfolioUploadOptions): Promise<PortfolioUploadResult> {
  const { portfolioId, files, onProgress, onError } = options;
  
  if (!files.length) {
    return { success: false, error: 'Nenhum arquivo selecionado' };
  }

  // Validação específica para portfólios
  for (const file of files) {
    if (file.size > PORTFOLIO_UPLOAD_CONFIG.MAX_FILE_SIZE) {
      const errorMsg = `Arquivo ${file.name} é muito grande. Máximo: ${PORTFOLIO_UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`;
      if (onError) onError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  console.log(`[Portfolio] Iniciando upload de ${files.length} arquivos em lotes de ${PORTFOLIO_UPLOAD_CONFIG.BATCH_SIZE}`);

  const totalFiles = files.length;
  const totalBatches = Math.ceil(totalFiles / PORTFOLIO_UPLOAD_CONFIG.BATCH_SIZE);
  let uploadedCount = 0;
  const allUploadedPhotos: any[] = [];

  try {
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * PORTFOLIO_UPLOAD_CONFIG.BATCH_SIZE;
      const end = Math.min(start + PORTFOLIO_UPLOAD_CONFIG.BATCH_SIZE, totalFiles);
      const batchFiles = files.slice(start, end);

      console.log(`[Portfolio] Enviando lote ${batchIndex + 1}/${totalBatches} - ${batchFiles.length} arquivos`);

      const batchResult = await uploadPortfolioBatch(portfolioId, batchFiles);
      
      if (!batchResult.success) {
        throw new Error(batchResult.error || `Falha no lote ${batchIndex + 1}`);
      }

      if (batchResult.photos) {
        allUploadedPhotos.push(...batchResult.photos);
      }

      uploadedCount += batchFiles.length;
      
      // Atualiza progresso
      if (onProgress) {
        onProgress(uploadedCount, totalFiles);
      }

      // Pequena pausa entre lotes para não sobrecarregar
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[Portfolio] Upload completo: ${uploadedCount} arquivos enviados com sucesso`);

    return {
      success: true,
      photos: allUploadedPhotos,
      message: `${uploadedCount} fotos enviadas com sucesso para o portfólio`
    };

  } catch (error: any) {
    console.error('[Portfolio] Erro durante upload em lotes:', error);
    
    const errorMessage = error.message || 'Erro desconhecido durante o upload';
    if (onError) onError(errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Utilitário para validar arquivos antes do upload
 */
export function validatePortfolioFiles(files: File[]): { valid: boolean; error?: string } {
  if (!files.length) {
    return { valid: false, error: 'Nenhum arquivo selecionado' };
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  for (const file of files) {
    // Verifica tipo de arquivo
    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `Formato não suportado: ${file.name}. Use apenas JPG, PNG ou WebP.` 
      };
    }

    // Verifica tamanho
    if (file.size > PORTFOLIO_UPLOAD_CONFIG.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `Arquivo muito grande: ${file.name}. Máximo ${PORTFOLIO_UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB.` 
      };
    }

    // Verifica se não está vazio
    if (file.size === 0) {
      return { 
        valid: false, 
        error: `Arquivo vazio: ${file.name}` 
      };
    }
  }

  return { valid: true };
}