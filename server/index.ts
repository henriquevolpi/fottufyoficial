import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { testConnection, pool, startDbHealthCheck } from "./db";
import { storage as dbStorage } from "./storage";
// Import backup system
import { initializeBackupScheduler } from "./backup/backup-scheduler";
// Import R2 cleanup scheduler
import { startCleanupScheduler } from "./cleanup-scheduler";
// Import security middleware
import { 
  securityHeaders, 
  generalRateLimit, 
  authRateLimit, 
  uploadRateLimit, 
  advancedUploadValidation, 
  securityLogger, 
  corsConfig, 
  generateSecureSessionSecret, 
  inputSanitizer 
} from "./security";
// Import necessary environment variables
import dotenv from "dotenv";
// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

// Habilitar garbage collection manual se não estiver disponível
if (!global.gc) {
  try {
    // Tentar habilitar garbage collection
    require('v8').setFlagsFromString('--expose_gc');
    global.gc = require('vm').runInNewContext('gc');
    console.log('[GC] Garbage collection manual habilitado');
  } catch (e) {
    console.warn('[GC] Não foi possível habilitar garbage collection manual');
  }
}

// Definir variável de ambiente para a sessão de forma mais segura
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === "studio-foto-session-secret-key-2023") {
  process.env.SESSION_SECRET = generateSecureSessionSecret();
  console.log("[SECURITY] SESSION_SECRET definido com valor seguro");
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
    fileSize: 500 * 1024 * 1024, // 500MB limit - mais seguro que 1GB
  }
});

// Initialize Express and configure middleware
const app = express();

// ==================== SECURITY MIDDLEWARE ====================
// Headers de segurança básicos (helmet)
app.use(securityHeaders);

// Rate limiting geral conservador
app.use(generalRateLimit);

// Sanitização básica de input
app.use(inputSanitizer);

// Logger de segurança
app.use(securityLogger);

// Validação avançada de uploads
app.use(advancedUploadValidation);
// ============================================================

// Configure raw body capture for Stripe webhook BEFORE json parser
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));

// Configure essential middleware first
app.use(express.json({ limit: '10mb' })); // Limite para JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Limite para form data

// Servir arquivos estáticos do diretório public
// IMPORTANTE: este middleware deve estar antes de qualquer outro que manipule as rotas
app.use(express.static(path.join(process.cwd(), 'public'), {
  setHeaders: (res, filepath) => {
    // Definir os cabeçalhos corretos para diferentes tipos de arquivos
    const isHTML = filepath.endsWith('.html');
    const isJavaScript = filepath.endsWith('.js') || filepath.endsWith('.mjs') || 
                         filepath.endsWith('.jsx') || filepath.endsWith('.tsx');
    const isCSS = filepath.endsWith('.css');
    const isJSON = filepath.endsWith('.json');
    
    if (isHTML) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    } else if (isJavaScript) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (isCSS) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    } else if (isJSON) {
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    }
    
    // Para páginas específicas, garantir cabeçalhos extras para evitar problemas de MIME
    if (filepath.includes('reset-password.html') || filepath.includes('create-password.html')) {
      // Desativar cache para garantir que sempre use a versão mais recente
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Log específico para ajudar no debug
      console.log(`Servindo página crítica de senha: ${filepath} com Content-Type: ${res.getHeader('Content-Type')}`);
    }
  }
}));

// CRITICAL FIX: Setup proper CORS to fully support cookies
// We must use the cors package rather than custom headers to ensure consistent behavior
import cors from 'cors';

// Configure CORS with enhanced security
app.use(cors(corsConfig));

// Set up authentication BEFORE any route handlers
import { setupAuth } from './auth';
setupAuth(app);

// Rate limiting para autenticação
app.use('/api/auth', authRateLimit);
app.use('/api/login', authRateLimit);
app.use('/api/reset-password', authRateLimit);

// Rate limiting para uploads
app.use('/api/upload', uploadRateLimit);
app.use('/api/projects/*/upload', uploadRateLimit);
app.use('/api/projects/*/add-photos', uploadRateLimit);

// Configure session logging middleware (otimizado - apenas erros em produção)
app.use((req, res, next) => {
  // Log apenas para erros críticos em produção, debug completo apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_REQUESTS === 'true') {
    if (req.path.includes('/auth') || req.path.includes('/login') || req.path.includes('/logout')) {
      console.log(`[DEBUG-REQ] ${req.method} ${req.path} | Auth: ${req.isAuthenticated ? req.isAuthenticated() : 'N/A'} | User: ${req.user ? req.user.id : 'none'}`);
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

// Request/response logging middleware (otimizado para produção)
app.use((req, res, next) => {
  // Log apenas em desenvolvimento ou para erros críticos (>= 400)
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_API === 'true') {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api") && (res.statusCode >= 400 || process.env.NODE_ENV === 'development')) {
        // Log simplificado apenas com informações essenciais
        log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
    });
  }
  next();
});

