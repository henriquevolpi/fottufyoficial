# Multi-stage build otimizado para Node.js + React (Vite) no Railway
FROM node:18-alpine AS base

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Build stage
FROM base AS build
RUN npm ci
RUN npx vite build
RUN npx esbuild server/index.prod.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Imagem final de produção
FROM node:18-alpine AS production

# Instalar dependências do sistema para produção
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Copiar package.json e instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar aplicação compilada do estágio de build
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/tsconfig.json ./

# Criar diretório uploads
RUN mkdir -p uploads

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expor porta
EXPOSE 3000

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicialização usando arquivo sem Vite
CMD ["node", "dist/index.prod.js"]