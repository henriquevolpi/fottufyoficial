// Polyfill para import.meta.dirname em ambientes ESM
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Detectar se estamos em desenvolvimento ou produção
const isDev = process.env.NODE_ENV !== 'production';

// Em ambiente de produção (Railway), usamos o diretório atual
export const appDirname = isDev 
  ? dirname(fileURLToPath(import.meta.url)) 
  : process.cwd();

// Helper para resolver caminhos relativos ao diretório raiz do aplicativo
export const resolveAppPath = (...paths) => resolve(appDirname, '..', ...paths);

// Helper para resolver caminhos de arquivos estáticos
export const resolvePublicPath = (...paths) => {
  // Em produção, procuramos em dist/public
  const prodPath = resolve(process.cwd(), 'dist', 'public', ...paths);
  
  // Verificar se o caminho existe em produção
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  
  // Fallback para o caminho de desenvolvimento
  return resolve(appDirname, '..', 'dist', 'public', ...paths);
};