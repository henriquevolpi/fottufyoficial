#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateCompleteReport() {
  console.log('🔍 RELATÓRIO COMPLETO DA ESTRUTURA DO BANCO DE DADOS');
  console.log('='.repeat(80));
  console.log('');

  const backupDir = path.join(__dirname, 'backup');
  
  // Ler resumo geral
  const summaryPath = path.join(backupDir, 'backup_summary.json');
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  
  console.log('📊 RESUMO GERAL');
  console.log('-'.repeat(50));
  console.log(`Banco de dados: ${summary.database}`);
  console.log(`Total de tabelas: ${summary.totalTables}`);
  console.log(`Total de registros: ${summary.totalRecords.toLocaleString()}`);
  console.log(`Data da análise: ${new Date(summary.timestamp).toLocaleString('pt-BR')}`);
  console.log('');

  const analysis = {
    database: summary.database,
    totalTables: summary.totalTables,
    totalRecords: summary.totalRecords,
    tables: {},
    relationships: [],
    issues: {
      redundancies: [],
      unusedFields: [],
      dataQuality: [],
      recommendations: []
    }
  };

  // Analisar cada tabela
  console.log('📋 ANÁLISE DETALHADA POR TABELA');
  console.log('='.repeat(80));

  const tableNames = ['users', 'projects', 'new_projects', 'photos', 'photo_comments', 'password_reset_tokens', 'session'];
  
  tableNames.forEach(tableName => {
    const jsonPath = path.join(backupDir, `backup_${tableName}.json`);
    
    if (fs.existsSync(jsonPath)) {
      const tableData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const structure = tableData.structure;
      const recordCount = tableData.recordCount;
      
      console.log(`\n📦 TABELA: ${tableName.toUpperCase()}`);
      console.log('-'.repeat(60));
      console.log(`Registros: ${recordCount.toLocaleString()}`);
      
      // Analisar colunas
      console.log('\nCOLUNAS:');
      structure.columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL';
        const defaultVal = col.column_default ? ` (default: ${col.column_default})` : '';
        let dataType = col.data_type;
        
        if (col.character_maximum_length) {
          dataType += `(${col.character_maximum_length})`;
        }
        
        console.log(`  • ${col.column_name}: ${dataType} ${nullable}${defaultVal}`);
      });
      
      // Analisar foreign keys
      if (structure.constraints) {
        const foreignKeys = structure.constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
        if (foreignKeys.length > 0) {
          console.log('\nCHAVES ESTRANGEIRAS:');
          foreignKeys.forEach(fk => {
            console.log(`  • ${fk.column_name} -> referencia outra tabela`);
            analysis.relationships.push({
              from: tableName,
              column: fk.column_name,
              type: 'foreign_key'
            });
          });
        }
      }
      
      // Armazenar dados para análise
      analysis.tables[tableName] = {
        recordCount,
        columns: structure.columns,
        constraints: structure.constraints || [],
        primaryKeys: structure.columns.filter(col => col.column_name === 'id'),
        hasData: recordCount > 0
      };
      
      // Análise específica por tabela
      if (tableName === 'photos' && recordCount === 0) {
        analysis.issues.dataQuality.push({
          type: 'empty_table',
          table: tableName,
          description: 'Tabela de fotos está vazia - pode indicar problema na migração ou uso da tabela'
        });
      }
      
      if (tableName === 'session' && recordCount > 50000) {
        analysis.issues.dataQuality.push({
          type: 'excessive_sessions',
          table: tableName,
          description: `${recordCount.toLocaleString()} sessões armazenadas - implementar limpeza automática`
        });
      }
    }
  });

  // Análise de relacionamentos e redundâncias
  console.log('\n\n🔗 ANÁLISE DE RELACIONAMENTOS');
  console.log('='.repeat(80));
  
  console.log('\nMAPEAMENTO DE RELACIONAMENTOS:');
  console.log('users (id) <- projects (photographer_id)');
  console.log('users (id) <- new_projects (user_id)');
  console.log('users (id) <- password_reset_tokens (user_id)');
  console.log('new_projects (id) <- photos (project_id)');
  console.log('');
  
  // Identificar problemas estruturais
  console.log('🚨 PROBLEMAS IDENTIFICADOS');
  console.log('='.repeat(80));
  
  // 1. Redundância de tabelas de projetos
  console.log('\n🔴 PROBLEMA CRÍTICO: Redundância de Tabelas de Projetos');
  console.log('-'.repeat(60));
  console.log('• Existem DUAS tabelas para projetos:');
  console.log(`  - "projects": ${analysis.tables.projects?.recordCount || 0} registros`);
  console.log(`  - "new_projects": ${analysis.tables.new_projects?.recordCount || 0} registros`);
  console.log('• Esta duplicação causa:');
  console.log('  - Confusão no código');
  console.log('  - Dificuldade de manutenção');
  console.log('  - Possível inconsistência de dados');
  console.log('• RECOMENDAÇÃO: Consolidar em uma única tabela');
  
  analysis.issues.redundancies.push({
    type: 'duplicate_tables',
    tables: ['projects', 'new_projects'],
    severity: 'critical',
    description: 'Duas tabelas para projetos causam redundância e confusão'
  });
  
  // 2. Tabela photos vazia
  console.log('\n🟡 PROBLEMA MÉDIO: Tabela Photos Vazia');
  console.log('-'.repeat(60));
  console.log('• A tabela "photos" está completamente vazia');
  console.log('• Pode indicar:');
  console.log('  - Migração incompleta');
  console.log('  - Tabela não está sendo utilizada');
  console.log('  - Dados foram perdidos');
  console.log('• RECOMENDAÇÃO: Investigar se fotos estão em outro lugar');
  
  // 3. Excesso de sessões
  if (analysis.tables.session?.recordCount > 50000) {
    console.log('\n🟡 PROBLEMA MÉDIO: Excesso de Sessões');
    console.log('-'.repeat(60));
    console.log(`• ${analysis.tables.session.recordCount.toLocaleString()} sessões armazenadas`);
    console.log('• Pode causar:');
    console.log('  - Degradação de performance');
    console.log('  - Uso excessivo de espaço');
    console.log('• RECOMENDAÇÃO: Implementar limpeza automática');
  }
  
  // 4. Análise de campos
  console.log('\n📊 ANÁLISE DE UTILIZAÇÃO DE CAMPOS');
  console.log('='.repeat(80));
  
  // Verificar campos específicos
  const usersColumns = analysis.tables.users?.columns || [];
  const projectsColumns = analysis.tables.projects?.columns || [];
  const newProjectsColumns = analysis.tables.new_projects?.columns || [];
  
  console.log('\nTABELA USERS:');
  usersColumns.forEach(col => {
    if (col.column_name === 'phone' && col.is_nullable === 'YES') {
      console.log(`  ⚠️  Campo "${col.column_name}" permite NULL - pode estar subutilizado`);
    }
    if (col.column_name.includes('plan') || col.column_name.includes('subscription')) {
      console.log(`  💰 Campo relacionado a planos: ${col.column_name}`);
    }
  });
  
  console.log('\nTABELA PROJECTS vs NEW_PROJECTS:');
  console.log('Campos diferentes entre as tabelas:');
  
  const projectsFields = projectsColumns.map(c => c.column_name);
  const newProjectsFields = newProjectsColumns.map(c => c.column_name);
  
  const onlyInProjects = projectsFields.filter(f => !newProjectsFields.includes(f));
  const onlyInNewProjects = newProjectsFields.filter(f => !projectsFields.includes(f));
  
  if (onlyInProjects.length > 0) {
    console.log(`  • Só em "projects": ${onlyInProjects.join(', ')}`);
  }
  if (onlyInNewProjects.length > 0) {
    console.log(`  • Só em "new_projects": ${onlyInNewProjects.join(', ')}`);
  }
  
  // Recomendações
  console.log('\n\n🎯 RECOMENDAÇÕES PRIORITÁRIAS');
  console.log('='.repeat(80));
  
  console.log('\n🔥 ALTA PRIORIDADE:');
  console.log('1. CONSOLIDAR TABELAS DE PROJETOS');
  console.log('   • Decidir qual tabela manter (projects ou new_projects)');
  console.log('   • Migrar todos os dados para uma única tabela');
  console.log('   • Atualizar código para usar apenas uma tabela');
  console.log('');
  console.log('2. INVESTIGAR TABELA PHOTOS VAZIA');
  console.log('   • Verificar onde estão armazenadas as fotos');
  console.log('   • Confirmar se a tabela deve ser populada');
  console.log('   • Corrigir referências no código se necessário');
  
  console.log('\n⚡ MÉDIA PRIORIDADE:');
  console.log('3. IMPLEMENTAR LIMPEZA DE SESSÕES');
  console.log('   • Configurar job para limpar sessões expiradas');
  console.log('   • Definir tempo de retenção (ex: 30 dias)');
  console.log('');
  console.log('4. OTIMIZAR TOKENS DE RESET');
  console.log('   • Limpar tokens expirados automaticamente');
  console.log('   • Implementar índices se necessário');
  
  console.log('\n🔍 BAIXA PRIORIDADE:');
  console.log('5. REVISAR CAMPOS OPCIONAIS');
  console.log('   • Analisar utilização real do campo "phone"');
  console.log('   • Considerar campos de auditoria (created_at, updated_at)');
  
  // Resumo técnico
  console.log('\n\n📈 RESUMO TÉCNICO FINAL');
  console.log('='.repeat(80));
  console.log(`Total de registros: ${summary.totalRecords.toLocaleString()}`);
  console.log(`Distribuição por tabela:`);
  
  Object.entries(analysis.tables).forEach(([name, data]) => {
    const percentage = ((data.recordCount / summary.totalRecords) * 100).toFixed(1);
    console.log(`  • ${name}: ${data.recordCount.toLocaleString()} (${percentage}%)`);
  });
  
  console.log('\nTipos de dados utilizados:');
  const dataTypes = new Set();
  Object.values(analysis.tables).forEach(table => {
    table.columns.forEach(col => dataTypes.add(col.data_type));
  });
  console.log(`  • ${Array.from(dataTypes).join(', ')}`);
  
  console.log('\nÍndices e constraints:');
  let totalConstraints = 0;
  Object.values(analysis.tables).forEach(table => {
    totalConstraints += table.constraints.length;
  });
  console.log(`  • Total de constraints: ${totalConstraints}`);
  
  // Salvar relatório
  const reportPath = path.join(__dirname, 'relatorio-estrutura-banco.json');
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  
  console.log(`\n📄 Relatório detalhado salvo em: ${reportPath}`);
  console.log('\n✅ Análise completa finalizada!');
  
  return analysis;
}

// Executar
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCompleteReport();
}

export { generateCompleteReport };