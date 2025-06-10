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

/**
 * Função para logar informações de uso de memória
 * @param label Identificador do ponto de monitoramento
 * @param details Detalhes adicionais opcional como tamanho de arquivo
 */
function logMemory(label: string, details: string = ''): void {
  if (process.env.DEBUG_MEMORY !== 'true') return;
  
  const memoryUsage = process.memoryUsage();
  console.log(`
=== MEMORY USAGE [${label}] ===
${details ? `Details: ${details}\n` : ''}Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB
Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB
External: ${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB
RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB
Heap Used/Total: ${(memoryUsage.heapUsed / memoryUsage.heapTotal * 100).toFixed(2)}%
================================
  `);
}

// Pasta temporária para arquivos durante o streaming
const TMP_DIR = path.join(process.cwd(), 'tmp');

// Inicializar diretório temporário
fs.ensureDirSync(TMP_DIR);

// Limpeza periódica dos arquivos temporários (a cada 15 minutos)
setInterval(() => {
  try {
    fs.emptyDirSync(TMP_DIR);
    if (process.env.DEBUG_MEMORY === 'true') {
      console.log(`Diretório temporário ${TMP_DIR} limpo com sucesso`);
    }
  } catch (error) {
    console.error('Erro ao limpar diretório temporário:', error);
  }
}, 900000);

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
 * Versão otimizada com melhor gerenciamento de memória
 */
