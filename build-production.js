#!/usr/bin/env node

import { spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(spawn);

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { 
      stdio: 'inherit',
      shell: true 
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function buildForProduction() {
  try {
    console.log('🏗️  Building frontend with Vite...');
    await runCommand('npx', ['vite', 'build']);
    
    console.log('📦 Building backend for production (without Vite)...');
    await runCommand('npx', [
      'esbuild', 
      'server/index.prod.ts',
      '--platform=node',
      '--packages=external', 
      '--bundle',
      '--format=esm',
      '--outdir=dist'
    ]);
    
    console.log('✅ Production build complete!');
    console.log('To start: NODE_ENV=production node dist/index.js');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildForProduction();