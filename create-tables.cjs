const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function createTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create new_projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS new_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created new_projects table');

    // Create photos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES new_projects(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        selected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created photos table');

  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

createTables();