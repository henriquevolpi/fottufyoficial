/**
 * CORREÇÃO DE FOTOS ÓRFÃS
 * 
 * Remove fotos que não têm projetos correspondentes para manter integridade referencial
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function fixOrphanPhotos() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Iniciando correção de fotos órfãs...');

    // 1. Identificar fotos órfãs
    const orphanQuery = `
      SELECT 
        ph.id,
        ph.project_id,
        ph.url,
        ph.filename
      FROM photos ph 
      LEFT JOIN projects p ON ph.project_id = p.public_id 
      WHERE p.id IS NULL
    `;
    
    const orphanResult = await pool.query(orphanQuery);
    const orphanPhotos = orphanResult.rows;
    
    console.log(`📊 Encontradas ${orphanPhotos.length} fotos órfãs`);
    
    if (orphanPhotos.length === 0) {
      console.log('✅ Nenhuma foto órfã encontrada - sistema íntegro');
      return;
    }

    // 2. Agrupar por project_id órfão para análise
    const projectGroups = {};
    orphanPhotos.forEach(photo => {
      if (!projectGroups[photo.project_id]) {
        projectGroups[photo.project_id] = [];
      }
      projectGroups[photo.project_id].push(photo);
    });

    console.log('\n📋 Análise por project_id órfão:');
    Object.entries(projectGroups).forEach(([projectId, photos]) => {
      console.log(`   ${projectId}: ${photos.length} fotos`);
    });

    // 3. Confirmar remoção e executar
    console.log('\n🗑️ Removendo fotos órfãs...');
    
    const deleteQuery = `
      DELETE FROM photos 
      WHERE id IN (
        SELECT ph.id 
        FROM photos ph 
        LEFT JOIN projects p ON ph.project_id = p.public_id 
        WHERE p.id IS NULL
      )
    `;
    
    const deleteResult = await pool.query(deleteQuery);
    console.log(`✅ ${deleteResult.rowCount} fotos órfãs removidas com sucesso`);

    // 4. Verificar integridade final
    const verifyQuery = `
      SELECT COUNT(*) as remaining_orphans 
      FROM photos ph 
      LEFT JOIN projects p ON ph.project_id = p.public_id 
      WHERE p.id IS NULL
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    const remainingOrphans = parseInt(verifyResult.rows[0].remaining_orphans);
    
    if (remainingOrphans === 0) {
      console.log('✅ Integridade referencial restaurada - sistema 100% íntegro');
    } else {
      console.log(`⚠️ Ainda restam ${remainingOrphans} fotos órfãs`);
    }

    // 5. Atualizar contadores de upload dos usuários após limpeza
    console.log('\n🔄 Sincronizando contadores de upload após limpeza...');
    
    const updateCountersQuery = `
      UPDATE users 
      SET used_uploads = COALESCE(real_count.photos, 0)
      FROM (
        SELECT 
          p.photographer_id,
          COUNT(ph.id) as photos
        FROM projects p
        LEFT JOIN photos ph ON p.public_id = ph.project_id
        GROUP BY p.photographer_id
      ) real_count 
      WHERE users.id = real_count.photographer_id
    `;
    
    const updateResult = await pool.query(updateCountersQuery);
    console.log(`✅ Contadores atualizados para ${updateResult.rowCount} usuários`);

    console.log('\n🎯 Correção de fotos órfãs concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  } finally {
    await pool.end();
  }
}

fixOrphanPhotos().catch(console.error);