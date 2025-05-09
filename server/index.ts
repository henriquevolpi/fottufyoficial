import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { testConnection, pool } from "./db";
import { storage as dbStorage } from "./storage";
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
const multerStorage = multer.diskStorage({
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
  storage: multerStorage,
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

// Servir arquivos estáticos do diretório public
// IMPORTANTE: este middleware deve estar antes de qualquer outro que manipule as rotas
app.use(express.static(path.join(process.cwd(), 'public'), {
  setHeaders: (res, filepath) => {
    // Definir os cabeçalhos corretos para diferentes tipos de arquivos
    if (filepath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    } else if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    } else if (filepath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    }
  }
}));

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

// Configure session logging middleware (otimizado para menor uso de memória)
app.use((req, res, next) => {
  // Log apenas informações essenciais, apenas para rotas selecionadas que realmente precisam de debug
  // Reduz a quantidade de strings em memória e objetos temporários
  if (req.path.startsWith('/api/') && (
      req.path.includes('/auth') || 
      req.path.includes('/login') || 
      req.path.includes('/logout') ||
      process.env.DEBUG_REQUESTS === 'true'
    )) {
    console.log(`[DEBUG-REQ] ${req.method} ${req.path} | Auth: ${req.isAuthenticated ? req.isAuthenticated() : 'N/A'} | User: ${req.user ? req.user.id : 'none'}`);
    
    // Versão simplificada que usa menos memória, sem criar objetos extras
    if (process.env.DEBUG_COOKIES === 'true' && req.headers.cookie) {
      console.log(`[DEBUG-REQ] Cookies: "${req.headers.cookie}"`);
    }

    // Log passport session data apenas quando realmente necessário
    if (process.env.DEBUG_SESSION === 'true' && req.session && req.session.passport) {
      console.log(`[DEBUG-REQ] Passport session: ${JSON.stringify(req.session.passport)}`);
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
      // Versão simplificada do log para reduzir uso de memória
      // Não inclui o corpo da resposta nos logs
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Se for uma resposta muito grande (como de fotos), apenas registrar o tamanho
      if (capturedJsonResponse && Array.isArray(capturedJsonResponse)) {
        logLine += ` :: Array[${capturedJsonResponse.length}]`;
      } else if (capturedJsonResponse && typeof capturedJsonResponse === 'object') {
        // Para objetos, capturar apenas as chaves mas não os valores
        const keys = Object.keys(capturedJsonResponse).join(',');
        logLine += ` :: Object{${keys}}`;
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
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
    
    // Variável para rastrear última vez que fizemos log detalhado
    let lastFullLogTime = 0;
    
    // Função que realiza o log do uso de memória
    const logMemoryUsage = () => {
      const memoryData = process.memoryUsage();
      
      // Verificar se devemos fazer log detalhado
      const now = Date.now();
      const isFullInterval = (now - lastFullLogTime) >= 10 * 60 * 1000; // A cada 10 minutos
      
      if (process.env.DEBUG_MEMORY === 'true' || isFullInterval) {
        // Atualizar timestamp do último log completo
        if (isFullInterval) {
          lastFullLogTime = now;
        }
        
        console.log('=== MEMORY USAGE ===');
        console.log(`RSS: ${bytesToMB(memoryData.rss)} MB`);
        console.log(`Heap Total: ${bytesToMB(memoryData.heapTotal)} MB`);
        console.log(`Heap Used: ${bytesToMB(memoryData.heapUsed)} MB`);
        console.log(`External: ${bytesToMB(memoryData.external)} MB`);
        
        // Verificar se temos acesso aos caches inteligentes da classe MemStorage
        // Só exibe as estatísticas de cache se a storage implementada for do tipo MemStorage e DEBUG_MEMORY ativado
        if (process.env.DEBUG_MEMORY === 'true' && dbStorage && 'users' in dbStorage && 'projects' in dbStorage) {
          const usersObj = dbStorage.users as any;
          const projectsObj = dbStorage.projects as any;
          
          if (usersObj && typeof usersObj.getStats === 'function' &&
              projectsObj && typeof projectsObj.getStats === 'function') {
            // As estatísticas do cache só estarão disponíveis na implementação MemStorage
            try {
              const userCacheStats = usersObj.getStats();
              const projectCacheStats = projectsObj.getStats();
              
              console.log('=== CACHE STATS ===');
              console.log(`Users cache: ${userCacheStats.size}/${userCacheStats.maxSize} items (${Math.round(userCacheStats.hitRatio * 100)}% hit ratio)`);
              console.log(`Projects cache: ${projectCacheStats.size}/${projectCacheStats.maxSize} items (${Math.round(projectCacheStats.hitRatio * 100)}% hit ratio)`);
              console.log(`Oldest item age: Users ${Math.round(userCacheStats.oldestItemAge / 60)} min, Projects ${Math.round(projectCacheStats.oldestItemAge / 60)} min`);
            } catch (error) {
              if (process.env.DEBUG_MEMORY === 'true') {
                console.log('=== CACHE STATS: Not available ===');
              }
            }
          }
        }
        
        console.log('===================');
      }
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
          if (process.env.DEBUG_MEMORY === 'true') {
            console.log('[MEMORY] Manual garbage collection executed');
          }
        } catch (e) {
          if (process.env.DEBUG_MEMORY === 'true') {
            console.error('[MEMORY] Failed to execute garbage collection');
          }
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
