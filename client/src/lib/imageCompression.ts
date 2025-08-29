/**
 * Utilitário para redimensionamento de imagens no front-end
 * Configuração padrão: largura máxima de 970px, qualidade 90%
 * Inclui gerenciamento automático de memória para uploads grandes
 */

import imageCompression from 'browser-image-compression';

/**
 * Função utilitária para limpeza de recursos de canvas
 * Usado internamente pela biblioteca de compressão quando necessário
 */
function cleanupCanvas(canvas: HTMLCanvasElement | null): void {
  if (canvas) {
    try {
      canvas.width = 0;
      canvas.height = 0;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      // Ignorar erros de limpeza
    }
  }
}

/**
 * Função para sugerir garbage collection se disponível
 * Usado para otimizar memória durante processamento de lotes grandes
 */
function suggestGarbageCollection(): void {
  if (typeof window !== 'undefined' && (window as any).gc) {
    try {
      setTimeout(() => (window as any).gc(), 100);
    } catch (e) {
      // Ignorar se gc não estiver disponível
    }
  }
  
  // ✅ SEGURANÇA: Força cleanup de recursos não utilizados se possível
  if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
    const memInfo = (window.performance as any).memory;
    // Se uso de heap > 80%, sugerir cleanup mais agressivo
    if (memInfo.usedJSHeapSize > memInfo.totalJSHeapSize * 0.8) {
      // Cleanup mais agressivo com setTimeout para não bloquear UI
      setTimeout(() => {
        if ((window as any).gc) {
          try {
            (window as any).gc();
          } catch (e) {
            // Ignorar
          }
        }
      }, 500);
    }
  }
}

/**
 * Configurações padrão de compressão/redimensionamento
 * Baseadas no padrão atual do sistema (920px -> ajustado para 900px, qualidade 80%)
 */
const DEFAULT_COMPRESSION_OPTIONS = {
  maxWidthOrHeight: 970, // Largura máxima em pixels
  useWebWorker: typeof Worker !== 'undefined', // Verificar se Web Worker está disponível
  quality: 0.9, // Qualidade 90%
  fileType: undefined as string | undefined, // Manter o tipo original do arquivo
  initialQuality: 0.9, // Qualidade inicial
};

/**
 * Redimensiona e comprime uma imagem usando as configurações padrão do sistema
 * @param file Arquivo de imagem original
 * @param options Opções customizadas (opcional)
 * @returns Promise com o arquivo processado
 */
