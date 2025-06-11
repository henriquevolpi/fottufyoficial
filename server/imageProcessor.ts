import sharp, { OverlayOptions } from 'sharp';

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

// Constantes para processamento
const TARGET_WIDTH = 920; // Largura alvo para o redimensionamento
const WATERMARK_OPACITY = 0.25; // 25% de opacidade
const WATERMARK_TEXT = 'fottufy (não copie)'; // Texto para a marca d'água
const WATERMARK_FONT_SIZE = 36; // Tamanho da fonte em pixels

// Cache otimizado para a marca d'água com limite de 5 itens
// Rastreia uso e remove automaticamente itens menos usados
const watermarkCache = new Map<string, Buffer>();
const watermarkUsageTracker = new Map<string, { count: number, lastUsed: number }>();
const MAX_WATERMARK_CACHE_SIZE = 5;

// Desativar o cache interno do Sharp para evitar acúmulo de memória
sharp.cache(false);

// Função para forçar garbage collection se disponível
function forceGarbageCollection(): void {
  if (global.gc) {
    try {
      global.gc();
      if (process.env.DEBUG_MEMORY === 'true') {
        console.log('[GC] Garbage collection executado manualmente');
      }
    } catch (error) {
      console.warn('[GC] Erro ao executar garbage collection:', error);
    }
  }
}

// Timer para limpeza automática de cache de watermark a cada 5 minutos
setInterval(() => {
  if (watermarkCache.size > 0) {
    watermarkCache.clear();
    watermarkUsageTracker.clear();
    if (process.env.DEBUG_MEMORY === 'true') {
      console.log('[CACHE] Cache de watermark limpo automaticamente');
    }
    forceGarbageCollection();
  }
}, 5 * 60 * 1000); // 5 minutos

/**
 * Gerencia o cache de watermark com limite de tamanho
 * Remove o item menos usado quando excede o limite
 */
function manageWatermarkCache(key: string, buffer?: Buffer): Buffer | undefined {
  const now = Date.now();
  
  if (buffer) {
    // Adicionando novo item ao cache
    
    // Se o cache está cheio, remover o item menos usado
    if (watermarkCache.size >= MAX_WATERMARK_CACHE_SIZE) {
      let leastUsedKey: string | null = null;
      let lowestScore = Infinity;
      
      // Encontrar o item com menor score (menos usado + mais antigo)
      watermarkUsageTracker.forEach((usage, cacheKey) => {
        // Score baseado em: uso frequente (peso 3) + recência (peso 1)
        const score = (usage.count * 3) + (now - usage.lastUsed) / 1000000;
        
        if (score < lowestScore) {
          lowestScore = score;
          leastUsedKey = cacheKey;
        }
      });
      
      // Remover o item menos usado
      if (leastUsedKey) {
        watermarkCache.delete(leastUsedKey);
        watermarkUsageTracker.delete(leastUsedKey);
        
        if (process.env.DEBUG_MEMORY === 'true') {
          console.log(`[CACHE] Watermark cache: removido item menos usado '${leastUsedKey}' (tamanho atual: ${watermarkCache.size}/${MAX_WATERMARK_CACHE_SIZE})`);
        }
      }
    }
    
    // Adicionar o novo item
    watermarkCache.set(key, buffer);
    watermarkUsageTracker.set(key, { count: 1, lastUsed: now });
    
    if (process.env.DEBUG_MEMORY === 'true') {
      console.log(`[CACHE] Watermark cache: adicionado '${key}' (tamanho: ${watermarkCache.size}/${MAX_WATERMARK_CACHE_SIZE})`);
    }
    
    return buffer;
  } else {
    // Recuperando item do cache
    const cachedBuffer = watermarkCache.get(key);
    
    if (cachedBuffer && watermarkUsageTracker.has(key)) {
      // Atualizar estatísticas de uso
      const usage = watermarkUsageTracker.get(key)!;
      usage.count++;
      usage.lastUsed = now;
      
      if (process.env.DEBUG_MEMORY === 'true') {
        console.log(`[CACHE] Watermark cache: recuperado '${key}' (uso: ${usage.count}x)`);
      }
    }
    
    return cachedBuffer;
  }
}

/**
 * PROCESSAMENTO DE IMAGEM TEMPORARIAMENTE DESATIVADO
 * 
 * O redimensionamento foi movido para o front-end para testes.
 * Esta função agora apenas retorna o buffer original sem processamento.
 * 
 * Para reativar o processamento completo no back-end:
 * 1. Descomente o código abaixo (entre os comentários INÍCIO/FIM CÓDIGO ORIGINAL)
 * 2. Comente a linha de retorno direto do buffer
 * 3. Reinicie o servidor
 * 
 * Função original: Redimensiona para 920px de largura e aplica marca d'água com texto repetido
 * Versão otimizada com melhor gerenciamento de memória
 * @param buffer Buffer da imagem original
 * @param mimetype Tipo MIME da imagem
 * @param applyWatermark Flag que indica se deve aplicar marca d'água (padrão: true)
 */
export async function processImage(
  buffer: Buffer, 
  mimetype: string,
  applyWatermark: boolean = false // DESATIVADO: marca d'água movida para frontend
): Promise<Buffer> {
  // ===== PROCESSAMENTO TEMPORARIAMENTE DESATIVADO =====
  // Retorna o buffer original sem processamento (redimensionamento feito no front-end)
  console.log(`[Backend] Processamento de imagem DESATIVADO - retornando arquivo original: ${mimetype}, Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  return buffer;
  // ===== FIM DA DESATIVAÇÃO =====
  
  /* ===== INÍCIO CÓDIGO ORIGINAL (COMENTADO PARA REATIVAÇÃO FUTURA) =====
  
  // Desativar o cache do Sharp para esta operação específica
  sharp.cache(false);
  
  try {
    // Log do início do processamento da imagem e o tamanho do buffer original
    logMemory('processImage-start', `Starting image processing: ${mimetype}, Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB, Watermark: ${applyWatermark}`);

    // Primeiro, redimensionar a imagem
    let resizedBuffer: Buffer;
    try {
      logMemory('processImage-before-resize', `Original buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
      resizedBuffer = await resizeImage(buffer);
      
      // Liberando referência ao buffer original o mais cedo possível
      if (resizedBuffer !== buffer) {
        // Se o buffer foi realmente redimensionado, podemos liberar o original
        buffer = null as any; // Permitir coleta de lixo do buffer original
      }
      
      logMemory('processImage-after-resize', `Resized buffer size: ${(resizedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    } catch (resizeError) {
      logMemory('processImage-resize-error', `Error resizing image: ${resizeError instanceof Error ? resizeError.message : String(resizeError)}`);
      console.error('Erro ao redimensionar imagem:', resizeError);
      // Se falhar no redimensionamento, use o buffer original
      resizedBuffer = buffer;
    }

    try {
      // Log antes de criar o objeto sharp
      logMemory('processImage-before-sharp', `Creating Sharp instance with buffer size: ${(resizedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      
      // Obter a imagem redimensionada para processamento usando o recurso sequencial
      // Isso evita que o objeto Sharp mantenha referências desnecessárias em memória
      const processedImage = sharp(resizedBuffer, { 
        sequentialRead: true, // Leitura sequencial para economizar memória
        limitInputPixels: 50000000 // Limita o tamanho das imagens processadas (proteção)
      });
      
      // Log antes de obter metadados
      logMemory('processImage-before-metadata', `Getting image metadata`);
      
      // Obter metadados da imagem redimensionada para determinar dimensões
      const metadata = await processedImage.metadata();
      
      // Log após obter metadados
      logMemory('processImage-after-metadata', `Image dimensions: ${metadata.width}x${metadata.height}, Format: ${metadata.format}`);
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Não foi possível obter as dimensões da imagem');
      }

      // Inicializar a imagem que será processada
      let finalImage = processedImage;
      
      // Aplicar marca d'água apenas se o parâmetro applyWatermark for true
      if (applyWatermark) {
        if (process.env.DEBUG_MEMORY === 'true') {
          console.log(`Aplicando marca d'água à imagem`);
        }
        
        // Log antes de criar a marca d'água
        logMemory('processImage-before-watermark', `Creating watermark pattern for image ${metadata.width}x${metadata.height}`);
        
        // Usar a dimensão arredondada para a chave de cache (evitar cache infinito)
        const watermarkCacheKey = `${Math.ceil(metadata.width/100)*100}x${Math.ceil(metadata.height/100)*100}`;
        
        // Verificar se já temos uma marca d'água em cache para essas dimensões usando o novo sistema
        let watermarkPattern: Buffer | undefined = manageWatermarkCache(watermarkCacheKey);
        
        if (watermarkPattern) {
          logMemory('processImage-watermark-from-cache', `Retrieved watermark from cache for ${watermarkCacheKey}`);
        } else {
          // Criar padrão de marca d'água repetitiva diretamente com texto
          watermarkPattern = await createTextWatermarkPattern(
            metadata.width ?? 1000,
            metadata.height ?? 800
          );
          
          // Armazenar no cache usando o novo sistema otimizado
          manageWatermarkCache(watermarkCacheKey, watermarkPattern);
        }
        
        // Log após criar/obter a marca d'água e antes de aplicá-la
        logMemory('processImage-after-watermark-creation', `Watermark buffer size: ${(watermarkPattern.length / 1024 / 1024).toFixed(2)} MB`);
        
        // Aplicar marca d'água
        finalImage = processedImage.composite([
          { input: watermarkPattern, blend: 'over' }
        ]);
        
        // Log após aplicar a marca d'água
        logMemory('processImage-after-watermark-apply', `Watermark applied`);
      } else {
        if (process.env.DEBUG_MEMORY === 'true') {
          console.log(`Pulando aplicação de marca d'água conforme solicitado`);
        }
      }
      
      // Log antes de definir o formato de saída
      logMemory('processImage-before-format', `Setting output format based on mimetype: ${mimetype}`);
      
      // Definir formato de saída baseado no mimetype original com configurações otimizadas
      if (mimetype === 'image/png') {
        finalImage = finalImage.png({ compressionLevel: 6 }); // Equilíbrio entre tamanho e performance
      } else if (mimetype === 'image/webp') {
        finalImage = finalImage.webp({ quality: 80 }); // Boa compressão para webp
      } else if (mimetype === 'image/gif') {
        finalImage = finalImage.gif();
      } else {
        // Padrão para JPEG com boa qualidade
        finalImage = finalImage.jpeg({ quality: 80, mozjpeg: true }); // mozjpeg para melhor compressão
      }
      
      // Log antes de converter para buffer
      logMemory('processImage-before-toBuffer', `Converting to final buffer`);
      
      // Converter para buffer final e liberar recursos do Sharp
      const finalBuffer = await finalImage.toBuffer();
      
      // Log do buffer final
      logMemory('processImage-complete', `Final buffer size: ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      
      // Liberar explicitamente recursos e buffers intermediários
      try {
        if (processedImage && typeof processedImage.destroy === 'function') {
          processedImage.destroy();
        }
        if (finalImage && typeof finalImage.destroy === 'function') {
          finalImage.destroy();
        }
      } catch (destroyError) {
        // Ignorar erros de destruição
      }
      
      // Limpar cache do Sharp após processamento
      sharp.cache(false);
      
      // Limpar referências de buffers intermediários
      resizedBuffer = null as any;
      
      return finalBuffer;
    } catch (watermarkError) {
      // Log do erro na aplicação da marca d'água
      logMemory('processImage-watermark-error', `Error applying watermark: ${watermarkError instanceof Error ? watermarkError.message : String(watermarkError)}`);
      console.error('Erro ao aplicar marca d\'água:', watermarkError);
      // Se falhar na aplicação da marca d'água, retorna pelo menos a imagem redimensionada
      return resizedBuffer;
    }
  } catch (error) {
    // Log do erro geral no processamento
    logMemory('processImage-general-error', `General error processing image: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Erro ao processar imagem:', error);
    // Falha geral - retornar buffer original em último caso
    return buffer;
  }
  
  ===== FIM CÓDIGO ORIGINAL (COMENTADO PARA REATIVAÇÃO FUTURA) ===== */
}

/**
 * ===== FUNÇÕES AUXILIARES TEMPORARIAMENTE DESATIVADAS =====
 * 
 * As funções abaixo foram comentadas temporariamente:
 * - resizeImage(): Redimensionamento de imagens (agora feito no front-end)
 * - createTextWatermarkPattern(): Criação de marca d'água (desativada)
 * 
 * Para reativar o processamento completo no back-end:
 * 1. Descomente todo o código entre os comentários "INÍCIO CÓDIGO ORIGINAL" e "FIM CÓDIGO ORIGINAL"
 * 2. Comente a linha de retorno direto do buffer na função processImage()
 * 3. Reinicie o servidor
 * 
 * ===== FIM DAS FUNÇÕES AUXILIARES DESATIVADAS =====
 */