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

// Cache para a marca d'água - evita recriar para imagens de tamanho semelhante
const watermarkCache = new Map<string, Buffer>();

// Desativar o cache interno do Sharp para evitar acúmulo de memória
sharp.cache(false);

/**
 * Função principal para processar a imagem
 * Redimensiona para 920px de largura e aplica marca d'água com texto repetido
 * Versão otimizada com melhor gerenciamento de memória
 * @param buffer Buffer da imagem original
 * @param mimetype Tipo MIME da imagem
 * @param applyWatermark Flag que indica se deve aplicar marca d'água (padrão: true)
 */
export async function processImage(
  buffer: Buffer, 
  mimetype: string,
  applyWatermark: boolean = true
): Promise<Buffer> {
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
        
        // Verificar se já temos uma marca d'água em cache para essas dimensões
        let watermarkPattern: Buffer;
        if (watermarkCache.has(watermarkCacheKey)) {
          watermarkPattern = watermarkCache.get(watermarkCacheKey)!;
          logMemory('processImage-watermark-from-cache', `Retrieved watermark from cache for ${watermarkCacheKey}`);
        } else {
          // Criar padrão de marca d'água repetitiva diretamente com texto
          watermarkPattern = await createTextWatermarkPattern(
            metadata.width ?? 1000,
            metadata.height ?? 800
          );
          
          // Armazenar no cache para reutilização
          watermarkCache.set(watermarkCacheKey, watermarkPattern);
          
          // Limitar o tamanho do cache para evitar crescimento excessivo
          if (watermarkCache.size > 10) {
            // Remover a primeira entrada se o cache ficar muito grande
            const keysIterator = watermarkCache.keys();
            const firstKey = keysIterator.next().value;
            if (firstKey) {
              watermarkCache.delete(firstKey);
              logMemory('processImage-watermark-cache-cleanup', `Removed oldest watermark from cache: ${firstKey}`);
            }
          }
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
}

/**
 * Função auxiliar para redimensionar a imagem para 920px de largura
 * Versão otimizada com melhor gerenciamento de memória
 * Mantém a proporção original e só redimensiona se for maior que o alvo
 */
async function resizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    // Log no início do redimensionamento
    logMemory('resizeImage-start', `Starting resize operation with buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Desativar o cache na instância do sharp
    sharp.cache(false);
    
    // Criar instância do sharp com configurações otimizadas para economia de memória
    const image = sharp(buffer, { 
      sequentialRead: true,
      limitInputPixels: 50000000 // Limita entradas muito grandes para evitar ataques de alocação de memória
    });
    
    // Log antes de obter metadados
    logMemory('resizeImage-before-metadata', `Getting image metadata for resize decision`);
    
    const metadata = await image.metadata();
    
    // Log dos metadados
    logMemory('resizeImage-metadata', 
      `Image metadata: ${metadata.width}x${metadata.height}, Format: ${metadata.format}, Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Redimensionar apenas se for maior que a largura alvo
    if (metadata.width && metadata.width > TARGET_WIDTH) {
      // Log antes do redimensionamento
      logMemory('resizeImage-resizing', 
        `Image needs resizing from ${metadata.width}px to ${TARGET_WIDTH}px width`);
      
      // Configurar operação de redimensionamento com opções para melhor desempenho
      const resizedBuffer = await image
        .resize({
          width: TARGET_WIDTH,
          fit: 'inside',
          withoutEnlargement: true,
          fastShrinkOnLoad: true // Usa algoritmo mais rápido e eficiente para redução
        })
        .toBuffer({ resolveWithObject: false }); // Não precisamos do objeto adicional, apenas do buffer
      
      // Log após o redimensionamento
      logMemory('resizeImage-complete', 
        `Resize complete: Original: ${(buffer.length / 1024 / 1024).toFixed(2)} MB → Resized: ${(resizedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      
      // Sugerir coleta de lixo em modo debug
      if (process.env.DEBUG_MEMORY === 'true' && global.gc) {
        try {
          setTimeout(() => {
            global.gc && global.gc();
            logMemory('resizeImage-gc', `Garbage collection sugerida após redimensionamento`);
          }, 100);
        } catch (gcError) {
          console.error('Erro ao sugerir garbage collection:', gcError);
        }
      }
      
      return resizedBuffer;
    }
    
    // Log quando não precisar redimensionar
    logMemory('resizeImage-no-resize-needed', 
      `No resize needed: Image width ${metadata.width}px is already ≤ ${TARGET_WIDTH}px`);
    
    // Se não precisar redimensionar, retornar o buffer original
    return buffer;
  } catch (error) {
    // Log de erro no redimensionamento
    logMemory('resizeImage-error', 
      `Error during resize: ${error instanceof Error ? error.message : String(error)}`);
    
    console.error('Erro ao redimensionar imagem:', error);
    return buffer;
  } finally {
    // Liberar a instância do Sharp para ajudar o GC
    sharp.cache(false);
  }
}

/**
 * Cria um padrão de marca d'água com texto repetido
 * Versão otimizada com melhor gerenciamento de memória
 * Gera uma grade de textos "fottufy (não copie)" com opacidade 25%
 */
async function createTextWatermarkPattern(width: number, height: number): Promise<Buffer> {
  // Log no início da criação da marca d'água
  logMemory('createWatermark-start', `Creating watermark pattern for dimensions: ${width}x${height}`);
  
  // Garantir dimensões seguras e limitadas
  const safeWidth = Math.min(Math.floor(width), 5000); // Limita tamanho máximo
  const safeHeight = Math.min(Math.floor(height), 5000);
  
  // Verificar se temos essa dimensão em cache
  const cacheKey = `${Math.ceil(safeWidth/100)*100}x${Math.ceil(safeHeight/100)*100}`;
  
  if (watermarkCache.has(cacheKey)) {
    const cachedBuffer = watermarkCache.get(cacheKey)!;
    logMemory('createWatermark-from-cache', `Retrieved watermark from cache for dimensions ${cacheKey}`);
    return cachedBuffer;
  }
  
  try {
    // Desativar o cache para esta operação
    sharp.cache(false);
    
    // Criar uma imagem SVG com texto repetido otimizado 
    // Reduzir o número de instâncias para minimizar o tamanho do SVG
    
    // Aumentar espaçamento para reduzir número de repetições em grandes imagens
    // Ajuste dinâmico: imagens maiores usam células maiores para manter tamanho SVG razoável
    const scaleFactor = Math.max(1, Math.min(safeWidth, safeHeight) / 1000); // Fator de escala baseado no tamanho
    const cellWidth = 300 * scaleFactor; // Distância horizontal entre repetições do texto
    const cellHeight = 150 * scaleFactor; // Distância vertical entre repetições do texto
    
    // Calcular número de repetições necessárias em cada direção, com limite máximo
    const maxCells = 100; // Limite máximo de células para evitar SVGs muito grandes
    const cols = Math.min(Math.ceil(safeWidth / cellWidth) + 1, maxCells);
    const rows = Math.min(Math.ceil(safeHeight / cellHeight) + 1, maxCells);
    
    // Log do cálculo de grade
    logMemory('createWatermark-grid', `Watermark grid: ${cols}x${rows} cells (${cols * rows} total text instances)`);
    
    // Criar SVG com texto repetido
    // Usando template strings de forma eficiente
    const svgHeader = `<svg width="${safeWidth}" height="${safeHeight}" xmlns="http://www.w3.org/2000/svg">`;
    const svgStyles = `<style>
      .watermark-dark { 
        font-family: Arial, sans-serif; 
        font-size: ${WATERMARK_FONT_SIZE}px; 
        fill: black; 
        fill-opacity: ${WATERMARK_OPACITY}; 
        font-weight: normal;
        text-anchor: middle;
      }
      .watermark-light { 
        font-family: Arial, sans-serif; 
        font-size: ${WATERMARK_FONT_SIZE}px; 
        fill: white; 
        fill-opacity: ${WATERMARK_OPACITY}; 
        font-weight: normal;
        text-anchor: middle;
      }
    </style>`;
    
    // Log antes de criar o padrão de repetição
    logMemory('createWatermark-before-pattern', `Building SVG text pattern with ${WATERMARK_TEXT} watermark`);
    
    // Construir a string SVG usando concatenação eficiente
    let svgContent = svgHeader + svgStyles;
    
    // Reduzir o total de elementos gerados para imagens muito grandes
    // Usar uma abordagem de passo para "pular" algumas células em imagens grandes
    const colStep = Math.max(1, Math.floor(cols / 40)); // Limitar a ~40 colunas máximas
    const rowStep = Math.max(1, Math.floor(rows / 40)); // Limitar a ~40 linhas máximas
    
    // Criar um padrão de repetição do texto otimizado
    for (let row = 0; row < rows; row += rowStep) {
      for (let col = 0; col < cols; col += colStep) {
        // Centro de cada célula da grade
        const centerX = col * cellWidth + cellWidth / 2;
        const centerY = row * cellHeight + cellHeight / 2;
        
        // Alternar rotação para melhor cobertura visual
        const rotation = (row + col) % 3 === 0 ? -20 : 
                       (row + col) % 3 === 1 ? 0 : 20;
        
        // Propriedade CSS para o texto preto (para fundos claros)
        svgContent += `<text class="watermark-dark" 
          x="${centerX}" 
          y="${centerY}" 
          transform="rotate(${rotation}, ${centerX}, ${centerY})">${WATERMARK_TEXT}</text>`;
        
        // Reduzir o número de elementos brancos para metade dos elementos pretos
        if ((row + col) % 8 === 0) {
          svgContent += `<text class="watermark-light" 
            x="${centerX + 120}" 
            y="${centerY + 60}" 
            transform="rotate(${rotation + 10}, ${centerX + 120}, ${centerY + 60})">${WATERMARK_TEXT}</text>`;
        }
      }
    }
    
    svgContent += `</svg>`;
    
    // Log do tamanho da string SVG
    logMemory('createWatermark-svg-created', `SVG content created: ${(svgContent.length / 1024).toFixed(2)} KB`);
    
    // Log antes de converter para buffer
    logMemory('createWatermark-before-sharp', `Converting SVG to buffer using Sharp`);
    
    // Converter SVG para buffer usando Sharp com opções para economizar memória
    const watermarkBuffer = await sharp(Buffer.from(svgContent), {
      limitInputPixels: 50000000,
      sequentialRead: true
    }).toBuffer();
    
    // Log após converter para buffer
    logMemory('createWatermark-complete', `Watermark buffer created: ${(watermarkBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Armazenar no cache para reutilização
    watermarkCache.set(cacheKey, watermarkBuffer);
    
    // Limitar o tamanho do cache - adicionar esta verificação para segurança
    if (watermarkCache.size > 10) {
      // Remover a primeira entrada (mais antiga) se o cache ficar muito grande
      const keysIterator = watermarkCache.keys();
      const firstKey = keysIterator.next().value;
      if (firstKey && firstKey !== cacheKey) {
        watermarkCache.delete(firstKey);
        logMemory('createWatermark-cache-cleanup', `Removed oldest watermark from cache: ${firstKey}`);
      }
    }
    
    return watermarkBuffer;
  } catch (error) {
    // Log de erro na criação da marca d'água
    logMemory('createWatermark-error', `Error creating watermark: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Erro ao criar padrão de marca d\'água de texto:', error);
    
    // Log antes de criar a imagem transparente de fallback
    logMemory('createWatermark-fallback', `Creating transparent fallback image ${safeWidth}x${safeHeight}`);
    
    // Em caso de falha, criar uma imagem transparente simplificada
    try {
      return await sharp({
        create: {
          width: safeWidth,
          height: safeHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      }).toBuffer();
    } catch (fallbackError) {
      // Se até o fallback falhar, crie um buffer mínimo para não quebrar o fluxo
      console.error('Erro ao criar imagem transparente de fallback:', fallbackError);
      return Buffer.alloc(100); // Buffer mínimo
    }
  } finally {
    // Liberar recursos do Sharp
    sharp.cache(false);
    
    // Sugerir coleta de lixo após operação pesada
    if (process.env.DEBUG_MEMORY === 'true' && global.gc) {
      try {
        setTimeout(() => {
          global.gc && global.gc();
          logMemory('createWatermark-gc', `Garbage collection sugerida após criação de marca d'água`);
        }, 100);
      } catch (gcError) {
        console.error('Erro ao sugerir garbage collection:', gcError);
      }
    }
  }
}