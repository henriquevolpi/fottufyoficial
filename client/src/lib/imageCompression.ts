import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxWidthOrHeight: 900,
  useWebWorker: true,
  quality: 0.8,
  initialQuality: 0.8,
  alwaysKeepResolution: false,
  preserveExif: false,
};

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
    console.log('[COMPRESSION] Usando arquivo original devido ao erro');
    return file;
  }
}

export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
}

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
      compressedFiles.push(file);
    }

    // 🔥 Aqui está a correção segura
    if (typeof onProgress === 'function') {
      onProgress(i + 1, files.length);
    }
  }

  return compressedFiles;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}