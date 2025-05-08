/**
 * Sistema de streaming para uploads eficientes
 * 
 * Este módulo substitui o upload baseado em buffer por uma solução de streaming
 * que consome menos memória ao processar grandes arquivos.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import busboy from 'busboy';
import { Request, Response, NextFunction } from 'express';
import { processImage } from './imageProcessor';
import { r2Client, BUCKET_NAME, isValidFileType, isValidFileSize, generateUniqueFileName } from './r2';
import { pipeline } from 'stream/promises';

// Pasta temporária para arquivos durante o streaming
const TMP_DIR = path.join(process.cwd(), 'tmp');

// Inicializar diretório temporário
fs.ensureDirSync(TMP_DIR);

// Limpeza periódica dos arquivos temporários (a cada 1 hora)
setInterval(() => {
  try {
    fs.emptyDirSync(TMP_DIR);
    if (process.env.DEBUG_MEMORY === 'true') {
      console.log(`Diretório temporário ${TMP_DIR} limpo com sucesso`);
    }
  } catch (error) {
    console.error('Erro ao limpar diretório temporário:', error);
  }
}, 3600000);

interface UploadedFile {
  fieldname: string;
  originalname: string;
  filename: string;
  mimetype: string;
  path: string;
  size: number;
}

interface StreamUploadOptions {
  applyWatermark?: boolean;
  maxFileSize?: number;
  fileTypes?: string[];
}

/**
 * Faz streaming direto de um arquivo para o R2 sem processamento
 */
export async function streamDirectToR2(
  filePath: string, 
  fileName: string, 
  contentType: string
): Promise<{ url: string, key: string }> {
  try {
    // Criar stream do arquivo
    const fileStream = fs.createReadStream(filePath);
    
    // Preparar comando de upload
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileStream,
      ContentType: contentType
    });
    
    // Fazer upload usando streaming
    await r2Client.send(uploadCommand);
    
    // Gerar URL pública de acordo com a configuração do R2
    // Esta parte permanece consistente com a implementação original
    let url;
    if (process.env.R2_PUBLIC_URL) {
      // Se houver uma URL pública configurada (como um domínio personalizado)
      url = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    } else {
      // Use a URL padrão do R2
      url = `https://${BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/${fileName}`;
    }
    
    return { url, key: fileName };
  } catch (error) {
    console.error(`Erro ao fazer streaming para R2: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Processa uma imagem e faz upload para o R2 usando streaming
 */
export async function processAndStreamToR2(
  filePath: string,
  fileName: string,
  contentType: string,
  applyWatermark: boolean = true
): Promise<{ url: string, key: string }> {
  try {
    // Para tipos de arquivo que não são imagens, use streaming direto
    if (!isValidFileType(contentType)) {
      return streamDirectToR2(filePath, fileName, contentType);
    }
    
    // Para imagens, precisamos ler o arquivo, processar e depois fazer upload
    const watermarkStatus = applyWatermark ? "com marca d'água" : "sem marca d'água";
    if (process.env.DEBUG_MEMORY === 'true') {
      console.log(`Processando imagem: ${fileName} (redimensionamento ${watermarkStatus})`);
    }
    
    // Ler o arquivo e processar a imagem (isso ainda usa memória, mas é inevitável para o processamento)
    const fileBuffer = await fs.readFile(filePath);
    const processedBuffer = await processImage(fileBuffer, contentType, applyWatermark);
    
    // Criar um novo caminho temporário para o arquivo processado
    const processedFilePath = path.join(TMP_DIR, `processed-${randomUUID()}`);
    await fs.writeFile(processedFilePath, processedBuffer);
    
    try {
      // Fazer upload do arquivo processado
      const result = await streamDirectToR2(processedFilePath, fileName, contentType);
      if (process.env.DEBUG_MEMORY === 'true') {
        console.log(`Imagem processada com sucesso: ${fileName}`);
      }
      return result;
    } finally {
      // Limpar o arquivo processado
      try {
        await fs.unlink(processedFilePath);
      } catch (cleanupError) {
        console.error(`Erro ao limpar arquivo processado: ${cleanupError}`);
      }
    }
  } catch (processingError) {
    console.error(`Erro ao processar imagem ${fileName}:`, processingError);
    // Em caso de erro no processamento, tenta fazer o upload do arquivo original
    return streamDirectToR2(filePath, fileName, contentType);
  }
}

/**
 * Middleware para lidar com uploads via streaming
 */
export function streamUploadMiddleware(options: StreamUploadOptions = {}) {
  const { applyWatermark = true, maxFileSize = 1000 * 1024 * 1024, fileTypes } = options;
  
  return async (req: Request & { files?: UploadedFile[] }, res: Response, next: NextFunction) => {
    // Verificar se é uma requisição multipart
    if (!req.is('multipart/form-data')) {
      return next();
    }
    
    // Inicializar array de arquivos
    req.files = [];
    
    try {
      const bb = busboy({ 
        headers: req.headers,
        limits: {
          fileSize: maxFileSize
        }
      });
      
      // Processar campos do formulário
      bb.on('field', (fieldname, val) => {
        if (!req.body) {
          req.body = {};
        }
        
        // Adicionar campo ao body
        req.body[fieldname] = val;
      });
      
      // Processar arquivos
      bb.on('file', async (fieldname, fileStream, fileInfo) => {
        const { filename, encoding, mimeType } = fileInfo;
        
        // Verificar tipo de arquivo se houver restrição
        if (fileTypes && !fileTypes.includes(mimeType)) {
          fileStream.resume(); // Ignorar arquivo
          return;
        }
        
        // Gerar nome único para o arquivo
        const uniqueFilename = generateUniqueFileName(filename);
        const tmpFilePath = path.join(TMP_DIR, uniqueFilename);
        
        try {
          // Criar um write stream para salvar o arquivo temporariamente
          const writeStream = fs.createWriteStream(tmpFilePath);
          
          // Usar pipeline para garantir que os streams sejam limpos corretamente
          await pipeline(fileStream, writeStream);
          
          // Obter o tamanho do arquivo
          const stats = await fs.stat(tmpFilePath);
          
          // Adicionar informações do arquivo ao req.files
          req.files.push({
            fieldname,
            originalname: filename,
            filename: uniqueFilename,
            mimetype: mimeType,
            path: tmpFilePath,
            size: stats.size
          });
        } catch (error) {
          console.error(`Erro ao processar arquivo ${filename}:`, error);
          // Continuar com o próximo arquivo
        }
      });
      
      // Quando todos os campos e arquivos forem processados
      bb.on('finish', () => {
        next();
      });
      
      // Iniciar o processamento
      req.pipe(bb);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Limpar arquivos temporários após o processamento da requisição
 */
export function cleanupTempFiles(req: Request & { files?: UploadedFile[] }, res: Response, next: NextFunction) {
  // Armazenar o método original end
  const originalEnd = res.end;
  
  // Sobrescrever o método end
  res.end = function(...args: any[]) {
    // Executar a limpeza assíncrona
    if (req.files && req.files.length > 0) {
      Promise.all(req.files.map(file => {
        return fs.unlink(file.path)
          .catch(err => console.error(`Erro ao remover arquivo temporário ${file.path}:`, err));
      })).catch(err => console.error('Erro ao limpar arquivos temporários:', err));
    }
    
    // Chamar o método original
    return originalEnd.apply(this, args);
  };
  
  next();
}