export async function compressImage(
  file: File, 
  options: Partial<typeof DEFAULT_COMPRESSION_OPTIONS> = {}
): Promise<File> {
  try {
    // 🛡️ VERIFICAÇÃO CRÍTICA DE MEMÓRIA ANTES DE PROCESSAR
    const memInfo = (window.performance as any)?.memory;
    if (memInfo && memInfo.usedJSHeapSize > memInfo.totalJSHeapSize * 0.85) {
      console.warn(`🚨 Memory pressure detected before processing ${file.name} - ${((memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100).toFixed(1)}% used`);
      // Força limpeza antes de continuar
      if ((window as any).gc) {
        try {
          (window as any).gc();
          // Espera um pouco para limpeza completar
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {}
      }
    }
    
    // Mesclar opções padrão com opções customizadas
    const compressionOptions = {
      ...DEFAULT_COMPRESSION_OPTIONS,
      ...options,
    };

    // Log do processamento (para debugging)
    console.log(`[Frontend] Processando imagem: ${file.name}`, {
      tamanhoOriginal: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      configuracoes: compressionOptions,
      memoryStatus: memInfo ? `${((memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100).toFixed(1)}%` : 'unknown'
    });

    // 🛡️ YIELD THREAD: Micro pausa antes de operação pesada
    await new Promise(resolve => setTimeout(resolve, 5));

    // Comprimir/redimensionar a imagem
    const compressedBlob = await imageCompression(file, compressionOptions);

    // Criar um novo File object preservando o nome original e tipo
    const compressedFile = new File([compressedBlob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    });

    // Log do resultado
    console.log(`[Frontend] Imagem processada: ${file.name}`, {
      tamanhoOriginal: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      tamanhoFinal: `${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`,
      reducao: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`,
      nomePreservado: compressedFile.name,
    });

    return compressedFile;
  } catch (error) {
    console.error(`[Frontend] Erro ao processar imagem ${file.name}:`, error);
    
    // Verificar se é erro de memória ou tamanho
    const errorMsg = error instanceof Error ? error.message.toLowerCase() : '';
    if (errorMsg.includes('memory') || errorMsg.includes('heap') || errorMsg.includes('worker')) {
      console.warn(`[Frontend] Erro de memória detectado para ${file.name} - tentando sem Web Worker`);
      
      // Tentar novamente sem Web Worker se o erro foi relacionado à memória
      try {
        const fallbackOptions = {
          ...DEFAULT_COMPRESSION_OPTIONS,
          useWebWorker: false,
          quality: 0.8, // Reduzir qualidade para economizar memória
        };
        
        const fallbackBlob = await imageCompression(file, fallbackOptions);
        const fallbackFile = new File([fallbackBlob], file.name, {
          type: file.type,
          lastModified: Date.now(),
        });
        
        console.log(`[Frontend] Fallback bem-sucedido para ${file.name}`);
        return fallbackFile;
      } catch (fallbackError) {
        console.error(`[Frontend] Fallback também falhou para ${file.name}:`, fallbackError);
      }
    }
    
    // Em último caso, retornar o arquivo original
    console.log(`[Frontend] Retornando arquivo original devido ao erro: ${file.name}`);
    return file;
  }
}

/**
 * Processa múltiplas imagens em lotes pequenos para evitar travamento do navegador
 * @param files Array de arquivos de imagem
 * @param options Opções de compressão (opcional)
 * @param onProgress Callback de progresso (opcional)
 * @returns Promise com array de arquivos processados
 */
export async function compressMultipleImages(
  files: File[],
  options: Partial<typeof DEFAULT_COMPRESSION_OPTIONS> = {},
  onProgress?: (processed: number, total: number) => void
): Promise<File[]> {
  const results: File[] = [];
  const batchSize = 30; // Processar 30 imagens por lote
  
  console.log(`[Frontend] Iniciando processamento de ${files.length} imagens em lotes de ${batchSize}`);
  
  // Processar em lotes pequenos
  for (let batchStart = 0; batchStart < files.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, files.length);
    const batch = files.slice(batchStart, batchEnd);
    
    console.log(`[Frontend] Processando lote ${Math.floor(batchStart/batchSize) + 1}/${Math.ceil(files.length/batchSize)} - ${batch.length} imagens`);
    
    // Processar este lote
    for (let i = 0; i < batch.length; i++) {
      const file = batch[i];
      const globalIndex = batchStart + i;
      
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        console.log(`[Frontend] Pulando arquivo não-imagem: ${file.name}`);
        results.push(file);
        
        // Callback de progresso
        if (onProgress) {
          onProgress(globalIndex + 1, files.length);
        }
        continue;
      }
      
      try {
        const compressedFile = await compressImage(file, options);
        results.push(compressedFile);
        
        // Callback de progresso
        if (onProgress) {
          onProgress(globalIndex + 1, files.length);
        }
      } catch (error) {
        console.error(`[Frontend] Erro ao processar ${file.name}:`, error);
        // Em caso de erro, usar arquivo original
        results.push(file);
        
        // Callback de progresso mesmo com erro
        if (onProgress) {
          onProgress(globalIndex + 1, files.length);
        }
      }
    }
    
    // Limpeza de memória entre lotes para evitar acúmulo de recursos
    if (batchEnd < files.length) {
      console.log(`[Frontend] Pausando 500ms entre lotes para liberar memória...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Sugerir garbage collection usando função utilitária
      suggestGarbageCollection();
      console.log(`[Frontend] Garbage collection sugerida entre lotes`);
    }
  }
  
  console.log(`[Frontend] Processamento concluído: ${results.length} arquivos processados em ${Math.ceil(files.length/batchSize)} lotes`);
  return results;
}

/**
 * Verifica se um arquivo é uma imagem válida
 * @param file Arquivo a ser verificado
 * @returns boolean indicando se é uma imagem
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Formata o tamanho do arquivo em uma string legível
 * @param bytes Tamanho em bytes
 * @returns String formatada (ex: "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}