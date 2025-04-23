#!/bin/bash
# Script de inicialização para o Railway

# Criar diretório de uploads se não existir
mkdir -p uploads
echo "Diretório de uploads criado"

# Garantir que os arquivos estáticos estejam disponíveis na pasta correta
if [ ! -d "dist/public" ]; then
  echo "Criando diretório dist/public"
  mkdir -p dist/public
  cp -r dist/assets dist/public/
  cp dist/index.html dist/public/
  cp dist/fottufy*.* dist/public/ 2>/dev/null || true
  cp dist/'fottufy ex1.jpg' dist/public/ 2>/dev/null || true
  cp dist/'fottufy ex2.jpg' dist/public/ 2>/dev/null || true
  cp dist/'fottufy logo.png' dist/public/ 2>/dev/null || true
  echo "Arquivos estáticos copiados para dist/public"
fi

# Iniciar o servidor
echo "Iniciando o servidor..."
node dist/index.js