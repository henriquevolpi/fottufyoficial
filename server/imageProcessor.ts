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
      
      // Aplicar a marca d'água diretamente com a opção tile
      processedImage = processedImage.composite([
        {
          input: watermarkBuffer,
          tile: true,
          blend: 'overlay',
          gravity: 'center',
          opacity: 0.25,
        }
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
    // Garantir que a largura alvo é um número inteiro
    const safeWidth = Math.floor(targetWidth);
    const safeHeight = Math.floor(targetWidth); // Mantemos proporção quadrada para o padrão

    // Carregar a marca d'água sem redimensionar
    const watermark = sharp(watermarkBuffer);
    const watermarkMeta = await watermark.metadata();
    
    if (!watermarkMeta.width || !watermarkMeta.height) {
      throw new Error('Não foi possível obter as dimensões da marca d\'água');
    }
    
    // Aplicar alfa para garantir canal de transparência e opacidade de 25%
    const watermarkWithAlpha = await watermark
      .ensureAlpha()
      .composite([{
        input: {
          create: {
            width: watermarkMeta.width,
            height: watermarkMeta.height,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: WATERMARK_OPACITY }
          }
        },
        blend: 'dest-in',
        gravity: 'centre'
      }])
      .toBuffer();
    
    // Criar uma imagem base transparente com tamanho da imagem de destino
    const basePattern = sharp({
      create: {
        width: safeWidth,
        height: safeHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });
    
    // Calcular quantas marcas d'água cabem em cada direção
    // Vamos supor que a marca d'água tenha aproximadamente 100x100px
    const watermarkWidth = watermarkMeta.width;
    const watermarkHeight = watermarkMeta.height;
    
    // Calcular quantas cópias são necessárias para cobrir a imagem inteira
    const cols = Math.ceil(safeWidth / watermarkWidth) + 1; // +1 para garantir cobertura completa
    const rows = Math.ceil(safeHeight / watermarkHeight) + 1;
    
    // Criar array de composições para repetir a marca d'água em toda a imagem
    const compositeOperations = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        compositeOperations.push({
          input: watermarkWithAlpha,
          left: col * watermarkWidth,
          top: row * watermarkHeight,
          blend: 'over' as const
        });
      }
    }
    
    // Aplicar todas as marcas d'água no padrão
    return await basePattern
      .composite(compositeOperations)
      .toBuffer();
  } catch (error) {
    console.error('Erro ao criar padrão de marca d\'água:', error);
    // Criar uma imagem transparente de fallback
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