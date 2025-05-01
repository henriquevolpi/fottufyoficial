import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function createWatermark() {
  try {
    // Create a 400x200 transparent background with white text
    const width = 400;
    const height = 200;
    
    // Create a text overlay
    const svgBuffer = Buffer.from(`
      <svg width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="none"/>
        <text 
          x="50%" 
          y="50%" 
          font-family="Arial, Helvetica, sans-serif" 
          font-size="36" 
          font-weight="bold"
          fill="white" 
          text-anchor="middle" 
          alignment-baseline="middle">
          FOTTUFY
        </text>
      </svg>
    `);
    
    // Save as WebP with transparency
    await sharp(svgBuffer)
      .webp()
      .toFile('public/watermark.webp');
    
    console.log('Watermark created successfully at public/watermark.webp');
  } catch (error) {
    console.error('Error creating watermark:', error);
  }
}

createWatermark();