import sharp, { OverlayOptions } from 'sharp';

// Constantes para processamento
const TARGET_WIDTH = 920; // Largura alvo para o redimensionamento
const WATERMARK_OPACITY = 0.25; // 25% de opacidade
const WATERMARK_TEXT = 'fottufy (não copie)'; // Texto para a marca d'água
const WATERMARK_FONT_SIZE = 36; // Tamanho da fonte em pixels

/**
 * Função principal para processar a imagem
 * Redimensiona para 920px de largura e aplica marca d'água com texto repetido
 */
export async function processImage(
  buffer: Buffer, 
  mimetype: string
): Promise<Buffer> {
  try {
    // Primeiro, redimensionar a imagem
    let resizedBuffer: Buffer;
    try {
      resizedBuffer = await resizeImage(buffer);
    } catch (resizeError) {
      console.error('Erro ao redimensionar imagem:', resizeError);
      // Se falhar no redimensionamento, use o buffer original
      resizedBuffer = buffer;
    }

    try {
      // Obter a imagem redimensionada para processamento
      const processedImage = sharp(resizedBuffer);
      
      // Obter metadados da imagem redimensionada para determinar dimensões
      const metadata = await processedImage.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Não foi possível obter as dimensões da imagem');
      }

      // Criar padrão de marca d'água repetitiva diretamente com texto
      const watermarkPattern = await createTextWatermarkPattern(
        metadata.width,
        metadata.height
      );
      
      // Aplicar marca d'água e formato adequado
      let finalImage = processedImage.composite([
        { input: watermarkPattern, blend: 'over' }
      ]);
      
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
      
      // Converter para buffer final e retornar
      return await finalImage.toBuffer();
    } catch (watermarkError) {
      console.error('Erro ao aplicar marca d\'água:', watermarkError);
      // Se falhar na aplicação da marca d'água, retorna pelo menos a imagem redimensionada
      return resizedBuffer;
    }
  } catch (error) {
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
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // Redimensionar apenas se for maior que a largura alvo
    if (metadata.width && metadata.width > TARGET_WIDTH) {
      return await image
        .resize({
          width: TARGET_WIDTH,
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();
    }
    
    // Se não precisar redimensionar, retornar o buffer original
    return buffer;
  } catch (error) {
    console.error('Erro ao redimensionar imagem:', error);
    return buffer;
  }
}

/**
 * Cria um padrão de marca d'água com texto repetido
 * Gera uma grade de textos "fottufy (não copie)" com opacidade 25%
 */
async function createTextWatermarkPattern(width: number, height: number): Promise<Buffer> {
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
    
    // Converter SVG para buffer usando Sharp
    return await sharp(Buffer.from(svgContent))
      .toBuffer();
  } catch (error) {
    console.error('Erro ao criar padrão de marca d\'água de texto:', error);
    
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