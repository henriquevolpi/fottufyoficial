#!/usr/bin/env node

/**
 * Este script corrige problemas de caminho no arquivo dist/index.js para o Railway
 * Funciona corrigindo referências a import.meta.dirname que causam erro em produção
 */

const fs = require('fs');
const path = require('path');

console.log('Iniciando correção de caminhos para Railway...');

// Caminho para o arquivo compilado
const distFilePath = path.join(process.cwd(), 'dist', 'index.js');

if (!fs.existsSync(distFilePath)) {
  console.error('ERRO: Arquivo dist/index.js não encontrado.');
  process.exit(1);
}

// Lê o conteúdo do arquivo
let content = fs.readFileSync(distFilePath, 'utf8');
console.log(`Tamanho original do arquivo: ${content.length} bytes`);

// Substitui import.meta.dirname por uma alternativa segura
const fixPaths = `
// Path fix for Railway deployment
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM compatibility functions
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to get the correct public path in different environments
const getPublicPath = () => {
  // Check dist/public first (common in production)
  const publicPath = path.resolve(process.cwd(), 'dist', 'public');
  if (fs.existsSync(publicPath)) {
    console.log('Usando caminho: ' + publicPath);
    return publicPath;
  }
  
  // Then try dist (fallback)
  const distPath = path.resolve(process.cwd(), 'dist');
  console.log('Usando caminho fallback: ' + distPath);
  return distPath;
};

// Helper function to get client path
const getClientPath = (...segments) => {
  return path.resolve(process.cwd(), 'client', ...segments);
};

console.log('Railway path fixes carregados com sucesso');
`;

// Adiciona a correção no início do arquivo
if (content.includes('// Path fix for Railway deployment')) {
  console.log('O arquivo já contém correções de caminho. Pulando esta etapa.');
} else {
  content = content.replace('import', fixPaths + '\nimport');
  console.log('✓ Adicionado código de correção de caminhos');
}

// Substitui todas as ocorrências de path.resolve(import.meta.dirname, "public")
const publicPathCount = (content.match(/path\.resolve\(\s*import\.meta\.dirname\s*,\s*["']public["']\s*\)/g) || []).length;
content = content.replace(
  /path\.resolve\(\s*import\.meta\.dirname\s*,\s*["']public["']\s*\)/g,
  'getPublicPath()'
);
console.log(`✓ Substituídas ${publicPathCount} ocorrências de referências a caminhos públicos`);

// Substitui todas as ocorrências de import.meta.dirname ou import.meta.url em path.resolve
const pathResolveCount = (content.match(/path\.resolve\(\s*import\.meta\.dirname\s*,/g) || []).length;
content = content.replace(
  /path\.resolve\(\s*import\.meta\.dirname\s*,/g,
  'path.resolve(__dirname,'
);
console.log(`✓ Substituídas ${pathResolveCount} ocorrências de path.resolve com import.meta.dirname`);

// Corrige outras ocorrências que possam estar usando import.meta.dirname
const generalCount = (content.match(/import\.meta\.dirname/g) || []).length;
content = content.replace(/import\.meta\.dirname/g, '__dirname');
console.log(`✓ Substituídas ${generalCount} ocorrências gerais de import.meta.dirname`);

// Corrige path.resolve para ../client
content = content.replace(
  /path\.resolve\(\s*__dirname\s*,\s*["']\.\.[\/\\]client["']/g,
  'getClientPath('
);

// Salva o arquivo corrigido
fs.writeFileSync(distFilePath, content);
console.log(`Tamanho final do arquivo: ${content.length} bytes`);
console.log('✓ Arquivo dist/index.js corrigido com sucesso para o Railway.');