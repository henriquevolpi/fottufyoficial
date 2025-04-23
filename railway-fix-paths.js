#!/usr/bin/env node

/**
 * Este script corrige problemas de caminho no arquivo dist/index.js para o Railway
 * Funciona corrigindo referências a import.meta.dirname que causam erro em produção
 */

const fs = require('fs');
const path = require('path');

// Caminho para o arquivo compilado
const distFilePath = path.join(process.cwd(), 'dist', 'index.js');

if (!fs.existsSync(distFilePath)) {
  console.error('Arquivo dist/index.js não encontrado.');
  process.exit(1);
}

// Lê o conteúdo do arquivo
let content = fs.readFileSync(distFilePath, 'utf8');

// Substitui import.meta.dirname por uma alternativa segura
const fixPaths = `
// Path fix for Railway deployment
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const getPublicPath = () => {
  // Check dist/public first
  const publicPath = path.resolve(process.cwd(), 'dist', 'public');
  if (fs.existsSync(publicPath)) {
    return publicPath;
  }
  // Then try dist
  return path.resolve(process.cwd(), 'dist');
};
`;

// Adiciona a correção no início do arquivo
content = content.replace('import', fixPaths + '\nimport');

// Substitui todas as ocorrências de path.resolve(import.meta.dirname, "public")
content = content.replace(
  /path\.resolve\(\s*import\.meta\.dirname\s*,\s*["']public["']\s*\)/g,
  'getPublicPath()'
);

// Substitui todas as ocorrências de import.meta.dirname ou import.meta.url
content = content.replace(
  /path\.resolve\(\s*import\.meta\.dirname\s*,/g,
  'path.resolve(__dirname,'
);

// Corrige outras ocorrências que possam estar usando import.meta.dirname
content = content.replace(/import\.meta\.dirname/g, '__dirname');

// Salva o arquivo corrigido
fs.writeFileSync(distFilePath, content);

console.log('Arquivo dist/index.js corrigido com sucesso para o Railway.');