import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { testConnection, pool } from "./db";
import { storage } from "./storage";
// Import necessary environment variables
import dotenv from "dotenv";

// Definir variável de ambiente para a sessão se não estiver definida
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "studio-foto-session-secret-key-2023";
  console.log("SESSION_SECRET definido com valor padrão");
}

// Create upload directory if it doesn't exist
// Use a direct path relative to the project root
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}
console.log(`Upload directory path: ${uploadsDir}`); // Log for debugging

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique ID for better URL handling
    const id = nanoid();
    // Get original extension and ensure it's preserved
    const ext = path.extname(file.originalname) || getExtensionFromMimeType(file.mimetype);
    // Final filename format: unique-id.ext
    cb(null, `${id}${ext}`);
    
    // Log for debugging
    console.log(`File upload: ${file.originalname} → ${id}${ext}`);
  }
});

// Helper function to get extension from MIME type if original name doesn't have one
function getExtensionFromMimeType(mimetype: string): string {
  switch(mimetype) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/gif':
      return '.gif';
    case 'image/webp':
      return '.webp';
    default:
      return '.jpg'; // Default to jpg
  }
}

// Filter for image files only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1000 * 1024 * 1024, // 1000MB (1GB) limit - efetivamente sem limite para uso normal
  }
});

// Initialize Express and configure middleware
const app = express();

// Configure essential middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CRITICAL FIX: Setup proper CORS to fully support cookies
// We must use the cors package rather than custom headers to ensure consistent behavior
import cors from 'cors';

// Configure CORS with credentials support
app.use(cors({
  origin: true, // Allow the requesting origin (dynamically)
  credentials: true, // This is essential for cookies to work
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Set up authentication BEFORE any route handlers
import { setupAuth } from './auth';
setupAuth(app);

// Configure session logging middleware
app.use((req, res, next) => {
  // Log detailed session and cookie data for debugging
  if (req.path.startsWith('/api/')) {
    console.log(`[DEBUG-REQ] ${req.method} ${req.path}`);
    console.log(`[DEBUG-REQ] Session ID: ${req.sessionID}`);
    console.log(`[DEBUG-REQ] Authenticated: ${req.isAuthenticated ? req.isAuthenticated() : 'N/A'}`);
    console.log(`[DEBUG-REQ] User: ${req.user ? `ID=${req.user.id}` : 'none'}`);
    
    // Parse and log cookies in detail
    if (req.headers.cookie) {
      console.log(`[DEBUG-REQ] Raw cookies: ${req.headers.cookie}`);
      const cookies = req.headers.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return { name, value };
      });
      console.log(`[DEBUG-REQ] Parsed cookies:`, JSON.stringify(cookies, null, 2));
    } else {
      console.log(`[DEBUG-REQ] No cookies in request`);
    }

    // Log passport session data
    if (req.session && req.session.passport) {
      console.log(`[DEBUG-REQ] Passport session:`, req.session.passport);
    } else {
      console.log(`[DEBUG-REQ] No passport data in session`);
    }
  }
  next();
});

// Set up static file serving
app.use('/uploads', express.static(uploadsDir));

// Add database test endpoint
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    // Executa uma consulta simples diretamente no pool
    const result = await pool.query('SELECT NOW() as time, current_database() as db_name');
    
    // Conta quantos usuários e projetos existem
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const projectCount = await pool.query('SELECT COUNT(*) as count FROM projects');
    
    res.json({
      status: 'connected',
      timestamp: result.rows[0].time,
      database: result.rows[0].db_name,
      tables: {
        users: parseInt(userCount.rows[0].count),
        projects: parseInt(projectCount.rows[0].count)
      },
      environment: process.env.NODE_ENV,
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost'
    });
  } catch (error: any) {
    console.error("Erro na rota de teste:", error);
    res.status(500).json({
      error: "Database connection error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Request/response logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // We're using Cloudflare R2 for photo storage instead of local files
  console.log("Using Cloudflare R2 for storage - bucket must be created manually in Cloudflare dashboard");

  // Register API routes after authentication is set up
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use the port provided by the environment (Railway sets this to 3000)
  // or fall back to 5000 for local development
  const port = Number(process.env.PORT) || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port} (NODE_ENV: ${process.env.NODE_ENV})`);
    
    // Inicializar o monitor de uso de memória
    setupMemoryMonitor();
  });
  
  // Função para monitorar o uso de memória
  function setupMemoryMonitor() {
    // Converter bytes para MB para facilitar a leitura
    const bytesToMB = (bytes: number) => Math.round(bytes / 1024 / 1024 * 100) / 100;
    
    // Função que realiza o log do uso de memória
    const logMemoryUsage = () => {
      const memoryData = process.memoryUsage();
      console.log('=== MEMORY USAGE ===');
      console.log(`RSS: ${bytesToMB(memoryData.rss)} MB`);
      console.log(`Heap Total: ${bytesToMB(memoryData.heapTotal)} MB`);
      console.log(`Heap Used: ${bytesToMB(memoryData.heapUsed)} MB`);
      console.log(`External: ${bytesToMB(memoryData.external)} MB`);
      
      // Verificar se temos acesso aos caches inteligentes da classe MemStorage
      // Só exibe as estatísticas de cache se a storage implementada for do tipo MemStorage
      if (storage && 'users' in storage && 'projects' in storage && 
          storage.users && typeof storage.users.getStats === 'function' && 
          storage.projects && typeof storage.projects.getStats === 'function') {
          
        // As estatísticas do cache só estarão disponíveis na implementação MemStorage
        try {
          const userCacheStats = storage.users.getStats();
          const projectCacheStats = storage.projects.getStats();
          
          console.log('=== CACHE STATS ===');
          console.log(`Users cache: ${userCacheStats.size}/${userCacheStats.maxSize} items (${Math.round(userCacheStats.hitRatio * 100)}% hit ratio)`);
          console.log(`Projects cache: ${projectCacheStats.size}/${projectCacheStats.maxSize} items (${Math.round(projectCacheStats.hitRatio * 100)}% hit ratio)`);
          console.log(`Oldest item age: Users ${Math.round(userCacheStats.oldestItemAge / 60)} min, Projects ${Math.round(projectCacheStats.oldestItemAge / 60)} min`);
        } catch (error) {
          console.log('=== CACHE STATS: Not available (Error) ===');
        }
      }
      
      console.log('===================');
    };
    
    // Executar imediatamente para ter um valor inicial
    logMemoryUsage();
    
    // Configurar intervalo para executar a cada 1 minuto (60000 ms)
    const intervalId = setInterval(logMemoryUsage, 60000);
    
    // Limpeza periódica do NodeJS heap (pode ajudar a reduzir fragmentação)
    const gcIntervalId = setInterval(() => {
      if (global.gc) {
        try {
          global.gc();
          console.log('[MEMORY] Manual garbage collection executed');
        } catch (e) {
          console.error('[MEMORY] Failed to execute garbage collection:', e);
        }
      }
    }, 15 * 60 * 1000); // A cada 15 minutos
    
    // Garantir que o intervalo seja limpo quando o processo for encerrado
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      clearInterval(gcIntervalId);
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      clearInterval(intervalId);
      clearInterval(gcIntervalId);
      process.exit(0);
    });
  }
})();
