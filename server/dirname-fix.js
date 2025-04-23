import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Detectar ambiente (desenvolvimento ou produção)
const isDev = process.env.NODE_ENV !== 'production';

// Obter o dirname equivalente ao __dirname do CommonJS
export const appDirname = isDev 
  ? dirname(fileURLToPath(import.meta.url))
  : process.cwd();

// Resolver caminhos de arquivo relativos ao diretório da aplicação
export const resolveAppPath = (...paths) => resolve(appDirname, '..', ...paths);

// Resolver caminhos para arquivos públicos
export const resolvePublicPath = (...paths) => {
  if (isDev) {
    return resolve(appDirname, '..', 'client', ...paths);
  } else {
    return resolve(process.cwd(), 'dist', 'public', ...paths);
  }
};