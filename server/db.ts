import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// For local Replit database
const replicateLocalConfig: PoolConfig = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE,
  // Default configuration for Replit
  ssl: false
};

// For Supabase or other external PostgreSQL providers (Render deployment)
const externalDbConfig: PoolConfig = {
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
  host: process.env.DB_HOST || process.env.PGHOST,
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
  database: process.env.DB_NAME || process.env.PGDATABASE,
  // Required for most cloud providers like Supabase
  ssl: {
    rejectUnauthorized: false
  }
};

// Force using Replit's local PostgreSQL for now
// We'll change this to check for DB_HOST when ready to use Supabase
const useLocalConfig = true; // !process.env.DB_HOST;
const poolConfig = useLocalConfig ? replicateLocalConfig : externalDbConfig;

// Create the database connection pool
export const pool = new Pool(poolConfig);

// Create a Drizzle ORM instance with the schema
export const db = drizzle(pool, { schema });

// Simple function to check database connectivity
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { 
      connected: true, 
      timestamp: result.rows[0].now,
      using: useLocalConfig ? 'Replit Database' : 'External Database (Supabase/Render)'
    };
  } catch (error: any) {
    console.error('Database connection error:', error);
    return { 
      connected: false, 
      error: error.message,
      using: useLocalConfig ? 'Replit Database' : 'External Database (Supabase/Render)'
    };
  }
}