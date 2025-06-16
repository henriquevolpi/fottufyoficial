#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const NEON_DB = "postgresql://neondb_owner:npg_wqC0LP7yRHlT@ep-small-resonance-a45diqst-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const RENDER_DB = "postgresql://fottufy_user:ls7dGvLeojlTv0YpxclVRMYWhpNfwLKy@dpg-d17j2fgdl3ps73ahtrs0-a.oregon-postgres.render.com/fottufy";

const neonPool = new Pool({
  connectionString: NEON_DB,
  ssl: { rejectUnauthorized: false }
});

const renderPool = new Pool({
  connectionString: RENDER_DB,
  ssl: { rejectUnauthorized: false }
});

// Ordem correta para inserção (respeitando foreign keys)
const MIGRATION_ORDER = [
  'users',
  'projects', 
  'new_projects',
  'photos',
  'photo_comments',
  'password_reset_tokens',
  'session'
];

// Mapeamento de colunas que podem diferir
const COLUMN_MAPPING = {
  users: {
    password_hash: 'password'
  },
  photo_comments: {
    // Ignorar colunas que não existem no destino
    ignore: ['client_name', 'client_email']
  },
  projects: {
    ignore: ['photos', 'status', 'title', 'location', 'cover_photo_url', 'total_photos', 'selected_photos']
  },
  new_projects: {
    ignore: ['show_watermark', 'title', 'location', 'cover_photo_url']
  },
  password_reset_tokens: {
    ignore: ['used']
  }
};

