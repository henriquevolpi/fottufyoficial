#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting production server...');

// Função para executar comando e aguardar conclusão
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function startProduction() {
  try {
    // Verificar se existe o arquivo de build
    console.log('📦 Checking build files...');
    
    // Executar migrations se necessário (opcional, apenas se DATABASE_URL estiver definida)
    if (process.env.DATABASE_URL) {
      console.log('🗄️ Running database migrations...');
      try {
        await runCommand('npx', ['drizzle-kit', 'push', '--force']);
        console.log('✅ Database migrations completed');
      } catch (error) {
        console.warn('⚠️ Database migrations failed, continuing anyway:', error.message);
      }
    }

    // Iniciar o servidor
    console.log('🌟 Starting application server...');
    await runCommand('node', ['dist/index.js']);
    
  } catch (error) {
    console.error('❌ Failed to start production server:', error);
    process.exit(1);
  }
}

startProduction();