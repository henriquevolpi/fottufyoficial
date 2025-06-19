import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Configuração para PostgreSQL (adaptável para Replit e produção)
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detectar ambiente e configurar SSL adequadamente
const isReplit = process.env.REPL_ID !== undefined;
const isProduction = process.env.NODE_ENV === 'production';

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: isReplit ? 10 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isReplit ? 15000 : 10000,
  // SSL necessário para conectar ao banco
  ssl: {
    rejectUnauthorized: false
  }
};

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

// Create the database connection pool using only Neon
export const pool = new Pool(poolConfig);

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
        
        // Se a conexão falhar, em vez de tentar fechar o pool (o que causa problemas),
        // vamos apenas tentar estabelecer uma nova conexão para verificar se o problema é temporário
        if (process.env.DEBUG_MEMORY === 'true') {
          console.log('Detectado problema de conexão com o banco. Tentando estabelecer nova conexão...');
          
          try {
            // Tentar obter uma nova conexão sem fechar o pool existente
            const client = await pool.connect();
            console.log('Nova conexão estabelecida com sucesso. O banco de dados está acessível.');
            // Devolver a conexão ao pool imediatamente
            client.release();
          } catch (recoveryError) {
            console.error('Falha ao estabelecer nova conexão:', recoveryError);
            console.log('O problema de conexão persiste, mas o aplicativo continuará tentando reconectar.');
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
      using: isReplit ? 'Replit PostgreSQL' : 'PostgreSQL'
    };
  } catch (error: any) {
    console.error('Database connection error:', error);
    return { 
      connected: false, 
      error: error.message,
      using: isReplit ? 'Replit PostgreSQL' : 'PostgreSQL'
    };
  }
}