(async () => {
  // Exibir informações sobre variáveis de ambiente para debug
  console.log('===== CONFIGURAÇÕES DO AMBIENTE =====');
  console.log(`[ENV] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[ENV] PORT: ${process.env.PORT || '5000 (padrão)'}`);
  console.log(`[ENV] DEBUG_MEMORY: ${process.env.DEBUG_MEMORY === 'true' ? 'ATIVADO' : 'DESATIVADO'}`);
  console.log(`[ENV] DATABASE_URL: ${process.env.DATABASE_URL ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);
  console.log('====================================');
  
  // We're using Cloudflare R2 for photo storage instead of local files
  console.log("Using Cloudflare R2 for storage - bucket must be created manually in Cloudflare dashboard");

  // Register API routes after authentication is set up
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Verificar se os headers já foram enviados para evitar o erro 'ERR_HTTP_HEADERS_SENT'
    if (!res.headersSent) {
      res.status(status).json({ message });
    } else {
      console.warn("Headers já enviados, não foi possível enviar resposta de erro para:", message);
    }
    
    // Registrar o erro, mas não lançar exceção para evitar falhas na aplicação
    console.error("Erro capturado pelo middleware global:", err);
  });

  // Importante: registrar middleware MIME type checker antes de servir os arquivos estáticos
  // Este middleware garante que os arquivos sejam servidos com o tipo de conteúdo correto
  // mesmo quando a requisição não tem extensão (rotas de SPA como /reset-password)
  app.use((req, res, next) => {
    // Adiciona .html como extensão implícita para rotas SPA conhecidas
    const knownSPARoutes = [
      '/reset-password', 
      '/create-password', 
      '/forgot-password', 
      '/dashboard',
      '/auth',
      '/pricing',
      '/upload'
    ];
    
    // Verifica se é uma rota SPA conhecida sem extensão
    const isKnownSPARoute = knownSPARoutes.some(route => 
      req.path === route || req.path.startsWith(`${route}/`)
    );
    
    if (isKnownSPARoute) {
      // Para rotas SPA, garantimos que serão tratadas como HTML
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    } else if (req.path.includes('.')) {
      // Para arquivos com extensão, definimos o tipo MIME apropriado
      const ext = path.extname(req.path).toLowerCase();
      
      if (ext === '.js' || ext === '.mjs') {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      } else if (ext === '.json') {
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Integração com serveStatic para melhorar o suporte a rotas SPA
    // em ambientes de produção
    const staticMiddleware = express.static(path.resolve(import.meta.dirname, 'public'), {
      index: false, // Não servir index.html automaticamente
      setHeaders: (res, filepath) => {
        // Definir cabeçalhos apropriados para cada tipo de arquivo
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
    
    // Registrar middleware de arquivos estáticos
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
      
      // Servir o index.html para todas as outras rotas (SPA)
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      res.sendFile(path.resolve(import.meta.dirname, 'public', 'index.html'));
    });
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
    // Iniciar o monitoramento de conexão com o banco de dados
    // Verificar a conexão a cada 2 minutos (120000 ms)
    const dbHealthCheckInterval = startDbHealthCheck(120000);
    
    // ==================== SISTEMA DE LIMPEZA DE SESSÕES ====================
    // Limpeza automática de sessões expiradas a cada 6 horas
    const cleanupExpiredSessions = async () => {
      try {
        console.log('[SESSION-CLEANUP] Iniciando limpeza de sessões expiradas...');
        const result = await pool.query('DELETE FROM session WHERE expire < NOW()');
        const deletedCount = result.rowCount || 0;
        
        if (deletedCount > 0) {
          console.log(`[SESSION-CLEANUP] ${deletedCount} sessões expiradas removidas`);
        } else {
          console.log('[SESSION-CLEANUP] Nenhuma sessão expirada encontrada');
        }
      } catch (error) {
        console.error('[SESSION-CLEANUP] Erro ao limpar sessões:', error);
      }
    };

    // ==================== SISTEMA AUTOMÁTICO DE DOWNGRADE ====================
    // Agendador para processar downgrades expirados a cada hora
    const processExpiredDowngrades = async () => {
      try {
        console.log('[DOWNGRADE] Verificando downgrades expirados...');
        const processedCount = await dbStorage.processExpiredDowngrades();
        
        if (processedCount > 0) {
          console.log(`[DOWNGRADE] ${processedCount} usuários convertidos para plano gratuito`);
        } else {
          console.log('[DOWNGRADE] Nenhum downgrade expirado encontrado');
        }
      } catch (error) {
        console.error('[DOWNGRADE] Erro ao processar downgrades expirados:', error);
      }
    };
    
    // ==================== SISTEMA DE CONTROLE MANUAL ADM (34 DIAS) ====================
    // Agendador para processar ativações manuais expiradas a cada hora
    const processExpiredManualActivations = async () => {
      try {
        console.log('[ADM] Verificando ativações manuais expiradas (34 dias)...');
        const processedCount = await dbStorage.processExpiredManualActivations();
        
        if (processedCount > 0) {
          console.log(`[ADM] ${processedCount} usuários com ativação manual expirada processados`);
        } else {
          console.log('[ADM] Nenhuma ativação manual expirada encontrada');
        }
      } catch (error) {
        console.error('[ADM] Erro ao processar ativações manuais expiradas:', error);
      }
    };

    // ==================== SISTEMA AUTOMÁTICO DE EXPIRAÇÃO (HOTMART/STRIPE) ====================
    // Verifica contas com subscription_end_date expirada e sem pagamento recente
    // Converte automaticamente para plano free se não houver renovação
    const processExpiredSubscriptionsAuto = async () => {
      try {
        console.log('[EXPIRED-AUTO] Verificando assinaturas com data de expiração vencida...');
        const processedCount = await dbStorage.processExpiredSubscriptionsWithoutPayment();
        
        if (processedCount > 0) {
          console.log(`[EXPIRED-AUTO] ${processedCount} usuários com assinatura vencida convertidos para plano gratuito`);
        } else {
          console.log('[EXPIRED-AUTO] Nenhuma assinatura vencida encontrada para downgrade');
        }
      } catch (error) {
        console.error('[EXPIRED-AUTO] Erro ao processar assinaturas vencidas:', error);
      }
    };
    
    // Executar limpeza de sessões inicial após 1 minuto do startup
    setTimeout(cleanupExpiredSessions, 60000);
    
    // Executar verificações iniciais após 30 segundos do startup
    setTimeout(processExpiredDowngrades, 30000);
    setTimeout(processExpiredManualActivations, 45000);
    setTimeout(processExpiredSubscriptionsAuto, 60000);
    
    // Configurar intervalos
    const sessionCleanupIntervalId = setInterval(cleanupExpiredSessions, 6 * 60 * 60 * 1000); // 6 horas
    const downgradeIntervalId = setInterval(processExpiredDowngrades, 3600000); // 1 hora
    const manualActivationIntervalId = setInterval(processExpiredManualActivations, 3600000); // 1 hora
    const expiredSubscriptionsIntervalId = setInterval(processExpiredSubscriptionsAuto, 6 * 60 * 60 * 1000); // 6 horas
    
    console.log('[SESSION-CLEANUP] Sistema de limpeza automática iniciado - verificação a cada 6 horas');
    console.log('[DOWNGRADE] Sistema automático de downgrade iniciado - verificação a cada hora');
    console.log('[ADM] Sistema de controle manual ADM iniciado - verificação a cada hora (34 dias)');
    console.log('[EXPIRED-AUTO] Sistema automático de expiração iniciado - verificação a cada 6 horas');
    
    // ==================== SISTEMA DE BACKUP AUTOMÁTICO ====================
    // Inicializar sistema de backup automático (Local + Email)
    // 100% automático, sem necessidade de credenciais externas
    try {
      const backupScheduler = initializeBackupScheduler();
      backupScheduler.start();
      console.log('[BACKUP] ✅ Sistema de backup automático iniciado');
      console.log('[BACKUP] 📁 Backup local: /home/runner/workspace/backups (rotação 7 dias)');
      console.log('[BACKUP] 📧 Backup por email: Resend configurado');
      console.log('[BACKUP] ⏰ Execução diária: 3:00 AM (configurável)');
      console.log('[BACKUP] 🎯 Sistema: Local + Email (100% automático)');
    } catch (error: any) {
      console.error('[BACKUP] ❌ Erro ao inicializar sistema de backup:', error.message);
      console.error('[BACKUP] ⚠️ Backups automáticos desabilitados');
    }
    // ====================================================================
    
    // ==================== SISTEMA DE LIMPEZA R2 AUTOMATICA ====================
    try {
      startCleanupScheduler();
    } catch (error: any) {
      console.error('[R2-CLEANUP] Erro ao inicializar sistema de limpeza:', error.message);
    }
    // =========================================================================
    
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
        console.log(`Heap Used/Total: ${(memoryData.heapUsed / memoryData.heapTotal * 100).toFixed(2)}%`);
        
        // Monitorar também estatísticas do pool de conexões do banco de dados
        if (pool) {
          console.log(`DB Pool: Total=${pool.totalCount}, Idle=${pool.idleCount}, Waiting=${pool.waitingCount}`);
        }
        
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
      clearInterval(dbHealthCheckInterval);
      clearInterval(downgradeIntervalId);
      
      // Fechar o pool de conexões com o banco
      pool.end().catch(err => console.error('Error closing DB pool on SIGINT:', err));
      
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      clearInterval(intervalId);
      clearInterval(gcIntervalId);
      clearInterval(dbHealthCheckInterval);
      clearInterval(downgradeIntervalId);
      
      // Fechar o pool de conexões com o banco
      pool.end().catch(err => console.error('Error closing DB pool on SIGTERM:', err));
      process.exit(0);
    });
  }
})();
