import sharp, { Blend } from 'sharp';
import fs from 'fs';
import path from 'path';

// Constantes para processamento
const TARGET_WIDTH = 920; // Largura alvo para o redimensionamento
const WATERMARK_OPACITY = 0.25; // 25% de opacidade

// Determinar o caminho da marca d'água
const WATERMARK_PATH = path.resolve('./public/watermark.png'); 
console.log(`Caminho da marca d'água: ${WATERMARK_PATH}`);

// Função principal para processar a imagem
export async function processImage(
  buffer: Buffer, 
  mimetype: string
): Promise<Buffer> {
  try {
    // Primeiro, garanta que a imagem seja redimensionada corretamente
    // Isso garante que mesmo se houver problemas com a marca d'água, pelo menos a imagem será redimensionada
    let resizedBuffer = buffer;
    try {
      resizedBuffer = await resizeImage(buffer);
    } catch (resizeError) {
      console.error('Erro ao redimensionar imagem:', resizeError);
      // Se falhar no redimensionamento, use o buffer original
      resizedBuffer = buffer;
    }
    
    // Verifique se o arquivo de marca d'água existe
    if (!fs.existsSync(WATERMARK_PATH)) {
      console.warn(`Arquivo de marca d'água não encontrado em ${WATERMARK_PATH}. A imagem será processada sem marca d'água.`);
      return resizedBuffer;
    }

    try {
      // Carregar o buffer da imagem para o processamento
      let processedImage = sharp(resizedBuffer);
      
      // Obter metadados da imagem para cálculos
      const metadata = await processedImage.metadata();
      
      // Cálculo seguro da largura para o padrão de marca d'água
      const width = metadata.width || TARGET_WIDTH;
      
      // Carregar o arquivo de marca d'água
      const watermarkBuffer = fs.readFileSync(WATERMARK_PATH);
      
      // Criar um padrão de marca d'água repetida
      const watermarkPattern = await createWatermarkPattern(watermarkBuffer, width);
      
      // Aplicar a marca d'água
      processedImage = processedImage.composite([
        { input: watermarkPattern, blend: 'over' }
      ]);
      
      // Converter para o formato apropriado baseado no mimetype original
      if (mimetype === 'image/png') {
        processedImage = processedImage.png();
      } else if (mimetype === 'image/webp') {
        processedImage = processedImage.webp();
      } else if (mimetype === 'image/gif') {
        processedImage = processedImage.gif();
      } else {
        // Padrão para JPEG
        processedImage = processedImage.jpeg({ quality: 85 });
      }
      
      // Converter a imagem processada de volta para um buffer
      return await processedImage.toBuffer();
    } catch (watermarkError) {
      console.error('Erro ao aplicar marca d\'água:', watermarkError);
      // Se falhar na aplicação da marca d'água, retorne pelo menos a imagem redimensionada
      return resizedBuffer;
    }
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    // Retornar buffer original em caso de erro
    return buffer;
  }
}

// Função auxiliar para apenas redimensionar (usado se não houver marca d'água)
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

// Função para criar um padrão de marca d'água repetido
async function createWatermarkPattern(
  watermarkBuffer: Buffer, 
  targetWidth: number
): Promise<Buffer> {
  try {
    // Carregar a marca d'água
    const watermark = sharp(watermarkBuffer);
    const watermarkMeta = await watermark.metadata();
    
    // Definir o tamanho da marca d'água em relação à largura alvo
    // Garantir que é um número inteiro para evitar erros do Sharp
    const watermarkSize = Math.max(Math.floor(targetWidth / 5), 100); // 20% da largura ou mínimo 100px
    
    // Redimensionar a marca d'água
    // Simplificamos o processamento para melhorar a compatibilidade com PNG
    const resizedWatermark = await watermark
      .resize({
        width: watermarkSize, 
        fit: 'inside', 
        withoutEnlargement: false
      })
      .ensureAlpha() // Garantir que a imagem tem canal alpha
      .toBuffer();
    
    // Criar um padrão de marca d'água em grade
    // Calcular quantas marcas d'água cabem na horizontal e vertical
    const rows = 3;
    const cols = 3;
    // Garantir que largura e altura são números inteiros
    const patternWidth = Math.floor(targetWidth);
    const patternHeight = Math.floor(targetWidth); // Quadrado para facilitar
    
    // Criar uma imagem base transparente
    const basePattern = sharp({
      create: {
        width: patternWidth,
        height: patternHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });
    
    // Criar array de composições para posicionar as marcas d'água
    const compositeOperations = [];
    const spacingX = patternWidth / cols;
    const spacingY = patternHeight / rows;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        compositeOperations.push({
          input: resizedWatermark,
          left: Math.floor(col * spacingX + (spacingX - watermarkSize) / 2),
          top: Math.floor(row * spacingY + (spacingY - watermarkSize) / 2),
          blend: 'over' as const
        });
      }
    }
    
    // Aplicar todas as marcas d'água no padrão
    const pattern = await basePattern
      .composite(compositeOperations)
      .png()
      .toBuffer();
    
    // Ajustar a opacidade do padrão completo
    return await sharp(pattern)
      .ensureAlpha()
      .composite([{
        input: {
          create: {
            width: patternWidth,
            height: patternHeight,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: WATERMARK_OPACITY }
          }
        },
        blend: 'dest-in',
        gravity: 'centre'
      }])
      .toBuffer();
  } catch (error) {
    console.error('Erro ao criar padrão de marca d\'água:', error);
    // Criar uma imagem transparente de fallback
    // Garantir que as dimensões são inteiros
    const safeWidth = Math.floor(targetWidth);
    const safeHeight = Math.floor(targetWidth);
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