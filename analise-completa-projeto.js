#!/usr/bin/env node

/**
 * ANÁLISE COMPLETA DO PROJETO FOTTUFY
 * 
 * Este script analisa toda a estrutura do projeto para identificar:
 * - Problemas de código e arquitetura
 * - Rotas com problemas ou inconsistências
 * - Dependências desnecessárias ou conflitos
 * - Oportunidades de otimização
 * - Issues de segurança
 * - Estrutura de banco de dados
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 INICIANDO ANÁLISE COMPLETA DO PROJETO FOTTUFY');
console.log('================================================\n');

// Função para ler arquivos de forma segura
function readFileSync(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

// Função para listar arquivos em um diretório
function listFiles(dir, extension = '') {
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    return files
      .filter(file => file.isFile() && (extension === '' || file.name.endsWith(extension)))
      .map(file => path.join(dir, file.name));
  } catch (error) {
    return [];
  }
}

// Análise do package.json
function analyzePackageJson() {
  console.log('📦 ANÁLISE DO PACKAGE.JSON');
  console.log('===========================');
  
  const packageJson = readFileSync('package.json');
  if (!packageJson) {
    console.log('❌ package.json não encontrado');
    return;
  }
  
  const pkg = JSON.parse(packageJson);
  const dependencies = Object.keys(pkg.dependencies || {});
  const devDependencies = Object.keys(pkg.devDependencies || {});
  
  console.log(`✅ Total de dependências: ${dependencies.length}`);
  console.log(`✅ Total de devDependencies: ${devDependencies.length}`);
  
  // Procurar por dependências potencialmente problemáticas
  const problematicDeps = dependencies.filter(dep => 
    dep.includes('test') || 
    dep.includes('mock') || 
    dep.includes('dev') ||
    dep.includes('debug')
  );
  
  if (problematicDeps.length > 0) {
    console.log('⚠️  Dependências potencialmente problemáticas:', problematicDeps);
  }
  
  // Verificar duplicações
  const allDeps = [...dependencies, ...devDependencies];
  const duplicates = allDeps.filter((item, index) => allDeps.indexOf(item) !== index);
  if (duplicates.length > 0) {
    console.log('❌ Dependências duplicadas:', duplicates);
  }
  
  console.log('');
}

// Análise das rotas do servidor
function analyzeServerRoutes() {
  console.log('🛣️  ANÁLISE DAS ROTAS DO SERVIDOR');
  console.log('==================================');
  
  const routesFile = readFileSync('server/routes.ts');
  if (!routesFile) {
    console.log('❌ server/routes.ts não encontrado');
    return;
  }
  
  // Contar rotas por método
  const routes = {
    GET: (routesFile.match(/app\.get\(/g) || []).length,
    POST: (routesFile.match(/app\.post\(/g) || []).length,
    PUT: (routesFile.match(/app\.put\(/g) || []).length,
    DELETE: (routesFile.match(/app\.delete\(/g) || []).length,
    PATCH: (routesFile.match(/app\.patch\(/g) || []).length
  };
  
  console.log('📊 Contagem de rotas por método:');
  Object.entries(routes).forEach(([method, count]) => {
    console.log(`   ${method}: ${count} rotas`);
  });
  
  // Verificar middleware de autenticação
  const authMiddleware = (routesFile.match(/authenticate/g) || []).length;
  const adminMiddleware = (routesFile.match(/requireAdmin/g) || []).length;
  
  console.log(`🔒 Rotas com autenticação: ${authMiddleware}`);
  console.log(`👑 Rotas que requerem admin: ${adminMiddleware}`);
  
  // Procurar por rotas sem validação
  const unsafePatterns = [
    'req.body',
    'req.params',
    'req.query'
  ];
  
  unsafePatterns.forEach(pattern => {
    const matches = (routesFile.match(new RegExp(pattern, 'g')) || []).length;
    if (matches > 10) {
      console.log(`⚠️  Uso excessivo de ${pattern}: ${matches} ocorrências (possível falta de validação)`);
    }
  });
  
  // Verificar tratamento de erros
  const errorHandling = (routesFile.match(/catch\s*\(/g) || []).length;
  const totalRoutes = Object.values(routes).reduce((a, b) => a + b, 0);
  
  if (errorHandling < totalRoutes * 0.8) {
    console.log(`⚠️  Possível falta de tratamento de erro: ${errorHandling} handlers para ${totalRoutes} rotas`);
  }
  
  console.log('');
}

// Análise do schema do banco
function analyzeSchema() {
  console.log('🗄️  ANÁLISE DO SCHEMA DO BANCO');
  console.log('=============================');
  
  const schemaFile = readFileSync('shared/schema.ts');
  if (!schemaFile) {
    console.log('❌ shared/schema.ts não encontrado');
    return;
  }
  
  // Contar tabelas
  const tables = (schemaFile.match(/= pgTable\(/g) || []).length;
  console.log(`📋 Total de tabelas definidas: ${tables}`);
  
  // Verificar relações
  const relations = (schemaFile.match(/Relations = relations\(/g) || []).length;
  console.log(`🔗 Total de relações definidas: ${relations}`);
  
  // Verificar índices
  const indexes = (schemaFile.match(/index\(/g) || []).length;
  console.log(`📇 Total de índices definidos: ${indexes}`);
  
  if (indexes < tables) {
    console.log('⚠️  Possível falta de índices - considere adicionar para melhor performance');
  }
  
  console.log('');
}

// Análise dos arquivos do cliente
function analyzeClientFiles() {
  console.log('🖥️  ANÁLISE DOS ARQUIVOS DO CLIENTE');
  console.log('===================================');
  
  const clientFiles = listFiles('client/src', '.tsx').concat(listFiles('client/src', '.ts'));
  console.log(`📁 Total de arquivos TS/TSX no cliente: ${clientFiles.length}`);
  
  // Análise dos componentes
  let totalComponents = 0;
  let filesWithErrors = 0;
  let totalLinesOfCode = 0;
  
  clientFiles.forEach(file => {
    const content = readFileSync(file);
    if (content) {
      totalLinesOfCode += content.split('\n').length;
      
      // Contar componentes React
      const components = (content.match(/function\s+[A-Z][a-zA-Z]*\s*\(/g) || []).length;
      const arrowComponents = (content.match(/const\s+[A-Z][a-zA-Z]*\s*[=:][^=]*=>/g) || []).length;
      totalComponents += components + arrowComponents;
      
      // Verificar possíveis problemas
      if (content.includes('any') && content.includes('any').length > 5) {
        filesWithErrors++;
      }
    }
  });
  
  console.log(`⚛️  Total de componentes React: ${totalComponents}`);
  console.log(`📝 Total de linhas de código: ${totalLinesOfCode}`);
  
  if (filesWithErrors > 0) {
    console.log(`⚠️  Arquivos com possíveis problemas de tipagem: ${filesWithErrors}`);
  }
  
  console.log('');
}

// Análise de segurança
function analyzeSecurity() {
  console.log('🔐 ANÁLISE DE SEGURANÇA');
  console.log('=======================');
  
  const serverFiles = [
    'server/index.ts',
    'server/routes.ts',
    'server/auth.ts',
    'server/storage.ts'
  ];
  
  let securityIssues = [];
  
  serverFiles.forEach(file => {
    const content = readFileSync(file);
    if (content) {
      // Verificar logs de senhas
      if (content.includes('password') && content.includes('console.log')) {
        securityIssues.push(`❌ Possível log de senha em ${file}`);
      }
      
      // Verificar SQL injection
      if (content.includes('${') && content.includes('query')) {
        securityIssues.push(`⚠️  Possível SQL injection em ${file}`);
      }
      
      // Verificar validação de entrada
      if (content.includes('req.body') && !content.includes('parse') && !content.includes('validate')) {
        securityIssues.push(`⚠️  Validação de entrada ausente em ${file}`);
      }
    }
  });
  
  if (securityIssues.length === 0) {
    console.log('✅ Nenhum problema óbvio de segurança encontrado');
  } else {
    securityIssues.forEach(issue => console.log(issue));
  }
  
  console.log('');
}

// Análise de performance
function analyzePerformance() {
  console.log('⚡ ANÁLISE DE PERFORMANCE');
  console.log('=========================');
  
  const routesContent = readFileSync('server/routes.ts');
  const storageContent = readFileSync('server/storage.ts');
  
  let performanceIssues = [];
  
  if (routesContent) {
    // Verificar loops síncronos
    if (routesContent.includes('for (') && routesContent.includes('await')) {
      performanceIssues.push('⚠️  Loops síncronos com await podem causar lentidão');
    }
    
    // Verificar múltiplas queries sequenciais
    const awaitQueries = (routesContent.match(/await.*query/g) || []).length;
    if (awaitQueries > 50) {
      performanceIssues.push(`⚠️  Muitas queries sequenciais: ${awaitQueries}`);
    }
  }
  
  if (storageContent) {
    // Verificar cache implementation
    if (!storageContent.includes('cache') && !storageContent.includes('Cache')) {
      performanceIssues.push('💡 Considere implementar cache para melhor performance');
    }
  }
  
  if (performanceIssues.length === 0) {
    console.log('✅ Nenhum problema óbvio de performance encontrado');
  } else {
    performanceIssues.forEach(issue => console.log(issue));
  }
  
  console.log('');
}

// Análise de estrutura de arquivos
function analyzeFileStructure() {
  console.log('📂 ANÁLISE DA ESTRUTURA DE ARQUIVOS');
  console.log('====================================');
  
  const directories = [
    'server',
    'client/src',
    'shared',
    'public',
    'migrations'
  ];
  
  directories.forEach(dir => {
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      const fileCount = files.filter(f => f.isFile()).length;
      const dirCount = files.filter(f => f.isDirectory()).length;
      
      console.log(`📁 ${dir}: ${fileCount} arquivos, ${dirCount} diretórios`);
      
      if (fileCount > 20) {
        console.log(`   ⚠️  Muitos arquivos em ${dir} - considere reorganizar`);
      }
    } catch (error) {
      console.log(`   ❌ Diretório ${dir} não encontrado`);
    }
  });
  
  console.log('');
}

// Função principal
function runAnalysis() {
  analyzePackageJson();
  analyzeServerRoutes();
  analyzeSchema();
  analyzeClientFiles();
  analyzeSecurity();
  analyzePerformance();
  analyzeFileStructure();
  
  console.log('🎯 RESUMO DA ANÁLISE');
  console.log('===================');
  console.log('A análise foi concluída. Verifique os itens marcados com ⚠️ e ❌ para melhorias.');
  console.log('');
}

// Executar análise
runAnalysis();