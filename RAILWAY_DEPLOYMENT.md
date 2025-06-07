# Railway Deployment Guide

## Arquivos de Configuração Criados

### 1. `Dockerfile` 
- Build multi-stage otimizado para produção
- Suporte completo para dependências de imagem (Sharp, Cairo)
- Configuração de segurança com usuário não-root

### 2. `railway.json` / `railway.toml`
- Configuração específica do Railway
- Healthcheck e políticas de restart configuradas

### 3. `.dockerignore`
- Otimização do build excluindo arquivos desnecessários
- Reduz tamanho da imagem Docker

### 4. `nixpacks.toml`
- Configuração alternativa para Nixpacks (caso Railway use em vez de Docker)

## Variáveis de Ambiente Necessárias

Configure estas variáveis no Railway Dashboard:

```bash
# Database
DATABASE_URL=postgresql://...

# Cloudflare R2
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ACCOUNT_ID=your_account_id
R2_BUCKET_NAME=your_bucket_name
R2_REGION=auto

# Email
RESEND_API_KEY=your_resend_key

# Payment
STRIPE_SECRET_KEY=sk_...
VITE_STRIPE_PUBLIC_KEY=pk_...

# Other
SESSION_SECRET=your_session_secret
NODE_ENV=production
PORT=3000
```

## Passos para Deploy no Railway

1. **Conectar Repositório**
   - Faça push dos arquivos criados para seu repositório Git
   - Conecte o repositório no Railway Dashboard

2. **Configurar Variáveis**
   - Adicione todas as variáveis de ambiente listadas acima
   - Railway detectará automaticamente o Dockerfile

3. **Deploy Automático**
   - Railway fará build e deploy automaticamente
   - O healthcheck está configurado em `/`

## Estrutura de Build

```
BUILD STAGE:
- Instala dependências do sistema (Sharp, Cairo)
- Executa npm ci para todas as dependências
- Executa npm run build (Vite + esbuild)

PRODUCTION STAGE:
- Copia apenas arquivos necessários
- Instala apenas dependências de produção
- Configura usuário de segurança
- Expõe porta 3000
```

## Verificação Pós-Deploy

1. Acesse a URL fornecida pelo Railway
2. Verifique se o healthcheck está funcionando
3. Teste login e funcionalidades principais
4. Monitore logs para possíveis erros

## Troubleshooting

- **Build falha**: Verifique se todas as dependências estão no package.json
- **Runtime erro**: Verifique variáveis de ambiente
- **Database erro**: Confirme se DATABASE_URL está correto
- **Assets não carregam**: Verifique configuração do R2

## Otimizações Incluídas

- Multi-stage build para menor tamanho final
- Cache de dependências otimizado
- Healthcheck configurado
- Restart automático em falhas
- Usuário não-root para segurança