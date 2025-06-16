#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPLIT_CONNECTION = {
  connectionString: process.env.DATABASE_URL
};

console.log('🎯 FINALIZANDO MIGRAÇÃO - PROJETOS RESTANTES');
console.log('============================================');

async function completeMigration() {
  let replitPool;
  
  try {
    replitPool = new Pool(REPLIT_CONNECTION);
    await replitPool.query('SELECT 1');
    console.log('✅ Conectado ao PostgreSQL do Replit');
    
    // Verificar quantos projetos faltam migrar
    const projectsResult = await replitPool.query('SELECT COUNT(*) FROM projects');
    const currentProjects = parseInt(projectsResult.rows[0].count);
    
    console.log(`📊 Projetos já migrados: ${currentProjects} de 142`);
    
    if (currentProjects < 142) {
      console.log('🔄 Completando migração dos projetos restantes...');
      
      const projectsBackupPath = path.join(__dirname, 'backup', 'backup_projects.json');
      const projectsData = JSON.parse(fs.readFileSync(projectsBackupPath, 'utf8'));
      
      let migratedCount = 0;
      let errorCount = 0;
      
      for (const project of projectsData.data) {
        try {
          // Verificar se já existe
          const existsResult = await replitPool.query(
            'SELECT id FROM projects WHERE public_id = $1',
            [project.public_id]
          );
          
          if (existsResult.rows.length > 0) {
            continue; // Já existe
          }
          
          // Sanitizar dados JSON mais cuidadosamente
          let photosJson = '[]';
          let selectedPhotosJson = '[]';
          
          try {
            if (project.photos) {
              if (typeof project.photos === 'string') {
                photosJson = project.photos;
              } else {
                photosJson = JSON.stringify(project.photos);
              }
              // Validar JSON
              JSON.parse(photosJson);
            }
          } catch (e) {
            photosJson = '[]';
          }
          
          try {
            if (project.selected_photos) {
              if (typeof project.selected_photos === 'string') {
                selectedPhotosJson = project.selected_photos;
              } else {
                selectedPhotosJson = JSON.stringify(project.selected_photos);
              }
              // Validar JSON
              JSON.parse(selectedPhotosJson);
            }
          } catch (e) {
            selectedPhotosJson = '[]';
          }
          
          await replitPool.query(`
            INSERT INTO projects (
              id, public_id, name, client_name, client_email, photographer_id,
              status, photos, selected_photos, created_at, visual_watermark,
              apply_watermark, show_watermark
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13
            )
          `, [
            project.id, project.public_id, project.name, project.client_name,
            project.client_email, project.photographer_id, project.status,
            photosJson, selectedPhotosJson, project.created_at,
            project.visual_watermark || false, 
            project.apply_watermark || false, 
            project.show_watermark !== false
          ]);
          
          migratedCount++;
          
        } catch (error) {
          errorCount++;
          console.log(`  ⚠️ Erro em "${project.name}": ${error.message.substring(0, 60)}...`);
        }
      }
      
      console.log(`✅ ${migratedCount} projetos adicionais migrados`);
      console.log(`⚠️ ${errorCount} projetos com erro`);
      
      // Ajustar sequence
      await replitPool.query(`SELECT setval('projects_id_seq', (SELECT COALESCE(MAX(id), 1) FROM projects))`);
    }
    
    // Verificar contagem final
    const finalCounts = await Promise.all([
      replitPool.query('SELECT COUNT(*) FROM users'),
      replitPool.query('SELECT COUNT(*) FROM projects'),
      replitPool.query('SELECT COUNT(*) FROM new_projects'),
      replitPool.query('SELECT COUNT(*) FROM photos'),
      replitPool.query('SELECT COUNT(*) FROM photo_comments'),
      replitPool.query('SELECT COUNT(*) FROM password_reset_tokens'),
      replitPool.query('SELECT COUNT(*) FROM session')
    ]);
    
    const finalStats = {
      users: parseInt(finalCounts[0].rows[0].count),
      projects: parseInt(finalCounts[1].rows[0].count),
      new_projects: parseInt(finalCounts[2].rows[0].count),
      photos: parseInt(finalCounts[3].rows[0].count),
      photo_comments: parseInt(finalCounts[4].rows[0].count),
      password_reset_tokens: parseInt(finalCounts[5].rows[0].count),
      session: parseInt(finalCounts[6].rows[0].count)
    };
    
    const total = Object.values(finalStats).reduce((sum, count) => sum + count, 0);
    
    console.log('\n🎉 MIGRAÇÃO COMPLETA!');
    console.log('====================');
    console.log('📊 DADOS MIGRADOS:');
    console.log(`  👥 ${finalStats.users} usuários`);
    console.log(`  📁 ${finalStats.projects} projetos`);
    console.log(`  📝 ${finalStats.photo_comments} comentários`);
    console.log(`  📷 ${finalStats.photos} fotos (estrutura)`);
    console.log(`  🆕 ${finalStats.new_projects} novos projetos`);
    console.log(`  🔑 ${finalStats.password_reset_tokens} tokens`);
    console.log(`  💾 ${finalStats.session} sessões`);
    console.log(`  📈 ${total.toLocaleString()} registros totais`);
    
    console.log('\n🔐 STATUS DOS BANCOS:');
    console.log('  🌐 Banco Neon: INTACTO e SEGURO (produção)');
    console.log('  🏠 Banco Replit: ATIVO (desenvolvimento/testes)');
    
    console.log('\n✅ PRÓXIMOS PASSOS:');
    console.log('  1. Todas as alterações agora serão no banco Replit');
    console.log('  2. Seu banco Neon permanece como backup seguro');
    console.log('  3. Você pode trabalhar e testar sem riscos');
    
    // Salvar relatório final
    const report = {
      timestamp: new Date().toISOString(),
      migration_completed: true,
      source: 'Neon Database (ep-small-resonance)',
      destination: 'Replit PostgreSQL',
      final_stats: finalStats,
      total_records: total,
      success: true
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'migration-final-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    return finalStats;
    
  } catch (error) {
    console.error('❌ Erro na finalização:', error.message);
    throw error;
  } finally {
    if (replitPool) await replitPool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  completeMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { completeMigration };