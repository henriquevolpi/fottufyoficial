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
  // Configuration para Replit - SSL é necessário mesmo localmente
  ssl: {
    rejectUnauthorized: false
  },
  max: 30, // ✅ Aumentado de 10 para 30 conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// For Supabase or other external PostgreSQL providers (Render deployment)
const externalDbConfig: PoolConfig = {
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
  host: process.env.DB_HOST || process.env.PGHOST,
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
  database: process.env.DB_NAME || process.env.PGDATABASE,
  ssl: {
    rejectUnauthorized: false
  },
  max: 30, // ✅ Também aqui para produção (Render, Supabase, etc.)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Force using Replit's local PostgreSQL for now
// We'll change this to check for DB_HOST when ready to use Supabase
const useLocalConfig = true; // !process.env.DB_HOST;
const poolConfig = useLocalConfig ? replicateLocalConfig : externalDbConfig;

// Log database connection status
function logDbConnectionStatus(status: string, details: string = ''): void {
  if (process.env.DEBUG_MEMORY === 'true') {
    console.log(`
=== DATABASE CONNECTION [${status}] ===
${details ? `Details: ${details}\n` : ''}Time: ${new Date().toISOString()}
Configuration: ${JSON.stringify({
  host: poolConfig.host,
  port: poolConfig.port,
  database: poolConfig.database,
  max: poolConfig.max,
  idleTimeoutMillis: poolConfig.idleTimeoutMillis,
  connectionTimeoutMillis: poolConfig.connectionTimeoutMillis
}, null, 2)}
================================
    `);
  }
}

// Create the database connection pool
export const pool = new Pool({
  ...poolConfig,
  // Add error handlers for the pool
  // These help identify connection issues before they cause application failures
  max: 20, // ✅ Reduced from 30 to 20 to decrease connection overhead
  idleTimeoutMillis: 60000, // ✅ Increased from 30s to 60s to reduce connection cycling
  connectionTimeoutMillis: 10000, // ✅ Increased from 5s to 10s to allow more time for connections
});

// Add event listeners to the pool for better error handling and debugging
pool.on('connect', (client) => {
  logDbConnectionStatus('connect', `New client connected to database (Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount})`);
});

pool.on('error', (err, client) => {
  logDbConnectionStatus('error', `Database pool error: ${err.message}`);
  console.error('Unexpected error on idle client', err);
});

pool.on('acquire', (client) => {
  if (process.env.DEBUG_MEMORY === 'true') {
    logDbConnectionStatus('acquire', `Connection acquired from pool (Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount})`);
  }
});

pool.on('remove', (client) => {
  if (process.env.DEBUG_MEMORY === 'true') {
    logDbConnectionStatus('remove', `Connection removed from pool (Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount})`);
  }
});

// Create a Drizzle ORM instance with the schema
export const db = drizzle(pool, { schema });

// Set up a periodic health check for the database connection
let dbHealthCheckInterval: NodeJS.Timeout | null = null;

export function startDbHealthCheck(intervalMs: number = 60000) {
  // Clear any existing interval
  if (dbHealthCheckInterval) {
    clearInterval(dbHealthCheckInterval);
  }
  
  // Set up the new interval
  dbHealthCheckInterval = setInterval(async () => {
    try {
      const result = await testConnection();
      if (result.connected) {
        logDbConnectionStatus('health-check-success', `Database connection healthy (Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount})`);
      } else {
        logDbConnectionStatus('health-check-failure', `Database connection failed: ${result.error}`);
        // If we're running under the DEBUG_MEMORY flag, try to fix the pool
        if (process.env.DEBUG_MEMORY === 'true') {
          console.log('Attempting to repair database connection pool...');
          try {
            // End all existing connections and create new ones
            await pool.end();
            // Create a new pool (will happen on next access since we export the pool variable)
            const tempPool = new Pool(poolConfig);
            // Test the new pool
            const client = await tempPool.connect();
            client.release();
            console.log('Database connection pool successfully repaired.');
          } catch (repairError) {
            console.error('Failed to repair database connection pool:', repairError);
          }
        }
      }
    } catch (error) {
      logDbConnectionStatus('health-check-error', `Error during database health check: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, intervalMs);
  
  logDbConnectionStatus('health-check-started', `Database health check scheduled every ${intervalMs/1000} seconds`);
  
  return dbHealthCheckInterval;
}

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