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
      
      // Obter a imagem redimensionada para processamento
      const processedImage = sharp(resizedBuffer);
      
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
        
        // Criar padrão de marca d'água repetitiva diretamente com texto
        const watermarkPattern = await createTextWatermarkPattern(
          metadata.width,
          metadata.height
        );
        
        // Log após criar a marca d'água e antes de aplicá-la
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
      
      // Definir formato de saída baseado no mimetype original
      if (mimetype === 'image/png') {
        finalImage = finalImage.png();
      } else if (mimetype === 'image/webp') {
        finalImage = finalImage.webp();
      } else if (mimetype === 'image/gif') {
        finalImage = finalImage.gif();
      } else {
        // Padrão para JPEG com boa qualidade
        finalImage = finalImage.jpeg({ quality: 85 });
      }
      
      // Log antes de converter para buffer
      logMemory('processImage-before-toBuffer', `Converting to final buffer`);
      
      // Converter para buffer final e retornar
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
 * Mantém a proporção original e só redimensiona se for maior que o alvo
 */
async function resizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    // Log no início do redimensionamento
    logMemory('resizeImage-start', `Starting resize operation with buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    const image = sharp(buffer);
    
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
      
      const resizedBuffer = await image
        .resize({
          width: TARGET_WIDTH,
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();
      
      // Log após o redimensionamento
      logMemory('resizeImage-complete', 
        `Resize complete: Original: ${(buffer.length / 1024 / 1024).toFixed(2)} MB → Resized: ${(resizedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      
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
  }
}

/**
 * Cria um padrão de marca d'água com texto repetido
 * Gera uma grade de textos "fottufy (não copie)" com opacidade 25%
 */
async function createTextWatermarkPattern(width: number, height: number): Promise<Buffer> {
  // Log no início da criação da marca d'água
  logMemory('createWatermark-start', `Creating watermark pattern for dimensions: ${width}x${height}`);
  
  // Garantir dimensões seguras
  const safeWidth = Math.floor(width);
  const safeHeight = Math.floor(height);
  
  try {
    // Criar uma imagem SVG com texto repetido
    // Definimos uma grade de texto com rotação para melhor cobertura e visibilidade
    
    // Tamanho de cada célula da grade, ajustado para maior espaçamento
    const cellWidth = 300; // Distância horizontal entre repetições do texto
    const cellHeight = 150; // Distância vertical entre repetições do texto
    
    // Calcular número de repetições necessárias em cada direção
    const cols = Math.ceil(safeWidth / cellWidth) + 1;
    const rows = Math.ceil(safeHeight / cellHeight) + 1;
    
    // Log do cálculo de grade
    logMemory('createWatermark-grid', `Watermark grid: ${cols}x${rows} cells (${cols * rows} total text instances)`);
    
    // Criar SVG com texto repetido
    let svgContent = `<svg width="${safeWidth}" height="${safeHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Definir dois estilos para melhor contraste em fundos diferentes
    svgContent += `<style>
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
    
    // Criar um padrão de repetição do texto
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
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
        
        // Posição ligeiramente deslocada para o texto branco (para fundos escuros)
        // Criamos versões em cores alternadas para garantir visibilidade em qualquer fundo
        if ((row + col) % 4 === 0) {
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
    
    // Converter SVG para buffer usando Sharp
    const watermarkBuffer = await sharp(Buffer.from(svgContent))
      .toBuffer();
    
    // Log após converter para buffer
    logMemory('createWatermark-complete', `Watermark buffer created: ${(watermarkBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    return watermarkBuffer;
  } catch (error) {
    // Log de erro na criação da marca d'água
    logMemory('createWatermark-error', `Error creating watermark: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Erro ao criar padrão de marca d\'água de texto:', error);
    
    // Log antes de criar a imagem transparente de fallback
    logMemory('createWatermark-fallback', `Creating transparent fallback image ${safeWidth}x${safeHeight}`);
    
    // Em caso de falha, criar uma imagem transparente
    return await sharp({
      create: {
        width: safeWidth,
        height: safeHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).toBuffer();
  }
}