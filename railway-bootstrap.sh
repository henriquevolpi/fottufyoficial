#!/bin/bash
mkdir -p uploads

# Atualizar o package.json para o formato correto no Railway
if [ -f "package.json" ]; then
  sed -i 's/--outdir=dist/--outfile=dist\/index.js/g' package.json
  echo "package.json atualizado para o Railway"
fi

node dist/index.js