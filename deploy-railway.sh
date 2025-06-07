#!/bin/bash

# Script de deploy otimizado para Railway
# Resolve o erro de importação do Vite em produção

echo "🚀 Iniciando deploy para Railway..."

# Build frontend
echo "📦 Building frontend..."
npx vite build

# Build backend sem Vite
echo "⚙️  Building backend (production mode without Vite)..."
npx esbuild server/index.prod.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Build completo!"
echo "📁 Arquivos gerados:"
echo "   - dist/index.prod.js (servidor sem Vite)"
echo "   - dist/public/ (frontend build)"
echo "   - dist/public/index.html (SPA principal)"

echo ""
echo "🚢 Para fazer deploy no Railway:"
echo "1. git add ."
echo "2. git commit -m 'Deploy ready - Vite issue fixed'"
echo "3. git push origin main"
echo ""
echo "🎯 O servidor iniciará com: node dist/index.prod.js"
echo "✨ Problema do Vite em produção resolvido!"