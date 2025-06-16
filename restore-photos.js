import fs from 'fs';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function restorePhotosData() {
  console.log('🔄 Iniciando restauração dos dados de fotos...');
  
  try {
    // Read the backup data
    const backupData = JSON.parse(fs.readFileSync('backup/backup_projects.json', 'utf8'));
    const projects = backupData.data;
    
    console.log(`📊 Encontrados ${projects.length} projetos no backup`);
    
    let projectsWithPhotos = 0;
    let totalPhotosRestored = 0;
    let totalSelectedPhotos = 0;
    
    for (const project of projects) {
      if (project.photos && project.photos.length > 0) {
        projectsWithPhotos++;
        totalPhotosRestored += project.photos.length;
        
        if (project.selected_photos) {
          totalSelectedPhotos += project.selected_photos.length;
        }
        
        // Update the project in Render database with photos and selected_photos
        await pool.query(
          `UPDATE projects 
           SET photos = $1::jsonb, 
               selected_photos = $2::jsonb,
               visual_watermark = $3,
               apply_watermark = $4
           WHERE id = $5`,
          [
            JSON.stringify(project.photos),
            JSON.stringify(project.selected_photos || []),
            project.visual_watermark || false,
            project.apply_watermark || false,
            project.id
          ]
        );
        
        console.log(`✅ Projeto ID ${project.id} (${project.name}): ${project.photos.length} fotos, ${(project.selected_photos || []).length} selecionadas`);
      }
    }
    
    console.log('\n📈 RESUMO DA RESTAURAÇÃO:');
    console.log(`- Projetos com fotos: ${projectsWithPhotos}`);
    console.log(`- Total de fotos restauradas: ${totalPhotosRestored}`);
    console.log(`- Total de fotos selecionadas: ${totalSelectedPhotos}`);
    
    return {
      projectsWithPhotos,
      totalPhotosRestored,
      totalSelectedPhotos
    };
    
  } catch (error) {
    console.error('❌ Erro durante a restauração:', error);
    throw error;
  }
}

async function verifyData() {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN jsonb_array_length(photos) > 0 THEN 1 END) as projects_with_photos,
        SUM(jsonb_array_length(photos)) as total_photos,
        SUM(jsonb_array_length(selected_photos)) as total_selected
      FROM projects
    `);
    
    console.log('\n🔍 VERIFICAÇÃO FINAL:');
    console.log(`- Total de projetos: ${result.rows[0].total_projects}`);
    console.log(`- Projetos com fotos: ${result.rows[0].projects_with_photos}`);
    console.log(`- Total de fotos: ${result.rows[0].total_photos}`);
    console.log(`- Total de fotos selecionadas: ${result.rows[0].total_selected}`);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    throw error;
  }
}

async function main() {
  try {
    await restorePhotosData();
    await verifyData();
    console.log('\n✅ Restauração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Falha na restauração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();