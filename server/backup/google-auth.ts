import { google } from 'googleapis';
import readline from 'readline';

// Configuração do Google OAuth2
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // Para aplicações desktop/server

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

/**
 * Script para gerar o REFRESH TOKEN do Google Drive (executar uma vez apenas)
 * 
 * Para usar:
 * 1. Defina as variáveis de ambiente GOOGLE_DRIVE_CLIENT_ID e GOOGLE_DRIVE_CLIENT_SECRET
 * 2. Execute: npx tsx server/backup/google-auth.ts
 * 3. Abra a URL gerada no navegador
 * 4. Faça login na sua conta Google
 * 5. Copie o código de autorização e cole quando solicitado
 * 6. Salve o REFRESH TOKEN gerado nas variáveis de ambiente
 */

async function generateRefreshToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Variáveis de ambiente necessárias não encontradas:');
    console.error('   GOOGLE_DRIVE_CLIENT_ID');
    console.error('   GOOGLE_DRIVE_CLIENT_SECRET');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  // Gerar URL de autorização
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n🔐 GERAÇÃO DE REFRESH TOKEN DO GOOGLE DRIVE');
  console.log('='.repeat(50));
  console.log('\n1️⃣ Abra esta URL no seu navegador:');
  console.log(`\n${authUrl}\n`);
  console.log('2️⃣ Faça login na sua conta Google');
  console.log('3️⃣ Copie o código de autorização retornado\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('📋 Cole o código de autorização aqui: ', async (code) => {
    rl.close();

    try {
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log('\n✅ Tokens gerados com sucesso!');
      console.log('\n📝 Adicione estas variáveis de ambiente:');
      console.log('='.repeat(50));
      console.log(`GOOGLE_DRIVE_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('='.repeat(50));
      console.log('\n💾 Salve o REFRESH_TOKEN - ele não expira e permite acesso contínuo!');
      
    } catch (error) {
      console.error('❌ Erro ao gerar tokens:', error);
    }
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  generateRefreshToken();
}

export { generateRefreshToken };