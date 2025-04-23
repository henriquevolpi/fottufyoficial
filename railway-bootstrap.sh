#!/bin/bash
mkdir -p uploads

# Atualizar o package.json para o formato correto no Railway
if [ -f "package.json" ]; then
  sed -i 's/--outdir=dist/--outfile=dist\/index.js/g' package.json
  echo "package.json atualizado para o Railway"
fi

# Dar permissão e executar o script de correção de caminhos
chmod +x railway-fix-paths.js
node railway-fix-paths.js
echo "Aplicado fix para resolução de caminhos em ESM para o Railway"

node dist/index.js