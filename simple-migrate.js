#!/usr/bin/env node

import { Pool } from 'pg';

const NEON_DB = "postgresql://neondb_owner:npg_wqC0LP7yRHlT@ep-small-resonance-a45diqst-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const RENDER_DB = "postgresql://fottufy_user:ls7dGvLeojlTv0YpxclVRMYWhpNfwLKy@dpg-d17j2fgdl3ps73ahtrs0-a.oregon-postgres.render.com/fottufy";

const neonPool = new Pool({ connectionString: NEON_DB, ssl: { rejectUnauthorized: false } });
const renderPool = new Pool({ connectionString: RENDER_DB, ssl: { rejectUnauthorized: false } });

async function migrateUsers() {
  console.log('Migrando usuários...');
  const neonClient = await neonPool.connect();
  const renderClient = await renderPool.connect();
  
  try {
    const result = await neonClient.query(`
      SELECT id, name, email, password, role, phone, plan, is_active, 
             created_at, updated_at, plan_expires_at, max_projects, max_photos_per_project
      FROM users ORDER BY id
    `);
    
    let migrated = 0;
    for (const user of result.rows) {
      try {
        await renderClient.query(`
          INSERT INTO users (id, name, email, password, role, phone, plan, is_active, 
                           created_at, updated_at, plan_expires_at, max_projects, max_photos_per_project)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [user.id, user.name, user.email, user.password, user.role, user.phone, 
            user.plan, user.is_active, user.created_at, user.updated_at, 
            user.plan_expires_at, user.max_projects, user.max_photos_per_project]);
        migrated++;
      } catch (err) {
        if (err.code !== '23505') console.log(`Erro usuário ${user.id}: ${err.message}`);
      }
    }
    console.log(`✓ ${migrated} usuários migrados`);
  } finally {
    neonClient.release();
    renderClient.release();
  }
}

async function migrateProjects() {
  console.log('Migrando projetos...');
  const neonClient = await neonPool.connect();
  const renderClient = await renderPool.connect();
  
  try {
    const result = await neonClient.query(`
      SELECT id, name, photographer_id, public_id, client_name, client_email, 
             client_phone, event_date, description, is_finalized, is_archived, 
             watermark_enabled, created_at, updated_at
      FROM projects ORDER BY id
    `);
    
    let migrated = 0;
    for (const project of result.rows) {
      try {
        await renderClient.query(`
          INSERT INTO projects (id, name, photographer_id, public_id, client_name, 
                              client_email, client_phone, event_date, description, 
                              is_finalized, is_archived, watermark_enabled, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [project.id, project.name, project.photographer_id, project.public_id,
            project.client_name, project.client_email, project.client_phone,
            project.event_date, project.description, project.is_finalized,
            project.is_archived, project.watermark_enabled, project.created_at, project.updated_at]);
        migrated++;
      } catch (err) {
        if (err.code !== '23505') console.log(`Erro projeto ${project.id}: ${err.message}`);
      }
    }
    console.log(`✓ ${migrated} projetos migrados`);
  } finally {
    neonClient.release();
    renderClient.release();
  }
}

async function migrateNewProjects() {
  console.log('Migrando new_projects...');
  const neonClient = await neonPool.connect();
  const renderClient = await renderPool.connect();
  
  try {
    const result = await neonClient.query(`
      SELECT id, name, user_id, client_name, client_email, client_phone, 
             event_date, description, watermark_enabled, created_at, updated_at
      FROM new_projects WHERE name IS NOT NULL
    `);
    
    let migrated = 0;
    for (const np of result.rows) {
      try {
        await renderClient.query(`
          INSERT INTO new_projects (id, name, user_id, client_name, client_email, 
                                  client_phone, event_date, description, watermark_enabled, 
                                  created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [np.id, np.name, np.user_id, np.client_name, np.client_email,
            np.client_phone, np.event_date, np.description, np.watermark_enabled,
            np.created_at, np.updated_at]);
        migrated++;
      } catch (err) {
        if (err.code !== '23505') console.log(`Erro new_project ${np.id}: ${err.message}`);
      }
    }
    console.log(`✓ ${migrated} new_projects migrados`);
  } finally {
    neonClient.release();
    renderClient.release();
  }
}

async function migrateComments() {
  console.log('Migrando comentários...');
  const neonClient = await neonPool.connect();
  const renderClient = await renderPool.connect();
  
  try {
    const result = await neonClient.query(`
      SELECT id, photo_id, project_id, author_name, comment, is_viewed, created_at
      FROM photo_comments WHERE project_id IS NOT NULL
    `);
    
    let migrated = 0;
    for (const comment of result.rows) {
      try {
        await renderClient.query(`
          INSERT INTO photo_comments (id, photo_id, project_id, author_name, comment, is_viewed, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [comment.id, comment.photo_id, comment.project_id, comment.author_name,
            comment.comment, comment.is_viewed, comment.created_at]);
        migrated++;
      } catch (err) {
        if (err.code !== '23505') console.log(`Erro comentário ${comment.id}: ${err.message}`);
      }
    }
    console.log(`✓ ${migrated} comentários migrados`);
  } finally {
    neonClient.release();
    renderClient.release();
  }
}

async function main() {
  console.log('🚀 Iniciando migração simplificada Neon → Render\n');
  
  try {
    await migrateUsers();
    await migrateProjects();
    await migrateNewProjects();
    await migrateComments();
    
    // Verificar resultados
    const renderClient = await renderPool.connect();
    const counts = await renderClient.query(`
      SELECT 'users' as tabela, COUNT(*) as total FROM users
      UNION ALL
      SELECT 'projects' as tabela, COUNT(*) as total FROM projects
      UNION ALL
      SELECT 'new_projects' as tabela, COUNT(*) as total FROM new_projects
      UNION ALL
      SELECT 'photo_comments' as tabela, COUNT(*) as total FROM photo_comments
    `);
    
    console.log('\n📊 RESUMO FINAL:');
    counts.rows.forEach(row => {
      console.log(`✓ ${row.tabela}: ${row.total} registros`);
    });
    
    renderClient.release();
    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await neonPool.end();
    await renderPool.end();
  }
}

main();