/**
 * SISTEMA DE COMPRESSÃO ESPECÍFICO PARA PORTFÓLIOS
 * 
 * Sistema completamente separado da lógica da dashboard.
 * Configurado para alta qualidade fotográfica com redução moderada.
 * 
 * Configurações otimizadas para portfólios:
 * - Qualidade: 95% (vs 90% da dashboard)
 * - Resolução: 1920px (vs 970px da dashboard)  
 * - Redução esperada: 30-50% (vs 80%+ da dashboard)
 */

import imageCompression from 'browser-image-compression';

export interface PortfolioCompressionConfig {
  maxWidthOrHeight: number;
  quality: number;
  initialQuality: number;
  useWebWorker: boolean;
}

export interface PortfolioCompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  originalName: string;
}

// Configuração específica para portfólios - QUALIDADE BALANCEADA
const PORTFOLIO_COMPRESSION_CONFIG: PortfolioCompressionConfig = {
  maxWidthOrHeight: 1920, // Resolução alta para qualidade fotográfica  
  quality: 0.80,          // Qualidade balanceada (80%) para melhor redução
  initialQuality: 0.80,   // Qualidade inicial balanceada
  useWebWorker: true,     // Worker para não bloquear UI
};

// Configurações de upload para portfólios
const PORTFOLIO_BATCH_SIZE = 20;  // Menor que dashboard (30) para processar com mais cuidado
const PORTFOLIO_BATCH_DELAY = 800; // Pausa maior entre lotes para melhor qualidade

/**
 * Comprime uma única imagem usando configurações específicas para portfólios
 */
export async function compressPortfolioImage(
  file: File,
  config: PortfolioCompressionConfig = PORTFOLIO_COMPRESSION_CONFIG
): Promise<PortfolioCompressionResult> {
  const originalSize = file.size;
  
  // Configurações específicas por tipo de arquivo para melhor compressão
  let adjustedConfig: any = { ...config };
  
  if (file.type === 'image/png') {
    // PNGs precisam de configuração mais agressiva
    adjustedConfig = {
      ...config,
      quality: 0.70,                // Qualidade menor para PNGs
      fileType: 'image/jpeg',       // Converter PNG para JPEG
      alwaysKeepResolution: false,
    };
  } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    // JPEGs já são comprimidos, manter configuração balanceada
    adjustedConfig = {
      ...config,
      quality: 0.80,
      fileType: 'image/jpeg',
    };
  }
  
  console.log(`[Portfolio] Processando imagem: ${file.name}`, {
    tipoOriginal: file.type,
    tamanhoOriginal: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
    configuracoes: adjustedConfig
  });

  try {
    const compressedFile = await imageCompression(file, adjustedConfig);
    const compressedSize = compressedFile.size;
    const reductionPercentage = ((originalSize - compressedSize) / originalSize) * 100;

    // Preserva o nome original
    const renamedFile = new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });

    const result: PortfolioCompressionResult = {
      compressedFile: renamedFile,
      originalSize,
      compressedSize,
      reductionPercentage,
      originalName: file.name
    };

    console.log(`[Portfolio] Imagem processada: ${file.name}`, {
      tipoOriginal: file.type,
      tipoFinal: compressedFile.type,
      tamanhoOriginal: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
      tamanhoFinal: `${(compressedSize / 1024 / 1024).toFixed(2)} MB`,
      reducao: `${reductionPercentage.toFixed(1)}%`,
      qualidadeUsada: adjustedConfig.quality,
      nomePreservado: result.originalName
    });

    return result;
  } catch (error) {
    console.error(`[Portfolio] Erro ao processar ${file.name}:`, error);
    throw new Error(`Falha ao processar a imagem: ${file.name}`);
  }
}

/**
 * Comprime múltiplas imagens em lotes para portfólios
 */
export async function compressMultiplePortfolioImages(
  files: File[],
  onProgress?: (processed: number, total: number) => void
): Promise<PortfolioCompressionResult[]> {
  console.log(`[Portfolio] Iniciando compressão de ${files.length} imagens`);
  
  const results: PortfolioCompressionResult[] = [];
  const totalFiles = files.length;
  const totalBatches = Math.ceil(totalFiles / PORTFOLIO_BATCH_SIZE);

  console.log(`[Portfolio] Processando ${totalFiles} imagens em lotes de ${PORTFOLIO_BATCH_SIZE}`);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * PORTFOLIO_BATCH_SIZE;
    const end = Math.min(start + PORTFOLIO_BATCH_SIZE, totalFiles);
    const batch = files.slice(start, end);

    console.log(`[Portfolio] Processando lote ${batchIndex + 1}/${totalBatches} - ${batch.length} imagens`);

    // Processa lote em paralelo
    const batchPromises = batch.map(file => compressPortfolioImage(file));
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);

    // Atualiza progresso
    if (onProgress) {
      onProgress(results.length, totalFiles);
    }

    // Pausa entre lotes (exceto no último)
    if (batchIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, PORTFOLIO_BATCH_DELAY));
    }
  }

  console.log(`[Portfolio] Compressão concluída: ${results.length} imagens`);
  
  return results;
}

/**
 * Função utilitária para formatar tamanho de arquivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calcula estatísticas de compressão para múltiplos arquivos
 */
export function calculateCompressionStats(results: PortfolioCompressionResult[]) {
  const totalOriginalSize = results.reduce((sum, result) => sum + result.originalSize, 0);
  const totalCompressedSize = results.reduce((sum, result) => sum + result.compressedSize, 0);
  const averageReduction = results.reduce((sum, result) => sum + result.reductionPercentage, 0) / results.length;

  return {
    totalFiles: results.length,
    totalOriginalSize,
    totalCompressedSize,
    totalReduction: ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100,
    averageReduction,
    spaceSaved: totalOriginalSize - totalCompressedSize
  };
}