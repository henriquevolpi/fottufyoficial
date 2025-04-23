import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Diretório atual do arquivo em execução
export const getAppDirname = () => {
  try {
    // Primeiro tenta usar import.meta.url (funciona na maioria dos ambientes ESM)
    return dirname(fileURLToPath(import.meta.url));
  } catch (error) {
    // Fallback para o diretório de trabalho atual
    return process.cwd();
  }
};

// Helper para obter o caminho dos arquivos estáticos em diferentes ambientes
export const getPublicPath = () => {
  // Em produção (Railway)
  if (process.env.NODE_ENV === 'production') {
    // Primeiro tenta o caminho 'dist/public'
    const publicPath = resolve(process.cwd(), 'dist', 'public');
    if (fs.existsSync(publicPath)) {
      return publicPath;
    }
    
    // Segundo tenta o caminho 'dist'
    const distPath = resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      return distPath;
    }
  }
  
  // Em desenvolvimento
  try {
    return resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'public');
  } catch (error) {
    return resolve(process.cwd(), 'dist', 'public');
  }
};