async function migrateTable(tableName) {
  console.log(`📦 Migrando tabela: ${tableName}`);
  
  try {
    // Buscar dados do Neon
    const neonClient = await neonPool.connect();
    const result = await neonClient.query(`SELECT * FROM "${tableName}"`);
    const data = result.rows;
    neonClient.release();
    
    if (data.length === 0) {
      console.log(`  ⚠️  Tabela ${tableName}: 0 registros`);
      return { success: true, records: 0 };
    }
    
    // Processar dados conforme mapeamento
    const processedData = data.map(row => {
      const newRow = { ...row };
      const mapping = COLUMN_MAPPING[tableName];
      
      if (mapping) {
        // Renomear colunas
        Object.keys(mapping).forEach(oldCol => {
          if (oldCol !== 'ignore' && newRow[oldCol] !== undefined) {
            newRow[mapping[oldCol]] = newRow[oldCol];
            delete newRow[oldCol];
          }
        });
        
        // Remover colunas ignoradas
        if (mapping.ignore) {
          mapping.ignore.forEach(col => delete newRow[col]);
        }
      }
      
      return newRow;
    });
    
    // Inserir no Render
    const renderClient = await renderPool.connect();
    
    try {
      let insertedCount = 0;
      
      for (const row of processedData) {
        try {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          
          const insertSQL = `INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')}) VALUES (${placeholders})`;
          await renderClient.query(insertSQL, values);
          insertedCount++;
        } catch (rowError) {
          if (rowError.code === '23505') { // Duplicate key
            console.log(`    Pulando registro duplicado`);
            continue;
          }
          if (rowError.code === '23503') { // Foreign key violation
            console.log(`    Pulando registro com foreign key inválida`);
            continue;
          }
          throw rowError;
        }
      }
      
      console.log(`  ✓ ${insertedCount} registros migrados de ${data.length} total`);
      return { success: true, records: insertedCount };
      
    } finally {
      renderClient.release();
    }
    
  } catch (error) {
    console.error(`  ❌ Erro ao migrar ${tableName}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function recreateTables() {
  console.log('🔧 Recriando estrutura das tabelas no Render...');
  
  const renderClient = await renderPool.connect();
  
  try {
    await renderClient.query(`
      -- Dropar tabelas existentes
      DROP TABLE IF EXISTS photos CASCADE;
      DROP TABLE IF EXISTS photo_comments CASCADE;
      DROP TABLE IF EXISTS new_projects CASCADE;
      DROP TABLE IF EXISTS password_reset_tokens CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
      DROP TABLE IF EXISTS session CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      -- Criar estrutura mínima necessária
      CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'photographer',
          phone TEXT,
          plan TEXT DEFAULT 'free',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          plan_expires_at TIMESTAMP,
          max_projects INTEGER DEFAULT 5,
          max_photos_per_project INTEGER DEFAULT 50,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          subscription_plan TEXT DEFAULT 'free',
          subscription_status TEXT DEFAULT 'active',
          used_uploads INTEGER DEFAULT 0,
          subscription_start_date TIMESTAMP,
          subscription_end_date TIMESTAMP
      );

      CREATE TABLE projects (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          photographer_id INTEGER REFERENCES users(id),
          public_id TEXT UNIQUE NOT NULL,
          client_name TEXT,
          client_email TEXT,
          client_phone TEXT,
          event_date DATE,
          description TEXT,
          is_finalized BOOLEAN DEFAULT false,
          is_archived BOOLEAN DEFAULT false,
          watermark_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE new_projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          user_id INTEGER REFERENCES users(id),
          client_name TEXT,
          client_email TEXT,
          client_phone TEXT,
          event_date DATE,
          description TEXT,
          watermark_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE photos (
          id TEXT PRIMARY KEY,
          project_id TEXT REFERENCES new_projects(id),
          filename TEXT NOT NULL,
          original_filename TEXT,
          url TEXT NOT NULL,
          is_selected BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE photo_comments (
          id TEXT PRIMARY KEY,
          photo_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          comment TEXT NOT NULL,
          is_viewed BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE session (
          sid TEXT PRIMARY KEY,
          sess JSON NOT NULL,
          expire TIMESTAMP NOT NULL
      );
    `);
    
    console.log('✓ Estrutura das tabelas criada');
    
  } finally {
    renderClient.release();
  }
}

async function performMigration() {
  console.log('🚀 Iniciando migração completa Neon → Render\n');
  
  try {
    // Verificar conexões
    const neonClient = await neonPool.connect();
    const neonInfo = await neonClient.query('SELECT current_database(), current_user');
    console.log(`✓ Conectado ao Neon: ${neonInfo.rows[0].current_database}`);
    neonClient.release();
    
    const renderClient = await renderPool.connect();
    const renderInfo = await renderClient.query('SELECT current_database(), current_user');
    console.log(`✓ Conectado ao Render: ${renderInfo.rows[0].current_database}\n`);
    renderClient.release();
    
    // Recriar estrutura
    await recreateTables();
    
    // Migrar dados na ordem correta
    const results = [];
    let totalRecords = 0;
    
    for (const tableName of MIGRATION_ORDER) {
      const result = await migrateTable(tableName);
      results.push({ table: tableName, ...result });
      totalRecords += result.records || 0;
    }
    
    // Resumo final
    console.log('\n📊 RESUMO DA MIGRAÇÃO:');
    console.log(`✓ Total de tabelas: ${MIGRATION_ORDER.length}`);
    console.log(`✓ Migrações bem-sucedidas: ${results.filter(r => r.success).length}`);
    console.log(`✓ Total de registros migrados: ${totalRecords.toLocaleString()}`);
    
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.log(`❌ Falhas: ${failed.length}`);
      failed.forEach(f => console.log(`  - ${f.table}: ${f.error}`));
    }
    
    console.log('\n🎉 Migração concluída!');
    
  } catch (error) {
    console.error('💥 Erro crítico durante a migração:', error);
    process.exit(1);
  }
}

async function cleanup() {
  try {
    await neonPool.end();
    await renderPool.end();
    console.log('✓ Conexões fechadas');
  } catch (error) {
    console.error('Erro ao fechar conexões:', error);
  }
}

// Executar migração
if (import.meta.url === `file://${process.argv[1]}`) {
  performMigration()
    .then(() => cleanup())
    .then(() => {
      console.log('✅ Migração finalizada com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      cleanup().finally(() => process.exit(1));
    });
}

export { performMigration, cleanup };