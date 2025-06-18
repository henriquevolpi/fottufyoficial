/**
 * SCRIPT PARA CORRIGIR SINCRONIZAÇÃO DE UPLOADS
 * 
 * Este script corrige a inconsistência entre used_uploads e o número real de fotos
 * É CRÍTICO executar antes de qualquer migração
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function fixUploadSync() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Iniciando correção de sincronização de uploads...');

    // 1. Obter contagem real de fotos por usuário
    const realCountsQuery = `
      SELECT 
        p.photographer_id as user_id,
        COUNT(ph.id) as real_photo_count
      FROM projects p
      LEFT JOIN photos ph ON p.public_id = ph.project_id
      GROUP BY p.photographer_id
    `;

    const realCounts = await pool.query(realCountsQuery);

    // 2. Obter todos os usuários
    const usersQuery = `SELECT id, email, used_uploads FROM users`;
    const users = await pool.query(usersQuery);

    console.log(`📊 Verificando ${users.rows.length} usuários...`);

    let corrected = 0;
    let errors = 0;

    for (const user of users.rows) {
      const realCount = realCounts.rows.find(r => r.user_id === user.id);
      const actualPhotoCount = realCount ? parseInt(realCount.real_photo_count) : 0;
      const currentUsedUploads = user.used_uploads;

      if (currentUsedUploads !== actualPhotoCount) {
        try {
          await pool.query(
            'UPDATE users SET used_uploads = $1 WHERE id = $2',
            [actualPhotoCount, user.id]
          );
          
          console.log(`✅ Usuário ${user.email}: ${currentUsedUploads} → ${actualPhotoCount}`);
          corrected++;
        } catch (error) {
          console.error(`❌ Erro ao corrigir usuário ${user.email}:`, error);
          errors++;
        }
      }
    }

    console.log(`\n🎯 Correção concluída:`);
    console.log(`   ✅ Usuários corrigidos: ${corrected}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log(`   ✨ Sistema agora está sincronizado!`);

  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  } finally {
    await pool.end();
  }
}

// Executar o script
fixUploadSync().catch(console.error);