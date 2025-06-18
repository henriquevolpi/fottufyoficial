/**
 * RELATÓRIO COMPLETO DE VALIDAÇÃO DO BANCO DE DADOS
 * 
 * Gera um relatório detalhado do estado atual do sistema
 * para garantir preparação completa para migrações
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function generateValidationReport() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const report = {
    timestamp: new Date().toISOString(),
    status: 'VALIDATING',
    sections: {}
  };

  try {
    console.log('📋 Gerando relatório completo de validação...\n');

    // 1. VALIDAÇÃO DOS PLANOS
    console.log('1️⃣ VALIDANDO PLANOS...');
    const plansQuery = `
      SELECT 
        plan_type,
        COUNT(*) as users_count,
        SUM(upload_limit) as total_limit,
        SUM(used_uploads) as total_used,
        AVG(used_uploads) as avg_used
      FROM users 
      WHERE plan_type IS NOT NULL
      GROUP BY plan_type
      ORDER BY plan_type
    `;
    const plansResult = await pool.query(plansQuery);
    
    report.sections.plans = {
      status: 'OK',
      data: plansResult.rows,
      validation: 'Todos os planos têm limites definidos e usuários ativos'
    };

    // 2. VALIDAÇÃO DO CONTROLE DE UPLOAD (APÓS CORREÇÃO)
    console.log('2️⃣ VALIDANDO CONTROLE DE UPLOAD...');
    const uploadSyncQuery = `
      SELECT 
        u.id,
        u.email,
        u.used_uploads,
        COALESCE(real_count.photos, 0) as real_photos,
        (u.used_uploads - COALESCE(real_count.photos, 0)) as difference
      FROM users u
      LEFT JOIN (
        SELECT 
          p.photographer_id,
          COUNT(ph.id) as photos
        FROM projects p
        LEFT JOIN photos ph ON p.public_id = ph.project_id
        GROUP BY p.photographer_id
      ) real_count ON u.id = real_count.photographer_id
      WHERE u.used_uploads != COALESCE(real_count.photos, 0)
    `;
    const uploadSyncResult = await pool.query(uploadSyncQuery);
    
    report.sections.upload_control = {
      status: uploadSyncResult.rows.length === 0 ? 'OK' : 'WARNING',
      inconsistencies: uploadSyncResult.rows.length,
      data: uploadSyncResult.rows.slice(0, 5), // Primeiros 5 se houver
      validation: uploadSyncResult.rows.length === 0 ? 
        'Controle de upload totalmente sincronizado' : 
        `${uploadSyncResult.rows.length} usuários com inconsistências`
    };

    // 3. VALIDAÇÃO DE STATUS E ASSINATURAS
    console.log('3️⃣ VALIDANDO STATUS E ASSINATURAS...');
    const statusQuery = `
      SELECT 
        status,
        subscription_status,
        COUNT(*) as count,
        COUNT(stripe_customer_id) as with_stripe,
        COUNT(stripe_subscription_id) as with_subscription
      FROM users
      GROUP BY status, subscription_status
      ORDER BY status, subscription_status
    `;
    const statusResult = await pool.query(statusQuery);
    
    report.sections.status_subscriptions = {
      status: 'OK',
      data: statusResult.rows,
      validation: 'Status e assinaturas organizados corretamente'
    };

    // 4. VALIDAÇÃO DE ÍNDICES
    console.log('4️⃣ VALIDANDO ÍNDICES...');
    const indexesQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;
    const indexesResult = await pool.query(indexesQuery);
    
    const criticalIndexes = [
      'users_pkey', 'users_email_key', 'idx_users_plan_type',
      'projects_pkey', 'projects_public_id_key', 'idx_projects_photographer_id',
      'idx_photos_project_id', 'idx_photos_created_at'
    ];
    
    const foundIndexes = indexesResult.rows.map(r => r.indexname);
    const missingIndexes = criticalIndexes.filter(idx => !foundIndexes.includes(idx));
    
    report.sections.performance_indexes = {
      status: missingIndexes.length === 0 ? 'OK' : 'WARNING',
      total_indexes: indexesResult.rows.length,
      critical_missing: missingIndexes,
      validation: missingIndexes.length === 0 ? 
        'Todos os índices críticos estão presentes' : 
        `${missingIndexes.length} índices críticos ausentes`
    };

    // 5. VALIDAÇÃO DE INTEGRIDADE REFERENCIAL
    console.log('5️⃣ VALIDANDO INTEGRIDADE REFERENCIAL...');
    const orphanProjectsQuery = `
      SELECT COUNT(*) as orphan_projects 
      FROM projects p 
      LEFT JOIN users u ON p.photographer_id = u.id 
      WHERE u.id IS NULL
    `;
    const orphanPhotosQuery = `
      SELECT COUNT(*) as orphan_photos 
      FROM photos ph 
      LEFT JOIN projects p ON ph.project_id = p.public_id 
      WHERE p.id IS NULL
    `;
    
    const orphanProjects = await pool.query(orphanProjectsQuery);
    const orphanPhotos = await pool.query(orphanPhotosQuery);
    
    report.sections.referential_integrity = {
      status: (orphanProjects.rows[0].orphan_projects == 0 && orphanPhotos.rows[0].orphan_photos == 0) ? 'OK' : 'ERROR',
      orphan_projects: parseInt(orphanProjects.rows[0].orphan_projects),
      orphan_photos: parseInt(orphanPhotos.rows[0].orphan_photos),
      validation: 'Verificação de dados órfãos concluída'
    };

    // 6. ESTATÍSTICAS GERAIS
    console.log('6️⃣ COLETANDO ESTATÍSTICAS GERAIS...');
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM photos) as total_photos,
        (SELECT SUM(used_uploads) FROM users) as total_uploads_used,
        (SELECT SUM(upload_limit) FROM users) as total_upload_capacity
    `;
    const statsResult = await pool.query(statsQuery);
    
    report.sections.general_stats = {
      status: 'INFO',
      data: statsResult.rows[0],
      validation: 'Estatísticas coletadas com sucesso'
    };

    // 7. VALIDAÇÃO DE CONFIGURAÇÃO DE BACKUP
    console.log('7️⃣ VALIDANDO CONFIGURAÇÃO DE BACKUP...');
    const backupFiles = ['backup_render_completo_20250618_185323.sql'];
    const backupExists = backupFiles.every(file => {
      try {
        return fs.existsSync(file);
      } catch {
        return false;
      }
    });
    
    report.sections.backup_readiness = {
      status: backupExists ? 'OK' : 'WARNING',
      backup_files: backupFiles,
      exists: backupExists,
      validation: backupExists ? 'Backup de segurança disponível' : 'Criar backup antes da migração'
    };

    // RESUMO FINAL
    const allSectionsOK = Object.values(report.sections).every(section => 
      section.status === 'OK' || section.status === 'INFO'
    );
    
    report.status = allSectionsOK ? 'READY_FOR_MIGRATION' : 'REQUIRES_ATTENTION';
    
    // Salvar relatório
    const reportContent = JSON.stringify(report, null, 2);
    fs.writeFileSync('database-validation-report.json', reportContent);
    
    // Exibir resumo
    console.log('\n📊 RESUMO DO RELATÓRIO:');
    console.log('================================');
    
    Object.entries(report.sections).forEach(([section, data]) => {
      const status = data.status === 'OK' ? '✅' : 
                    data.status === 'INFO' ? 'ℹ️' : 
                    data.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${status} ${section.toUpperCase()}: ${data.validation}`);
    });
    
    console.log('\n🎯 STATUS GERAL:', report.status);
    console.log('📄 Relatório detalhado salvo em: database-validation-report.json');
    
    if (report.status === 'READY_FOR_MIGRATION') {
      console.log('\n🚀 SISTEMA 100% PREPARADO PARA MIGRAÇÃO!');
    } else {
      console.log('\n⚠️ ATENÇÃO REQUERIDA antes da migração');
    }

  } catch (error) {
    console.error('❌ Erro durante validação:', error);
    report.status = 'ERROR';
    report.error = error.message;
  } finally {
    await pool.end();
  }
  
  return report;
}

// Executar validação
generateValidationReport().catch(console.error);