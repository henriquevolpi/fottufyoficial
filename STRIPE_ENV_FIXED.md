# Stripe Environment Variable Fix - Railway

## Problem Fixed
Frontend showing white screen with error:
`Error: Chave pública do Stripe não encontrada. Defina VITE_STRIPE_PUBLIC_KEY nas variáveis de ambiente.`

## Solution Applied

### 1. Dockerfile Updated
Added build argument support for Vite environment variables:
```dockerfile
ARG VITE_STRIPE_PUBLIC_KEY
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY
```

### 2. Railway Configuration Updated
Both `railway.json` and `railway.toml` now pass the environment variable during build:
```json
"buildArgs": {
  "VITE_STRIPE_PUBLIC_KEY": "${{VITE_STRIPE_PUBLIC_KEY}}"
}
```

## Required Action in Railway Dashboard

**IMPORTANT**: You must set the environment variable in Railway:

1. Go to your Railway project dashboard
2. Click on "Variables" tab
3. Add new variable:
   - **Name**: `VITE_STRIPE_PUBLIC_KEY`
   - **Value**: `pk_test_your_stripe_public_key` (your actual Stripe public key)

## Deploy After Setting Variable

```bash
git add .
git commit -m "Fix Stripe environment variable for production build"
git push origin main
```

## How It Works

1. Railway reads `VITE_STRIPE_PUBLIC_KEY` from environment variables
2. Passes it as build argument to Docker during `npx vite build`
3. Vite embeds the variable into the frontend bundle
4. Frontend loads normally with Stripe integration working

## Status: READY
Once you set `VITE_STRIPE_PUBLIC_KEY` in Railway dashboard, the white screen issue will be resolved.