export async function streamDirectToR2(
  filePath: string, 
  fileName: string, 
  contentType: string
): Promise<{ url: string, key: string }> {
  // Variável para armazenar o stream para que possamos fechá-lo em caso de erro
  let fileStream: fs.ReadStream | null = null;
  
  try {
    // Log de memória no início do upload
    logMemory('streamDirectToR2-start', `File: ${fileName}, Type: ${contentType}`);
    
    // Obter o tamanho do arquivo para o log
    let fileSize = 0;
    try {
      const stats = await fs.stat(filePath);
      fileSize = stats.size;
    } catch (statError) {
      console.error(`Erro ao obter tamanho do arquivo ${filePath}:`, statError);
    }
    
    // Criar stream do arquivo com melhor tratamento de erros
    fileStream = fs.createReadStream(filePath);
    
    // Adicionar tratamento de erros ao stream
    fileStream.on('error', (err) => {
      console.error(`Erro no stream de leitura para ${fileName}:`, err);
      if (fileStream && !fileStream.destroyed) {
        fileStream.destroy();
      }
    });
    
    // Log antes de iniciar o upload
    logMemory('streamDirectToR2-before-upload', `File: ${fileName}, Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Preparar comando de upload
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileStream,
      ContentType: contentType
    });
    
    // Fazer upload usando streaming
    await r2Client.send(uploadCommand);
    
    // Log após o upload
    logMemory('streamDirectToR2-after-upload', `File: ${fileName} uploaded successfully`);
    
    // Gerar URL pública de acordo com a configuração do R2
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
    // Log em caso de erro
    logMemory('streamDirectToR2-error', `Error uploading ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Erro ao fazer streaming para R2: ${error instanceof Error ? error.message : String(error)}`);
    
    // Garantir que o stream seja fechado em caso de erro
    if (fileStream && !fileStream.destroyed) {
      fileStream.destroy();
    }
    
    throw error;
  } finally {
    // Garantir limpeza do stream no bloco finally para assegurar que sempre será executado
    if (fileStream && !fileStream.destroyed) {
      fileStream.destroy();
      fileStream = null; // Permitir coleta de lixo
    }
    
    // Sugerir garbage collection se DEBUG_MEMORY estiver ativado
    if (process.env.DEBUG_MEMORY === 'true' && global.gc) {
      try {
        setTimeout(() => {
          global.gc && global.gc();
          logMemory('streamDirectToR2-gc', `Garbage collection sugerida após upload de ${fileName}`);
        }, 100);
      } catch (gcError) {
        console.error('Erro ao sugerir garbage collection:', gcError);
      }
    }
  }
}

/**
 * Processa uma imagem e faz upload para o R2 usando streaming
 * Versão otimizada com melhor gerenciamento de memória
 */
export async function processAndStreamToR2(
  filePath: string,
  fileName: string,
  contentType: string,
  applyWatermark: boolean = true
): Promise<{ url: string, key: string }> {
  let fileBuffer: Buffer | null = null;
  let processedBuffer: Buffer | null = null; 
  let processedFilePath: string | null = null;
  
  try {
    // Log de memória no início do processamento
    logMemory('processAndStreamToR2-start', `File: ${fileName}, Type: ${contentType}`);
    
    // Para tipos de arquivo que não são imagens, use streaming direto
    if (!isValidFileType(contentType)) {
      logMemory('processAndStreamToR2-non-image', `Skipping processing for non-image: ${fileName}`);
      return streamDirectToR2(filePath, fileName, contentType);
    }
    
    // Obter o tamanho do arquivo para o log
    let fileSize = 0;
    try {
      const stats = await fs.stat(filePath);
      fileSize = stats.size;
      logMemory('processAndStreamToR2-file-size', `File: ${fileName}, Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (statError) {
      console.error(`Erro ao obter tamanho do arquivo ${filePath}:`, statError);
    }
    
    // Para imagens, precisamos ler o arquivo, processar e depois fazer upload
    const watermarkStatus = applyWatermark ? "com marca d'água" : "sem marca d'água";
    if (process.env.DEBUG_MEMORY === 'true') {
      console.log(`Processando imagem: ${fileName} (redimensionamento ${watermarkStatus})`);
    }
    
    // Log antes de ler o arquivo para memória
    logMemory('processAndStreamToR2-before-read', `Reading file into memory: ${fileName}`);
    
    // Ler o arquivo e processar a imagem - armazenando referência para liberar mais tarde
    fileBuffer = await fs.readFile(filePath);
    
    // Log após ler o arquivo para memória
    logMemory('processAndStreamToR2-after-read', `File buffer size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Log antes do processamento da imagem
    logMemory('processAndStreamToR2-before-process', `Processing image: ${fileName}`);
    
    // Processar a imagem e armazenar em um buffer separado
    processedBuffer = await processImage(fileBuffer, contentType, applyWatermark);
    
    // Liberar o buffer original assim que tivermos o buffer processado
    fileBuffer = null; // Permitir que o garbage collector libere esse buffer
    
    // Log após processamento da imagem
    if (processedBuffer) {
      logMemory('processAndStreamToR2-after-process', `Processed buffer size: ${(processedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Criar um novo caminho temporário para o arquivo processado
    processedFilePath = path.join(TMP_DIR, `processed-${randomUUID()}`);
    
    // Log antes de escrever o arquivo processado
    logMemory('processAndStreamToR2-before-write', `Writing processed file: ${processedFilePath}`);
    
    // Escrever o buffer processado no arquivo
    if (processedBuffer) {
      await fs.writeFile(processedFilePath, processedBuffer);
      // Liberar o buffer processado após escrever no arquivo
      processedBuffer = null; // Permitir que o garbage collector libere esse buffer
    }
    
    // Log após escrever o arquivo processado
    logMemory('processAndStreamToR2-after-write', `Processed file written to disk`);
    
    try {
      // Fazer upload do arquivo processado
      const result = await streamDirectToR2(processedFilePath, fileName, contentType);
      if (process.env.DEBUG_MEMORY === 'true') {
        console.log(`Imagem processada com sucesso: ${fileName}`);
      }
      
      // Log do final do processamento bem-sucedido
      logMemory('processAndStreamToR2-complete', `Successfully processed and uploaded: ${fileName}`);
      
      return result;
    } finally {
      // Limpar o arquivo processado
      if (processedFilePath) {
        try {
          await fs.unlink(processedFilePath);
          logMemory('processAndStreamToR2-cleanup', `Deleted processed temporary file: ${processedFilePath}`);
          processedFilePath = null; // Limpar referência
        } catch (cleanupError) {
          console.error(`Erro ao limpar arquivo processado: ${cleanupError}`);
        }
      }
    }
  } catch (processingError) {
    // Log em caso de erro de processamento
    logMemory('processAndStreamToR2-error', `Error processing image ${fileName}: ${processingError instanceof Error ? processingError.message : String(processingError)}`);
    console.error(`Erro ao processar imagem ${fileName}:`, processingError);
    
    // Em caso de erro no processamento, tenta fazer o upload do arquivo original
    logMemory('processAndStreamToR2-fallback', `Falling back to direct upload for: ${fileName}`);
    return streamDirectToR2(filePath, fileName, contentType);
  } finally {
    // Garantir liberação completa de memória
    fileBuffer = null;
    processedBuffer = null;
    
    // Sugerir coleta de lixo em ambiente de DEBUG
    if (process.env.DEBUG_MEMORY === 'true' && global.gc) {
      try {
        setTimeout(() => {
          global.gc && global.gc();
          logMemory('processAndStreamToR2-gc', `Garbage collection sugerida após processamento de ${fileName}`);
        }, 100);
      } catch (gcError) {
        console.error('Erro ao sugerir garbage collection:', gcError);
      }
    }
  }
}

/**
 * Middleware para lidar com uploads via streaming
 * Versão otimizada com melhor gerenciamento de memória
 */
export function streamUploadMiddleware(options: StreamUploadOptions = {}) {
  const { applyWatermark = true, maxFileSize = 1000 * 1024 * 1024, fileTypes } = options;
  
  return async (req: Request & { files?: UploadedFile[] }, res: Response, next: NextFunction) => {
    // Log de memória no início do middleware
    logMemory('streamUploadMiddleware-start', `Request URL: ${req.url}`);
    
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
      
      // Counter para estatísticas
      let fileCount = 0;
      let totalSize = 0;
      
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
        fileCount++;
        
        // Log de início do processamento do arquivo
        logMemory('streamUploadMiddleware-file-start', `Processing file ${fileCount}: ${filename} (${mimeType})`);
        
        // Adicionar tratamento de erro ao stream
        fileStream.on('error', (err) => {
          console.error(`Erro no stream de leitura para ${filename}:`, err);
          if (!fileStream.destroyed) {
            fileStream.destroy();
          }
        });
        
        // Verificar tipo de arquivo se houver restrição
        if (fileTypes && !fileTypes.includes(mimeType)) {
          logMemory('streamUploadMiddleware-file-skip', `Skipping file ${filename}: invalid type ${mimeType}`);
          fileStream.resume(); // Ignorar arquivo
          return;
        }
        
        // Gerar nome único para o arquivo
        const uniqueFilename = generateUniqueFileName(filename);
        const tmpFilePath = path.join(TMP_DIR, uniqueFilename);
        
        try {
          // Log antes de criar o stream
          logMemory('streamUploadMiddleware-before-write', `Creating write stream for: ${tmpFilePath}`);
          
          // Criar um write stream para salvar o arquivo temporariamente
          const writeStream = fs.createWriteStream(tmpFilePath);
          
          // Adicionar tratamento de erro também ao writeStream
          writeStream.on('error', (err) => {
            console.error(`Erro no stream de escrita para ${tmpFilePath}:`, err);
            if (!writeStream.destroyed) {
              writeStream.destroy();
            }
          });
          
          // Usar pipeline para garantir que os streams sejam limpos corretamente
          await pipeline(fileStream, writeStream);
          
          // Log após salvar o arquivo
          logMemory('streamUploadMiddleware-after-write', `File written to disk: ${tmpFilePath}`);
          
          // Obter o tamanho do arquivo
          const stats = await fs.stat(tmpFilePath);
          totalSize += stats.size;
          
          // Log do tamanho do arquivo
          logMemory('streamUploadMiddleware-file-stats', 
            `File ${fileCount}: ${filename}, Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB, Total so far: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
          
          // Adicionar informações do arquivo ao req.files - garantir que req.files existe
          if (!req.files) {
            req.files = [];
          }
          
          req.files.push({
            fieldname,
            originalname: filename,
            filename: uniqueFilename,
            mimetype: mimeType,
            path: tmpFilePath,
            size: stats.size
          });
        } catch (error) {
          logMemory('streamUploadMiddleware-file-error', `Error processing file ${filename}: ${error instanceof Error ? error.message : String(error)}`);
          console.error(`Erro ao processar arquivo ${filename}:`, error);
          // Continuar com o próximo arquivo
        }
      });
      
      // Quando todos os campos e arquivos forem processados
      bb.on('finish', () => {
        // Log de conclusão do upload
        logMemory('streamUploadMiddleware-finish', 
          `Upload complete: ${fileCount} files, Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        
        // Sugerir garbage collection após completar o upload
        if (process.env.DEBUG_MEMORY === 'true' && global.gc) {
          try {
            setTimeout(() => {
              global.gc && global.gc();
              logMemory('streamUploadMiddleware-gc', `Garbage collection sugerida após upload completo`);
            }, 100);
          } catch (gcError) {
            console.error('Erro ao sugerir garbage collection:', gcError);
          }
        }
        
        next();
      });
      
      // Adicionar tratamento de erro global ao busboy
      bb.on('error', (err) => {
        console.error(`Erro no processador busboy:`, err);
        logMemory('streamUploadMiddleware-busboy-error', `Busboy error: ${err instanceof Error ? err.message : String(err)}`);
        next(err);
      });
      
      // Iniciar o processamento
      req.pipe(bb);
    } catch (error) {
      logMemory('streamUploadMiddleware-error', `Middleware error: ${error instanceof Error ? error.message : String(error)}`);
      next(error);
    }
  };
}

/**
 * Limpar arquivos temporários após o processamento da requisição
 * Versão otimizada com melhor gerenciamento de memória
 */
export function cleanupTempFiles(req: Request & { files?: UploadedFile[] }, res: Response, next: NextFunction) {
  // Log no início da função
  logMemory('cleanupTempFiles-start', `Request URL: ${req.url}`);
  
  if (req.files && req.files.length > 0) {
    logMemory('cleanupTempFiles-files', `Number of files to track for cleanup: ${req.files.length}`);
  }
  
  // Armazenar o método original end
  const originalEnd = res.end;
  
  // Substituir por uma implementação simplificada para evitar problemas de tipagem
  res.end = function(this: any) {
    // Log antes da limpeza
    logMemory('cleanupTempFiles-before-cleanup', `Response ended, cleaning up temporary files`);
    
    // Executar a limpeza assíncrona
    if (req.files && req.files.length > 0) {
      const totalSize = req.files.reduce((total, file) => total + file.size, 0);
      
      logMemory('cleanupTempFiles-details', 
        `Cleaning up ${req.files.length} files, Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Criar cópia dos caminhos para evitar problemas se req.files for modificado
      const filesToClean = [...req.files];
      
      // Iniciar a limpeza de arquivos em background
      setTimeout(() => {
        Promise.all(filesToClean.map(file => {
          return fs.unlink(file.path)
            .then(() => {
              if (process.env.DEBUG_MEMORY === 'true') {
                console.log(`Arquivo temporário removido: ${file.path}`);
              }
            })
            .catch(err => {
              logMemory('cleanupTempFiles-error', `Error removing file ${file.path}: ${err instanceof Error ? err.message : String(err)}`);
              console.error(`Erro ao remover arquivo temporário ${file.path}:`, err);
            });
        }))
        .then(() => {
          logMemory('cleanupTempFiles-complete', `All temporary files cleaned up successfully`);
          
          // Sugerir garbage collection após limpeza
          if (process.env.DEBUG_MEMORY === 'true' && global.gc) {
            try {
              setTimeout(() => {
                global.gc && global.gc();
                logMemory('cleanupTempFiles-gc', `Garbage collection sugerida após limpeza de arquivos`);
              }, 100);
            } catch (gcError) {
              console.error('Erro ao sugerir garbage collection:', gcError);
            }
          }
        })
        .catch(err => {
          logMemory('cleanupTempFiles-global-error', `Error during cleanup: ${err instanceof Error ? err.message : String(err)}`);
          console.error('Erro ao limpar arquivos temporários:', err);
        });
      }, 0);
      
      // Limpar a referência aos arquivos no request para ajudar o GC
      req.files = [];
    } else {
      logMemory('cleanupTempFiles-no-files', `No files to clean up`);
    }
    
    // Log final após a limpeza
    logMemory('cleanupTempFiles-end', `Response ended, temporary files cleanup initiated`);
    
    // Chamar o método original preservando o contexto e argumentos
    return originalEnd.apply(this, arguments as any);
  };
  
  next();
}