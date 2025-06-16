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

console.log('🚀 RESTAURAÇÃO ESSENCIAL - ESTRUTURA E DADOS IMPORTANTES');
console.log('========================================================');

async function restoreEssential() {
  let replitPool;
  
  try {
    replitPool = new Pool(REPLIT_CONNECTION);
    await replitPool.query('SELECT 1');
    console.log('✅ Conectado ao PostgreSQL do Replit');
    
    // Criar tabelas manualmente com estrutura otimizada
    console.log('🏗️ Criando estrutura das tabelas...');
    
    // Tabela users (essencial)
    await replitPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'photographer',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        plan_type TEXT DEFAULT 'free',
        upload_limit INTEGER DEFAULT 0,
        used_uploads INTEGER DEFAULT 0,
        subscription_start_date TIMESTAMP WITHOUT TIME ZONE,
        subscription_end_date TIMESTAMP WITHOUT TIME ZONE,
        subscription_status TEXT DEFAULT 'inactive',
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        subscription_id TEXT,
        last_event JSONB DEFAULT NULL,
        phone TEXT NOT NULL DEFAULT '',
        last_login_at TIMESTAMP WITHOUT TIME ZONE,
        pending_downgrade_date TIMESTAMP WITHOUT TIME ZONE,
        pending_downgrade_reason TEXT,
        original_plan_before_downgrade TEXT,
        manual_activation_date TIMESTAMP WITHOUT TIME ZONE,
        manual_activation_by TEXT,
        is_manual_activation BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('  ✅ Tabela users criada');
    
    // Tabela projects (essencial)
    await replitPool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        public_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_email TEXT NOT NULL,
        photographer_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        photos JSONB DEFAULT '[]',
        selected_photos JSONB DEFAULT '[]',
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        visual_watermark BOOLEAN NOT NULL DEFAULT FALSE,
        apply_watermark BOOLEAN NOT NULL DEFAULT FALSE,
        show_watermark BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (photographer_id) REFERENCES users(id)
      )
    `);
    console.log('  ✅ Tabela projects criada');
    
    // Tabela new_projects (para migração futura)
    await replitPool.query(`
      CREATE TABLE IF NOT EXISTS new_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        show_watermark BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('  ✅ Tabela new_projects criada');
    
    // Tabela photos (vazia mas estrutura necessária)
    await replitPool.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        url TEXT NOT NULL,
        selected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        original_name TEXT,
        filename TEXT,
        FOREIGN KEY (project_id) REFERENCES new_projects(id)
      )
    `);
    console.log('  ✅ Tabela photos criada');
    
    // Tabela photo_comments
    await replitPool.query(`
      CREATE TABLE IF NOT EXISTS photo_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        photo_id TEXT NOT NULL,
        client_name TEXT NOT NULL,
        comment TEXT NOT NULL,
        is_viewed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✅ Tabela photo_comments criada');
    
    // Tabela password_reset_tokens
    await replitPool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token UUID NOT NULL DEFAULT gen_random_uuid(),
        expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('  ✅ Tabela password_reset_tokens criada');
    
    // Tabela session (simplificada)
    await replitPool.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);
    console.log('  ✅ Tabela session criada');
    
    console.log('\n📥 Populando com dados essenciais do backup...');
    
    // Ler dados dos usuários do backup existente
    const usersBackupPath = path.join(__dirname, 'backup', 'backup_users.json');
    if (fs.existsSync(usersBackupPath)) {
      const usersData = JSON.parse(fs.readFileSync(usersBackupPath, 'utf8'));
      console.log(`📦 Restaurando ${usersData.data.length} usuários...`);
      
      for (const user of usersData.data) {
        try {
          await replitPool.query(`
            INSERT INTO users (
              id, name, email, password, role, status, created_at,
              plan_type, upload_limit, used_uploads, subscription_start_date,
              subscription_end_date, subscription_status, stripe_customer_id,
              stripe_subscription_id, subscription_id, last_event, phone,
              last_login_at, pending_downgrade_date, pending_downgrade_reason,
              original_plan_before_downgrade, manual_activation_date,
              manual_activation_by, is_manual_activation
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
              $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
            ) ON CONFLICT (email) DO NOTHING
          `, [
            user.id, user.name, user.email, user.password, user.role,
            user.status, user.created_at, user.plan_type, user.upload_limit,
            user.used_uploads, user.subscription_start_date, user.subscription_end_date,
            user.subscription_status, user.stripe_customer_id, user.stripe_subscription_id,
            user.subscription_id, user.last_event, user.phone || '',
            user.last_login_at, user.pending_downgrade_date, user.pending_downgrade_reason,
            user.original_plan_before_downgrade, user.manual_activation_date,
            user.manual_activation_by, user.is_manual_activation
          ]);
        } catch (error) {
          console.log(`  ⚠️ Erro ao inserir usuário ${user.email}: ${error.message}`);
        }
      }
      
      // Ajustar sequence
      await replitPool.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
      console.log('  ✅ Usuários restaurados');
    }
    
    // Ler dados dos projetos
    const projectsBackupPath = path.join(__dirname, 'backup', 'backup_projects.json');
    if (fs.existsSync(projectsBackupPath)) {
      const projectsData = JSON.parse(fs.readFileSync(projectsBackupPath, 'utf8'));
      console.log(`📦 Restaurando ${projectsData.data.length} projetos...`);
      
      for (const project of projectsData.data) {
        try {
          // Sanitizar dados JSON
          const photosJson = project.photos ? JSON.stringify(project.photos) : '[]';
          const selectedPhotosJson = project.selected_photos ? JSON.stringify(project.selected_photos) : '[]';
          
          await replitPool.query(`
            INSERT INTO projects (
              id, public_id, name, client_name, client_email, photographer_id,
              status, photos, selected_photos, created_at, visual_watermark,
              apply_watermark, show_watermark
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13
            ) ON CONFLICT (public_id) DO NOTHING
          `, [
            project.id, project.public_id, project.name, project.client_name,
            project.client_email, project.photographer_id, project.status,
            photosJson, selectedPhotosJson, project.created_at,
            project.visual_watermark, project.apply_watermark, project.show_watermark
          ]);
        } catch (error) {
          console.log(`  ⚠️ Erro ao inserir projeto ${project.name}: ${error.message}`);
        }
      }
      
      // Ajustar sequence
      await replitPool.query(`SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects))`);
      console.log('  ✅ Projetos restaurados');
    }
    
    // Restaurar comentários
    const commentsBackupPath = path.join(__dirname, 'backup', 'backup_photo_comments.json');
    if (fs.existsSync(commentsBackupPath)) {
      const commentsData = JSON.parse(fs.readFileSync(commentsBackupPath, 'utf8'));
      console.log(`📦 Restaurando ${commentsData.data.length} comentários...`);
      
      for (const comment of commentsData.data) {
        try {
          await replitPool.query(`
            INSERT INTO photo_comments (id, photo_id, client_name, comment, is_viewed, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            comment.id, comment.photo_id, comment.client_name,
            comment.comment, comment.is_viewed, comment.created_at
          ]);
        } catch (error) {
          console.log(`  ⚠️ Erro ao inserir comentário: ${error.message}`);
        }
      }
      console.log('  ✅ Comentários restaurados');
    }
    
    console.log('\n📊 Verificando dados restaurados...');
    
    const results = await Promise.all([
      replitPool.query('SELECT COUNT(*) FROM users'),
      replitPool.query('SELECT COUNT(*) FROM projects'),
      replitPool.query('SELECT COUNT(*) FROM photo_comments'),
      replitPool.query('SELECT COUNT(*) FROM photos'),
      replitPool.query('SELECT COUNT(*) FROM new_projects')
    ]);
    
    const userCount = parseInt(results[0].rows[0].count);
    const projectCount = parseInt(results[1].rows[0].count);
    const commentCount = parseInt(results[2].rows[0].count);
    const photoCount = parseInt(results[3].rows[0].count);
    const newProjectCount = parseInt(results[4].rows[0].count);
    
    console.log('✅ RESTAURAÇÃO ESSENCIAL CONCLUÍDA!');
    console.log('==================================');
    console.log(`📊 ${userCount} usuários restaurados`);
    console.log(`📊 ${projectCount} projetos restaurados`);
    console.log(`📊 ${commentCount} comentários restaurados`);
    console.log(`📊 ${photoCount} fotos (estrutura criada)`);
    console.log(`📊 ${newProjectCount} novos projetos`);
    console.log('');
    console.log('🎯 PRÓXIMO PASSO: Atualizar configuração para usar banco local');
    
    return {
      users: userCount,
      projects: projectCount,
      comments: commentCount,
      photos: photoCount,
      newProjects: newProjectCount
    };
    
  } catch (error) {
    console.error('❌ Erro na restauração:', error.message);
    throw error;
  } finally {
    if (replitPool) await replitPool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  restoreEssential()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { restoreEssential };