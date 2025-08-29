#!/usr/bin/env node

/**
 * Script de configuração para sistema de backup no Google Drive
 * Configura as credenciais e gera o refresh token
 * 
 * Uso:
 * 1. npx tsx setup-google-drive-backup.ts
 * 2. Siga as instruções no console
 */

import fs from 'fs-extra';
import path from 'path';
import { google } from 'googleapis';
import readline from 'readline';

const CLIENT_ID = '1017642748234-crblmpti1m0amqbvcgnbr4a11dpk32p1.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

console.log('\n🔧 CONFIGURAÇÃO DO BACKUP AUTOMÁTICO PARA GOOGLE DRIVE');
console.log('='.repeat(60));

async function setupGoogleDriveBackup() {
  // Configurar OAuth2
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  // Gerar URL de autorização
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n📋 PASSOS PARA CONFIGURAÇÃO:');
  console.log('\n1️⃣ ABRA ESTA URL NO SEU NAVEGADOR:');
  console.log(`\n${authUrl}\n`);
  console.log('2️⃣ Faça login na sua conta Google');
  console.log('3️⃣ Autorize o acesso ao Google Drive');
  console.log('4️⃣ Copie o código de autorização retornado');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('\n🔑 Cole aqui o código de autorização: ', async (code) => {
      rl.close();

      try {
        console.log('\n🔄 Gerando tokens de acesso...');
        const { tokens } = await oauth2Client.getToken(code);
        
        if (!tokens.refresh_token) {
          console.error('❌ Refresh token não foi gerado. Tente novamente com force_consent=true');
          reject(new Error('Refresh token não encontrado'));
          return;
        }

        console.log('\n✅ Tokens gerados com sucesso!');
        console.log('\n📝 VARIÁVEIS DE AMBIENTE PARA CONFIGURAR:');
        console.log('='.repeat(60));
        console.log(`GOOGLE_DRIVE_CLIENT_ID=${CLIENT_ID}`);
        console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('='.repeat(60));

        // Criar arquivo .env.backup de exemplo
        const envContent = `# Google Drive Backup Configuration
GOOGLE_DRIVE_CLIENT_ID=${CLIENT_ID}
GOOGLE_DRIVE_CLIENT_SECRET=${CLIENT_SECRET}
GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}

# Backup Configuration (opcional)
BACKUP_CRON_SCHEDULE=0 3 * * *
BACKUP_MAX_RETRIES=3
BACKUP_COMPRESSION_LEVEL=9
BACKUP_KEEP_LOCAL_COPIES=3
`;

        await fs.writeFile('.env.backup', envContent);
        console.log('\n💾 Arquivo .env.backup criado com as configurações');
        
        console.log('\n🚀 PRÓXIMOS PASSOS:');
        console.log('1. Adicione essas variáveis ao seu ambiente de produção (Render, etc.)');
        console.log('2. No Replit: Use a aba "Secrets" para adicionar as variáveis');
        console.log('3. Execute: npx tsx test-backup.ts para testar o sistema');
        
        resolve(tokens);
        
      } catch (error: any) {
        console.error('\n❌ Erro ao gerar tokens:', error.message);
        reject(error);
      }
    });
  });
}

// Executar configuração
setupGoogleDriveBackup()
  .then(() => {
    console.log('\n✅ Configuração concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na configuração:', error.message);
    process.exit(1);
  });