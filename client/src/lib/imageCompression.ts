/**
 * Utilitário para redimensionamento de imagens no front-end
 * Configuração padrão: largura máxima de 900px, qualidade 80%
 */

import imageCompression from 'browser-image-compression';

/**
 * Configurações padrão de compressão/redimensionamento
 * Baseadas no padrão atual do sistema (920px -> ajustado para 900px, qualidade 80%)
 */
const DEFAULT_COMPRESSION_OPTIONS = {
  maxWidthOrHeight: 970, // Largura máxima em pixels
  useWebWorker: true, // Usar web worker para não bloquear a UI
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
    // Mesclar opções padrão com opções customizadas
    const compressionOptions = {
      ...DEFAULT_COMPRESSION_OPTIONS,
      ...options,
    };

    // Log do processamento (para debugging)
    console.log(`[Frontend] Processando imagem: ${file.name}`, {
      tamanhoOriginal: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      configuracoes: compressionOptions,
    });

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
    // Em caso de erro, retornar o arquivo original
    console.log(`[Frontend] Retornando arquivo original devido ao erro`);
    return file;
  }
}

/**
 * Processa múltiplas imagens em paralelo
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
  
  console.log(`[Frontend] Iniciando processamento de ${files.length} imagens`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      console.log(`[Frontend] Pulando arquivo não-imagem: ${file.name}`);
      results.push(file);
      continue;
    }
    
    try {
      const compressedFile = await compressImage(file, options);
      results.push(compressedFile);
      
      // Callback de progresso
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error(`[Frontend] Erro ao processar ${file.name}:`, error);
      // Em caso de erro, usar arquivo original
      results.push(file);
    }
  }
  
  console.log(`[Frontend] Processamento concluído: ${results.length} arquivos`);
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