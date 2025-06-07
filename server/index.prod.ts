import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { testConnection, pool, startDbHealthCheck } from "./db";
import { storage as dbStorage } from "./storage";
// Import necessary environment variables
import dotenv from "dotenv";
// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

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
    case 'image/svg+xml':
      return '.svg';
    default:
      return '.jpg'; // fallback
  }
}

export const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Test database connectivity on startup
async function initializeDatabase() {
  try {
    console.log("Testing database connection...");
    await testConnection();
    console.log("Database connection successful!");
    
    // Buscar usuário admin ao inicializar
    try {
      const normalizedEmail = "admin@studio.com";
      console.log(`Buscando usuário com email (normalizado): ${normalizedEmail}`);
      const adminUser = await dbStorage.getUserByEmail(normalizedEmail);
      if (adminUser) {
        console.log(`Usuário admin encontrado: ID ${adminUser.id}`);
      } else {
        console.log("Usuário admin não encontrado");
      }
    } catch (error) {
      console.error("Erro ao buscar usuário admin:", error);
    }
    
    // Start database health monitoring
    startDbHealthCheck();
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

// Initialize database and start server
async function startServer() {
  await initializeDatabase();
  
  const app = express();
  const server = await registerRoutes(app);

  // Custom MIME type handler
  app.use((req, res, next) => {
    // Function to set appropriate Content-Type headers
    const setContentType = (req: Request, res: Response) => {
      const ext = path.extname(req.path).toLowerCase();
      
      if (ext === '.js' || ext === '.mjs') {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      } else if (ext === '.html') {
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      } else if (ext === '.png') {
        res.setHeader('Content-Type', 'image/png');
      } else if (ext === '.jpg' || ext === '.jpeg') {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (ext === '.svg') {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
    }
    
    next();
  });

  // Production-only static file serving
  const distPath = path.resolve(process.cwd(), 'dist');
  const staticMiddleware = express.static(distPath, {
    index: false, // Don't serve index.html automatically
    setHeaders: (res, filepath) => {
      // Set appropriate headers for each file type
      const ext = path.extname(filepath).toLowerCase();
      
      if (ext === '.js' || ext === '.mjs') {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      } else if (ext === '.html') {
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      }
    }
  });
  
  // Register static files middleware
  app.use(staticMiddleware);
  
  // Rota especial para lidar com HTML estáticos específicos
  app.get(['*/reset-password.html', '*/create-password.html'], (req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    next();
  });
  
  // Servir o SPA para todas as rotas não-API que não encontrarem um arquivo estático
  app.get('*', (req, res, next) => {
    // Pular se for uma rota de API
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Pular se for um arquivo com extensão conhecida
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      return next();
    }
    
    // Serve index.html for all other routes (SPA)
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
  });

  // Use the port provided by the environment (Railway sets this to 3000)
  // or fall back to 5000 for local development
  const port = Number(process.env.PORT) || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`serving on port ${port} (NODE_ENV: ${process.env.NODE_ENV})`);
    
    // Inicializar o monitor de uso de memória
    setupMemoryMonitor();
  });
  
  // Função para monitorar o uso de memória
  function setupMemoryMonitor() {
    // Iniciar o monitoramento de conexão com o banco de dados
    setInterval(() => {
      const used = process.memoryUsage();
      const poolStats = pool.totalCount;
      console.log('=== MEMORY USAGE ===');
      console.log(`RSS: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`);
      console.log(`Heap Total: ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`);
      console.log(`Heap Used: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`);
      console.log(`External: ${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`);
      console.log(`Heap Used/Total: ${Math.round((used.heapUsed / used.heapTotal) * 10000) / 100}%`);
      console.log(`DB Pool: Total=${pool.totalCount}, Idle=${pool.idleCount}, Waiting=${pool.waitingCount}`);
      console.log('===================');
    }, 120000); // Verifica a cada 2 minutos

    // Verificar downgrades expirados a cada 1 minuto
    setInterval(async () => {
      try {
        console.log('[DOWNGRADE] Verificando downgrades expirados...');
        const expiredUsers = await dbStorage.processExpiredDowngrades();
        console.log(`[DOWNGRADE] Processamento concluído: ${expiredUsers} usuários convertidos para plano gratuito`);
        
        if (expiredUsers === 0) {
          console.log('[DOWNGRADE] Nenhum downgrade expirado encontrado');
        }
      } catch (error) {
        console.error('[DOWNGRADE] Erro ao verificar downgrades expirados:', error);
      }
    }, 60000); // Executa a cada 1 minuto

    // Verificar ativações manuais expiradas a cada 2 minutos
    setInterval(async () => {
      try {
        console.log('[ADM] Verificando ativações manuais expiradas (34 dias)...');
        const expiredUsers = await dbStorage.processExpiredManualActivations();
        
        if (expiredUsers === 0) {
          console.log('[ADM] Nenhuma ativação manual expirada encontrada');
        } else {
          console.log(`[ADM] Processamento concluído: ${expiredUsers} usuários com ativação manual expirada convertidos para plano gratuito`);
        }
      } catch (error) {
        console.error('[ADM] Erro ao verificar ativações manuais expiradas:', error);
      }
    }, 120000); // Executa a cada 2 minutos
  }

  // Handle any errors that occur during app initialization
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Express app error:", err);
    res.status(500).json({ message: "Internal server error" });
  });
}

startServer().catch(console.error);