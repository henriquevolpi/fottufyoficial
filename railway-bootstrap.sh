#!/bin/bash
set -e

# Preparar os diretórios necessários
echo "Preparando diretórios..."
mkdir -p uploads
mkdir -p dist/public
chmod -R 755 uploads

# Atualizar o package.json para o formato correto no Railway
if [ -f "package.json" ]; then
  sed -i 's/--outdir=dist/--outfile=dist\/index.js/g' package.json
  echo "✓ package.json atualizado para o Railway"
fi

# Verificar os arquivos necessários
if [ ! -f "dist/index.js" ]; then
  echo "ERRO: dist/index.js não encontrado. Certifique-se que a build foi executada."
  exit 1
fi

# Aplicar correção de paths
echo "Aplicando correções de caminhos para ESM..."
chmod +x railway-fix-paths.cjs
node railway-fix-paths.cjs
echo "✓ Fix aplicado para resolução de caminhos em ESM"

# Iniciar a aplicação
echo "Iniciando a aplicação PhotoProManager..."
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
node dist/index.js