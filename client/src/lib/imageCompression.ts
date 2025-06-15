import imageCompression from 'browser-image-compression';

/**
 * Configurações de compressão otimizadas para fotografias
 * - Largura máxima: 900px (otimizada para visualização web)
 * - Qualidade: 80% (balanço entre qualidade e tamanho)
 * - Formato: preserva o original ou converte para JPEG se necessário
 */
const COMPRESSION_OPTIONS = {
  maxWidthOrHeight: 900,
  useWebWorker: true,
  quality: 0.8,
  initialQuality: 0.8,
  alwaysKeepResolution: false,
  preserveExif: false, // Remove dados EXIF para reduzir tamanho
};

/**
 * Comprime uma imagem mantendo qualidade visual adequada
 * @param file Arquivo de imagem original
 * @returns Promise com arquivo comprimido
 */
export async function compressImage(file: File): Promise<File> {
  try {
    console.log(`[COMPRESSION] Iniciando compressão de ${file.name}`);
    console.log(`[COMPRESSION] Tamanho original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    
    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
    
    console.log(`[COMPRESSION] Tamanho comprimido: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[COMPRESSION] Redução: ${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`);
    
    return compressedFile;
  } catch (error) {
    console.error('[COMPRESSION] Erro na compressão:', error);
    // Em caso de erro, retorna o arquivo original
    console.log('[COMPRESSION] Usando arquivo original devido ao erro');
    return file;
  }
}

/**
 * Valida se o arquivo é uma imagem suportada
 * @param file Arquivo para validação
 * @returns true se for uma imagem válida
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Obtém informações da imagem sem fazer upload
 * @param file Arquivo de imagem
 * @returns Promise com dimensões e informações da imagem
 */
export async function getImageInfo(file: File): Promise<{
  width: number;
  height: number;
  size: number;
  type: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        type: file.type,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem'));
    };
    
    img.src = url;
  });
}

/**
 * Comprime múltiplas imagens em lote
 * @param files Array de arquivos de imagem
 * @param onProgress Callback para acompanhar progresso (opcional)
 * @returns Promise com array de arquivos comprimidos
 */
export async function compressMultipleImages(
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<File[]> {
  const compressedFiles: File[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (isValidImageFile(file)) {
      const compressed = await compressImage(file);
      compressedFiles.push(compressed);
    } else {
      console.warn(`[COMPRESSION] Arquivo ignorado (tipo não suportado): ${file.name}`);
      compressedFiles.push(file); // Mantém arquivo original se não for imagem
    }
    
    // Chama callback de progresso se fornecido
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }
  
  return compressedFiles;
}