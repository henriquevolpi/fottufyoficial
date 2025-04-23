README - DOCUMENTO DE DEPLOY PROJETO DE SELECAO



## PhotoProManager - Versão Estável no Render

🟢 Deploy funcionando no Render em 23/04/2025

### Configurações usadas no Render:

- Language: Node.js
- Root directory: /
- Build command: `npm run build`
- Start command: `node dist/index.js`
- Variáveis de ambiente:
  - `PORT`: 3000 (padrão do Render)
  - `SESSION_SECRET`: 
  - `STRIPE_SECRET_KEY`: 
  - `VITE_STRIPE_PUBLIC_KEY`: pk_live

NODE_ENV                   | production


---

### Funcionalidades testadas:
✅ Login  
✅ Upload  
✅ Galeria  
✅ Stripe  
✅ Admin  

---

### URL do Deploy:
https://fottufy.onrender.com




# 📸 Fottufy - PhotoProManager

Fottufy é uma plataforma moderna para fotógrafos organizarem e compartilharem galerias com seus clientes de forma rápida, segura e personalizada.

---

## 🚀 Funcionalidades

- ✅ Login e cadastro com autenticação segura
- ✅ Upload de fotos com limite por plano
- ✅ Galerias públicas para seleção de fotos
- ✅ Painel do fotógrafo com estatísticas
- ✅ Controle de planos e assinaturas via Stripe
- ✅ Área administrativa exclusiva
- ✅ Upload com suporte a múltiplas imagens
- ✅ URLs únicas para cada galeria do cliente

---

## 🛠️ Tecnologias

- **Frontend:** Vite + React
- **Backend:** Node.js (Express)
- **Banco de dados:** SQLite via Drizzle ORM
- **Autenticação:** Passport.js + Sessions
- **Deploy atual:** [Render.com](https://render.com)
- **Outros:** Multer, Stripe, NanoID, CORS, dotenv

---

## 🌐 Deploy público

Acesse a plataforma: [https://fottufy.onrender.com](https://fottufy.onrender.com)  
_(substitua pela URL final gerada no Render)_

---

## 📦 Instalação local

```bash
# Clonar o repositório
git clone https://github.com/henriquevolpi/fottufyoficial.git

# Acessar a pasta
cd fottufyoficial

# Instalar dependências
npm install

# Rodar o servidor localmente
npm run dev





🔐 Variáveis de Ambiente (.env)
SESSION_SECRET= minha_senha_topdelinha
STRIPE_SECRET_KEY= sk_live
VITE_STRIPE_PUBLIC_KEY= pk_live
NODE_ENV= development
PORT=5000