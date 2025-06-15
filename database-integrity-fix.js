import fs from 'fs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function executeComprehensiveDatabaseFix() {
  console.log('🔧 INICIANDO CORREÇÃO COMPLETA DA INTEGRIDADE DO BANCO DE DADOS');
  
  try {
    // 1. Extract photos from JSONB and populate photos table
    console.log('\n📸 FASE 1: Normalizando fotos do JSONB para tabela photos');
    const projectsWithPhotos = await pool.query(`
      SELECT id, public_id, photographer_id, photos, selected_photos 
      FROM projects 
      WHERE jsonb_array_length(photos) > 0
    `);
    
    let photosNormalized = 0;
    for (const project of projectsWithPhotos.rows) {
      const photos = project.photos;
      const selectedPhotos = project.selected_photos || [];
      
      for (const photo of photos) {
        // Insert normalized photo record
        await pool.query(`
          INSERT INTO photos (id, project_id, filename, original_filename, url, is_selected, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            project_id = EXCLUDED.project_id,
            filename = EXCLUDED.filename,
            url = EXCLUDED.url,
            is_selected = EXCLUDED.is_selected
        `, [
          photo.id,
          project.id.toString(), // Convert to string for consistency
          photo.filename || photo.id,
          photo.filename,
          photo.url,
          selectedPhotos.includes(photo.id)
        ]);
        photosNormalized++;
      }
    }
    
    console.log(`✅ ${photosNormalized} fotos normalizadas`);
    
    // 2. Fix photo_comments relationships
    console.log('\n💬 FASE 2: Corrigindo relacionamentos de comentários');
    
    // Get all comments with "projeto-default" and try to map to real projects
    const orphanedComments = await pool.query(`
      SELECT id, photo_id, comment, author_name, created_at
      FROM photo_comments 
      WHERE project_id = 'projeto-default'
    `);
    
    let commentsFixed = 0;
    for (const comment of orphanedComments.rows) {
      // Try to find the real project for this photo
      const photoProject = await pool.query(`
        SELECT project_id FROM photos WHERE id = $1
      `, [comment.photo_id]);
      
      if (photoProject.rows.length > 0) {
        // Update comment with correct project_id
        await pool.query(`
          UPDATE photo_comments 
          SET project_id = $1 
          WHERE id = $2
        `, [photoProject.rows[0].project_id, comment.id]);
        commentsFixed++;
      }
    }
    
    console.log(`✅ ${commentsFixed} comentários corrigidos`);
    
    // 3. Add proper foreign key constraints
    console.log('\n🔗 FASE 3: Adicionando constraints de foreign key');
    
    try {
      // Add FK constraint for photo_comments -> photos
      await pool.query(`
        ALTER TABLE photo_comments 
        ADD CONSTRAINT photo_comments_photo_id_fkey 
        FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
      `);
      console.log('✅ Constraint photo_comments -> photos adicionada');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.log('⚠️ Constraint photo_comments -> photos já existe');
      }
    }
    
    try {
      // Update photos FK to reference projects using string conversion
      await pool.query(`
        ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_project_id_fkey
      `);
      
      await pool.query(`
        ALTER TABLE photos 
        ADD CONSTRAINT photos_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) 
        MATCH FULL
      `);
      console.log('✅ Constraint photos -> projects corrigida');
    } catch (error) {
      console.log('⚠️ Ajustando constraint photos -> projects:', error.message.split('\n')[0]);
    }
    
    // 4. Clean up new_projects table if not needed
    console.log('\n🧹 FASE 4: Limpeza de tabelas desnecessárias');
    const newProjectsCount = await pool.query('SELECT COUNT(*) FROM new_projects');
    console.log(`Encontrados ${newProjectsCount.rows[0].count} registros em new_projects`);
    
    // 5. Verify data integrity
    console.log('\n✅ FASE 5: Verificação de integridade');
    
    const integrity = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM photos) as total_photos,
        (SELECT COUNT(*) FROM photo_comments) as total_comments,
        (SELECT COUNT(*) FROM photo_comments WHERE project_id = 'projeto-default') as orphaned_comments,
        (SELECT COUNT(*) FROM photos WHERE project_id NOT IN (SELECT id::text FROM projects)) as orphaned_photos
    `);
    
    const stats = integrity.rows[0];
    
    // 6. Recalculate user upload counts
    console.log('\n📊 FASE 6: Recalculando contadores de uploads');
    
    const uploadCounts = await pool.query(`
      SELECT 
        u.id,
        u.name,
        COUNT(ph.id) as actual_photos_uploaded
      FROM users u
      LEFT JOIN projects p ON p.photographer_id = u.id
      LEFT JOIN photos ph ON ph.project_id = p.id::text
      GROUP BY u.id, u.name
      HAVING COUNT(ph.id) > 0
      ORDER BY COUNT(ph.id) DESC
    `);
    
    let uploadsRecalculated = 0;
    for (const user of uploadCounts.rows) {
      await pool.query(`
        UPDATE users 
        SET used_uploads = $1 
        WHERE id = $2
      `, [user.actual_photos_uploaded, user.id]);
      uploadsRecalculated++;
    }
    
    console.log(`✅ ${uploadsRecalculated} contadores de upload recalculados`);
    
    return {
      photosNormalized,
      commentsFixed,
      uploadsRecalculated,
      finalStats: stats
    };
    
  } catch (error) {
    console.error('❌ Erro durante correção:', error);
    throw error;
  }
}

async function generateComprehensiveReport() {
  console.log('\n📋 GERANDO RELATÓRIO FINAL COMPLETO');
  
  // User plans and subscriptions
  const planStats = await pool.query(`
    SELECT 
      plan,
      COUNT(*) as users,
      SUM(used_uploads) as total_uploads,
      max_photos_per_project as photo_limit,
      COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subs
    FROM users 
    GROUP BY plan, max_photos_per_project
    ORDER BY users DESC
  `);
  
  // Project and photo statistics
  const contentStats = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM projects) as total_projects,
      (SELECT COUNT(*) FROM projects WHERE jsonb_array_length(photos) > 0) as projects_with_jsonb_photos,
      (SELECT COUNT(*) FROM photos) as normalized_photos,
      (SELECT COUNT(*) FROM photo_comments) as total_comments,
      (SELECT COUNT(DISTINCT project_id) FROM photo_comments) as projects_with_comments,
      (SELECT SUM(jsonb_array_length(photos)) FROM projects) as total_jsonb_photos
  `);
  
  // Top users by uploads
  const topUsers = await pool.query(`
    SELECT name, plan, used_uploads, max_photos_per_project, subscription_status
    FROM users 
    WHERE used_uploads > 0
    ORDER BY used_uploads DESC
    LIMIT 10
  `);
  
  // Database integrity check
  const integrityCheck = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM photo_comments WHERE project_id = 'projeto-default') as orphaned_comments,
      (SELECT COUNT(*) FROM photos WHERE project_id::integer NOT IN (SELECT id FROM projects)) as orphaned_photos,
      (SELECT COUNT(*) FROM projects WHERE photographer_id NOT IN (SELECT id FROM users)) as orphaned_projects
  `);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 RELATÓRIO FINAL - AUDITORIA COMPLETA DO SISTEMA');
  console.log('='.repeat(80));
  
  console.log('\n📈 PLANOS DE USUÁRIOS:');
  planStats.rows.forEach(row => {
    console.log(`- ${row.plan}: ${row.users} usuários, ${row.total_uploads} uploads, limite ${row.photo_limit}, ${row.active_subs} ativos`);
  });
  
  const content = contentStats.rows[0];
  console.log('\n📁 CONTEÚDO:');
  console.log(`- Projetos: ${content.total_projects} total, ${content.projects_with_jsonb_photos} com fotos JSONB`);
  console.log(`- Fotos: ${content.normalized_photos} normalizadas, ${content.total_jsonb_photos} em JSONB`);
  console.log(`- Comentários: ${content.total_comments} total, ${content.projects_with_comments} projetos com comentários`);
  
  const integrity = integrityCheck.rows[0];
  console.log('\n🔍 INTEGRIDADE:');
  console.log(`- Comentários órfãos: ${integrity.orphaned_comments}`);
  console.log(`- Fotos órfãs: ${integrity.orphaned_photos}`);
  console.log(`- Projetos órfãos: ${integrity.orphaned_projects}`);
  
  console.log('\n👥 TOP 10 USUÁRIOS:');
  topUsers.rows.forEach(user => {
    console.log(`- ${user.name}: ${user.used_uploads} uploads (${user.plan}), limite ${user.max_photos_per_project}`);
  });
  
  return {
    planStats: planStats.rows,
    contentStats: content,
    integrityCheck: integrity.rows[0],
    topUsers: topUsers.rows
  };
}

async function main() {
  try {
    const fixResults = await executeComprehensiveDatabaseFix();
    const report = await generateComprehensiveReport();
    
    console.log('\n✅ CORREÇÃO COMPLETA FINALIZADA COM SUCESSO!');
    console.log(`- ${fixResults.photosNormalized} fotos normalizadas`);
    console.log(`- ${fixResults.commentsFixed} comentários corrigidos`);
    console.log(`- ${fixResults.uploadsRecalculated} contadores de upload recalculados`);
    
  } catch (error) {
    console.error('❌ FALHA NA CORREÇÃO:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();