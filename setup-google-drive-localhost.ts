#!/usr/bin/env node

/**
 * Configuração Google Drive com servidor localhost
 * Solução para o problema de redirect_uri_mismatch
 */

import { google } from 'googleapis';
import express from 'express';
import fs from 'fs-extra';

const CLIENT_ID = '1017642748234-crblmpti1m0amqbvcgnbr4a11dpk32p1.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

console.log('\n🔧 CONFIGURAÇÃO GOOGLE DRIVE COM LOCALHOST');
console.log('='.repeat(50));

async function setupGoogleDriveWithLocalhost() {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  
  // Criar servidor Express temporário
  const app = express();
  let server: any = null;
  
  return new Promise((resolve, reject) => {
    // Configurar servidor para capturar callback
    app.get('/oauth/callback', async (req, res) => {
      const code = req.query.code as string;
      
      if (!code) {
        res.send('❌ Erro: Código de autorização não recebido');
        server.close();
        reject(new Error('Código não encontrado'));
        return;
      }

      try {
        console.log('\n🔄 Processando código de autorização...');
        const { tokens } = await oauth2Client.getToken(code);
        
        if (!tokens.refresh_token) {
          res.send('❌ Erro: Refresh token não foi gerado');
          server.close();
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

        // Criar arquivo .env.backup
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
        
        // Resposta de sucesso
        res.send(`
          <html>
            <head><title>Configuração Concluída</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1>✅ Configuração Concluída com Sucesso!</h1>
              <p><strong>REFRESH TOKEN gerado:</strong></p>
              <code style="background: #f0f0f0; padding: 10px; display: block; margin: 20px;">${tokens.refresh_token}</code>
              <p>Arquivo .env.backup criado com as configurações.</p>
              <p><strong>Próximos passos:</strong></p>
              <ol style="text-align: left; display: inline-block;">
                <li>Adicione as variáveis ao Replit Secrets</li>
                <li>Execute: npx tsx test-backup.ts</li>
                <li>Configure no Render se necessário</li>
              </ol>
              <p><em>Você pode fechar esta janela.</em></p>
            </body>
          </html>
        `);

        setTimeout(() => {
          server.close();
          resolve(tokens);
        }, 2000);

      } catch (error: any) {
        res.send(`❌ Erro: ${error.message}`);
        server.close();
        reject(error);
      }
    });

    // Iniciar servidor
    server = app.listen(3000, () => {
      console.log('\n🌐 Servidor local iniciado em http://localhost:3000');
      
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
      });

      console.log('\n📋 INSTRUÇÕES:');
      console.log('1️⃣ Primeiro, configure o Redirect URI no Google Cloud Console:');
      console.log('   - Acesse: https://console.cloud.google.com');
      console.log('   - Vá em: APIs & Services > Credentials');
      console.log('   - Edite seu Client ID');
      console.log('   - Adicione este URI: http://localhost:3000/oauth/callback');
      console.log('   - Salve as alterações');
      console.log('\n2️⃣ Depois, abra esta URL no navegador:');
      console.log(`\n${authUrl}\n`);
      console.log('3️⃣ Faça login e autorize o acesso');
      console.log('4️⃣ Será redirecionado automaticamente para localhost');
      console.log('\n⏰ Aguardando autorização...');
    });

    // Timeout de 5 minutos
    setTimeout(() => {
      if (server) {
        console.log('\n⏰ Tempo limite atingido (5 minutos)');
        server.close();
        reject(new Error('Timeout: Autorização não completada'));
      }
    }, 5 * 60 * 1000);
  });
}

// Executar configuração
setupGoogleDriveWithLocalhost()
  .then(() => {
    console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('\n💡 Próximos passos:');
    console.log('1. Adicione as variáveis aos Secrets do Replit');
    console.log('2. Execute: npx tsx test-backup.ts');
    console.log('3. Configure no Render/produção se necessário');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na configuração:', error.message);
    process.exit(1);
  });