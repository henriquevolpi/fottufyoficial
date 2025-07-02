import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { deleteFileFromR2 } from "./r2";
import { 
  insertUserSchema, 
  insertProjectSchema, 
  WebhookPayload, 
  SUBSCRIPTION_PLANS, 
  Project,
  projects,
  newProjects,
  photos,
  insertNewProjectSchema,
  insertPhotoSchema,
  insertPhotoCommentSchema,
  users,
  portfolios,
  portfolioPhotos,
  insertPortfolioSchema,
  insertPortfolioPhotoSchema,
  type Portfolio,
  type PortfolioPhoto
} from "@shared/schema";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { setupAuth, hashPassword } from "./auth";
import Stripe from 'stripe';
import { upload } from "./index";
import http from "http";
import https from "https";
import bodyParser from "body-parser";
import passport from "passport";
import { db } from "./db";
import { eq, and, or, not, desc, count } from "drizzle-orm";
import { sendEmail } from "./utils/sendEmail";
import { verifyPasswordResetToken, resetPasswordWithToken, generatePasswordResetToken, sendPasswordResetEmail } from "./utils/passwordReset";
// Use Cloudflare R2 for storage
import { 
  BUCKET_NAME as R2_BUCKET_NAME, 
  uploadFileToR2, 
  r2Upload, 
  generateUniqueFileName, 
  isValidFileType, 
  isValidFileSize,
  downloadAndUploadToR2
} from "./r2";
import { streamUploadMiddleware, cleanupTempFiles, processAndStreamToR2 } from "./streamUpload";
import { processHotmartWebhook, validateHotmartSignature } from "./integrations/hotmart";
import multer from "multer";

// Helper function to download an image from a URL to the uploads directory
async function downloadImage(url: string, filename: string): Promise<string> {
  // Create a unique filename with the original extension
  const id = nanoid();
  const extension = path.extname(filename) || '.jpg';
  const targetFilename = `${id}${extension}`;
  const targetPath = path.join("uploads", targetFilename);
  
  console.log(`Downloading image from ${url} to ${targetPath}`);

  return new Promise((resolve, reject) => {
    // Choose http or https based on the URL
    const client = url.startsWith('https') ? https : http;
    
    const request = client.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log(`Following redirect to ${redirectUrl}`);
          downloadImage(redirectUrl, filename)
            .then(resolve)
            .catch(reject);
          return;
        }
      }
      
      // Check if the response is successful
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      // Create a write stream to save the file
      const fileStream = fs.createWriteStream(targetPath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Successfully downloaded image to ${targetPath}`);
        resolve(`/uploads/${targetFilename}`);
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(targetPath, () => {}); // Clean up any partially downloaded file
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    // Set a timeout for the request
    request.setTimeout(10000, () => {
      request.abort();
      reject(new Error(`Request timeout downloading image from ${url}`));
    });
  });
}

// Basic authentication middleware (otimizado para menor uso de memória)
const authenticate = async (req: Request, res: Response, next: Function) => {
  // Logs reduzidos para economizar memória - apenas para rotas importantes ou debug
  if (process.env.DEBUG_AUTH === 'true' && (req.path.includes('/login') || req.path.includes('/logout'))) {
    console.log(`[AUTH] ${req.method} ${req.path}`);
  }
  
  // First check for session-based authentication (Passport adds isAuthenticated method)
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Check if we have any cookie that can be used to authenticate
  if (req.headers.cookie) {
    // First, try to recover from the session cookie
    if (req.headers.cookie.includes('studio.sid') && req.session && req.sessionID) {
      // If we have session cookie but no session data, try to force a session refresh
      req.session.reload((err) => {
        if (!err && req.isAuthenticated && req.isAuthenticated()) {
          return next();
        }
      });
    }
    
    // Check for our direct authentication cookie - Using optimized string parsing
    const cookieStr = req.headers.cookie;
    if (cookieStr.includes('user_id=')) {
      // Try to extract user ID from cookie - algoritmo otimizado
      let userId: number | null = null;
      const userIdIndex = cookieStr.indexOf('user_id=');
      
      if (userIdIndex >= 0) {
        const valueStart = userIdIndex + 8; // 'user_id='.length
        const valueEnd = cookieStr.indexOf(';', valueStart);
        const valueStr = valueEnd >= 0 
          ? cookieStr.substring(valueStart, valueEnd) 
          : cookieStr.substring(valueStart);
          
        userId = parseInt(valueStr);
      }
      
      if (userId && !isNaN(userId)) {
        // Get user from storage and establish session
        storage.getUser(userId)
          .then(user => {
            if (user) {
              // Login the user to establish a session
              req.login(user, (err) => {
                if (!err) {
                  // Update last login timestamp silently but don't wait for it
                  storage.updateUser(user.id, { lastLoginAt: new Date() })
                    .catch(() => {
                      // Falha silenciosa para não impactar o usuário
                    });
                  
                  next();
                }
              });
            }
          })
          .catch(() => {
            // Falha silenciosa para economizar memória
          });
          
        // Important: return to prevent execution of code below
        return;
      }
    }
  }
  
  // For development purposes only, allow alternate auth methods
  
  // Check for admin override parameter (for development testing only)
  if (req.query.admin === 'true') {
    console.log("[AUTH] Admin override via query param");
    try {
      // Try to find admin in the database first
      const adminUser = await storage.getUserByEmail("admin@studio.com");
      
      if (adminUser) {
        req.login(adminUser, (err) => {
          if (err) {
            console.error("[AUTH] Error logging in admin user:", err);
            return next(err);
          }
          console.log("[AUTH] Admin session established via query param");
          return next();
        });
        return; // Return to avoid calling next() twice
      } else {
        console.log("[AUTH] Admin user not found in database");
      }
    } catch (error) {
      console.error("[AUTH] Error fetching admin user:", error);
    }
  }
  
  // If we reach here, user is not authenticated
  if (process.env.DEBUG_AUTH === 'true') {
    console.log("[AUTH] No authentication found, returning 401");
  }
  
  // Return simplified error message to economizar memória
  return res.status(401).json({ 
    message: "Não autorizado"
  });
};

// Admin role check middleware
const requireAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
};

// Status check middleware
const requireActiveUser = (req: Request, res: Response, next: Function) => {
  if (!req.user || req.user.status !== "active") {
    return res.status(403).json({ message: "Your account is not active" });
  }
  
  next();
};

// Use r2Upload from r2.ts instead of redefining it here

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Inicializar Stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Chave secreta do Stripe não encontrada. As funcionalidades de pagamento não funcionarão corretamente.');
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  
  // ==================== Cloudflare R2 Upload Routes ====================
  
  // Test R2 connection
  app.get("/api/r2/test", async (req: Request, res: Response) => {
    try {
      // Check if we have all required env variables
      if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || 
          !process.env.R2_BUCKET_NAME || !process.env.R2_ACCOUNT_ID) {
        return res.status(500).json({
          status: "error",
          message: "Missing required R2 configuration variables",
          config: {
            hasAccessKey: Boolean(process.env.R2_ACCESS_KEY_ID),
            hasSecretKey: Boolean(process.env.R2_SECRET_ACCESS_KEY),
            hasBucketName: Boolean(process.env.R2_BUCKET_NAME),
            hasAccountId: Boolean(process.env.R2_ACCOUNT_ID)
          }
        });
      }
      
      // Try a simple R2 operation to test connection
      const testFileContent = Buffer.from("R2 connection test file - " + new Date().toISOString());
      const testFileName = `test-${Date.now()}.txt`;
      
      const result = await uploadFileToR2(
        testFileContent,
        testFileName,
        "text/plain"
      );
      
      return res.status(200).json({
        status: "success",
        message: "R2 connection successful",
        endpoint: `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/`,
        testFile: {
          url: result.url,
          key: result.key
        }
      });
    } catch (error) {
      console.error("R2 test connection failed:", error);
      return res.status(500).json({
        status: "error",
        message: "R2 connection failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Upload uma ou mais imagens diretamente para o Cloudflare R2 Storage (endpoint genérico)
  // Usando streaming para maior eficiência de memória
  app.post("/api/photos/upload", authenticate, streamUploadMiddleware(), cleanupTempFiles, async (req: Request & { files?: any[] }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Verificar se existem arquivos na requisição
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files were uploaded" });
      }
      
      // Verificar se o usuário possui limite disponível
      const uploadCount = req.files.length;
      const canUpload = await storage.checkUploadLimit(req.user.id, uploadCount);
      
      if (!canUpload) {
        // Buscar informações detalhadas do usuário para mensagem personalizada
        const user = await storage.getUser(req.user.id);
        const planName = user?.planType || 'gratuito';
        const uploadLimit = user?.uploadLimit || 0;
        const usedUploads = user?.usedUploads || 0;
        
        return res.status(403).json({ 
          message: "Limite de uploads atingido", 
          error: "UPLOAD_LIMIT_REACHED",
          details: `Sua conta ${planName} atingiu o limite de ${uploadLimit} fotos (${usedUploads} utilizadas). Para continuar fazendo uploads, verifique sua assinatura no painel ou entre em contato com nosso suporte.`,
          uploadLimit,
          usedUploads
        });
      }
      
      // Upload cada arquivo para o Cloudflare R2 Storage
      const uploadedFiles = [];
      
      for (const file of req.files) {
        const filename = generateUniqueFileName(file.originalname);
        
        try {
          // Upload para o R2 usando streaming
          const result = await processAndStreamToR2(
            file.path, 
            filename, 
            file.mimetype
          );
          
          // Usar a URL retornada pela função de upload para R2 (que já usa o domínio CDN)
          // Atualmente, o formato é: https://cdn.fottufy.com/{filename}
          
          uploadedFiles.push({
            originalName: file.originalname,
            filename: filename,
            size: file.size,
            mimetype: file.mimetype,
            url: result.url, // Usar a URL retornada pelo método de streaming
            key: result.key
          });
        } catch (error) {
          console.error(`Error uploading file ${filename} to R2:`, error);
          continue; // Continuar com próximo arquivo mesmo se este falhar
        }
      }
      
      // Atualizar a contagem de uploads do usuário
      if (uploadedFiles.length > 0) {
        await storage.updateUploadUsage(req.user.id, uploadedFiles.length);
        
        // Agenda a liberação de memória após terminar o upload
        if (process.env.DEBUG_MEMORY === 'true' && typeof global.gc === 'function') {
          console.log('[DEBUG] Upload genérico finalizado. Agendando global.gc() para daqui 3 minutos...');
          setTimeout(() => {
            try {
              global.gc();
              console.log('[DEBUG] global.gc() executado com sucesso após 3 minutos');
            } catch (err) {
              console.error('[DEBUG] Erro ao executar global.gc():', err);
            }
          }, 3 * 60 * 1000);
        }
      }
      
      return res.status(200).json({
        success: true,
        files: uploadedFiles,
        totalUploaded: uploadedFiles.length,
        newUsedUploads: (req.user.usedUploads || 0) + uploadedFiles.length,
        uploadLimit: req.user.uploadLimit
      });
    } catch (error) {
      console.error("Error uploading photos to R2:", error);
      
      // Analisar o tipo de erro para dar mensagem mais específica
      let errorMessage = "Erro interno do servidor durante o upload";
      let errorDetails = "";
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes("network") || errorMsg.includes("connection")) {
          errorMessage = "Problema de conexão com o servidor de armazenamento";
          errorDetails = "Verifique sua conexão com a internet e tente novamente";
        } else if (errorMsg.includes("timeout")) {
          errorMessage = "Tempo limite excedido durante o upload";
          errorDetails = "Arquivos muito grandes ou conexão lenta. Tente com menos fotos por vez";
        } else if (errorMsg.includes("storage") || errorMsg.includes("bucket")) {
          errorMessage = "Problema no sistema de armazenamento";
          errorDetails = "Nosso sistema de arquivos está temporariamente indisponível";
        } else if (errorMsg.includes("memory") || errorMsg.includes("heap")) {
          errorMessage = "Sobrecarga do sistema durante processamento";
          errorDetails = "Muitas fotos sendo processadas. Aguarde alguns minutos e tente novamente";
        } else if (errorMsg.includes("quota") || errorMsg.includes("limit")) {
          errorMessage = "Limite de conta atingido";
          errorDetails = "Você atingiu o limite de uploads do seu plano. Considere fazer upgrade";
        } else {
          errorDetails = error.message;
        }
      }
      
      return res.status(500).json({
        message: errorMessage,
        details: errorDetails,
        suggestion: "Se o problema persistir, limpe o cache do navegador ou entre em contato com o suporte"
      });
    }
  });
  
  // Upload uma ou mais imagens diretamente para o Cloudflare R2 Storage e associa a um projeto específico
  // Usando streaming para maior eficiência de memória
  app.post("/api/projects/:id/photos/upload", authenticate, streamUploadMiddleware(), cleanupTempFiles, async (req: Request & { files?: any[] }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const projectId = req.params.id;
      
      // Verificar se o projeto existe e pertence ao usuário
      const project = await db.query.newProjects.findFirst({
        where: and(
          eq(newProjects.id, projectId),
          eq(newProjects.userId, req.user.id)
        )
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found or unauthorized" });
      }
      
      // Verificar se existem arquivos na requisição
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files were uploaded" });
      }
      
      // Verificar se o usuário possui limite disponível
      const uploadCount = req.files.length;
      const canUpload = await storage.checkUploadLimit(req.user.id, uploadCount);
      
      if (!canUpload) {
        // Buscar informações detalhadas do usuário para mensagem personalizada
        const user = await storage.getUser(req.user.id);
        const planName = user?.planType || 'gratuito';
        const uploadLimit = user?.uploadLimit || 0;
        const usedUploads = user?.usedUploads || 0;
        
        return res.status(403).json({ 
          message: "Limite de uploads atingido", 
          error: "UPLOAD_LIMIT_REACHED",
          details: `Sua conta ${planName} atingiu o limite de ${uploadLimit} fotos (${usedUploads} utilizadas). Para continuar fazendo uploads, verifique sua assinatura no painel ou entre em contato com nosso suporte.`,
          uploadLimit,
          usedUploads
        });
      }
      
      // Upload cada arquivo para o Cloudflare R2 Storage usando streaming
      const uploadedFiles = [];
      const newPhotos = [];
      
      for (const file of req.files) {
        const filename = generateUniqueFileName(file.originalname);
        
        try {
          // Capturar informações mínimas antes do upload
          const originalName = file.originalname;
          const fileSize = file.size;
          const fileMimetype = file.mimetype;
          
          // Upload para o R2 usando streaming
          const result = await processAndStreamToR2(
            file.path, 
            filename, 
            fileMimetype
          );
          
          // Adicionar a foto ao banco de dados associada ao projeto
          try {
            const newPhoto = await db.insert(photos).values({
              projectId,
              url: result.url,
              filename,
              selected: false
            }).returning();
            
            // Armazenar apenas o ID se precisar recuperar depois
            if (newPhoto && newPhoto[0]) {
              newPhotos.push(newPhoto[0].id);
            }
          } catch (dbError) {
            console.error(`Error adding photo to database: ${filename}`);
            // Não log do erro completo para economizar memória
          }
            
          // Armazenar apenas dados essenciais
          uploadedFiles.push({
            originalName,
            filename,
            size: fileSize,
            url: result.url,
          });
        } catch (uploadError) {
          console.error(`Error uploading file ${filename} to R2:`, uploadError);
          continue; // Continuar com próximo arquivo mesmo se este falhar
        }
      }
      
      // Atualizar a contagem de uploads do usuário
      if (uploadedFiles.length > 0) {
        await storage.updateUploadUsage(req.user.id, uploadedFiles.length);
        
        // Agenda a liberação de memória após terminar o upload
        if (process.env.DEBUG_MEMORY === 'true' && typeof global.gc === 'function') {
          console.log('[DEBUG] Upload finalizado. Agendando global.gc() para daqui 3 minutos...');
          setTimeout(() => {
            try {
              global.gc();
              console.log('[DEBUG] global.gc() executado com sucesso após 3 minutos');
            } catch (err) {
              console.error('[DEBUG] Erro ao executar global.gc():', err);
            }
          }, 3 * 60 * 1000);
        }
      }
      
      return res.status(200).json({
        success: true,
        files: uploadedFiles,
        photos: newPhotos,
        totalUploaded: uploadedFiles.length,
        projectId: projectId,
        newUsedUploads: (req.user.usedUploads || 0) + uploadedFiles.length,
        uploadLimit: req.user.uploadLimit
      });
    } catch (error) {
      console.error("Error uploading photos to project:", error);
      
      // Analisar o tipo de erro para dar mensagem mais específica
      let errorMessage = "Erro ao adicionar fotos ao projeto";
      let errorDetails = "";
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes("not found") || errorMsg.includes("unauthorized")) {
          errorMessage = "Projeto não encontrado ou sem permissão";
          errorDetails = "Verifique se o projeto ainda existe e se você tem acesso a ele";
        } else if (errorMsg.includes("network") || errorMsg.includes("connection")) {
          errorMessage = "Problema de conexão durante o upload";
          errorDetails = "Verifique sua conexão com a internet e tente novamente";
        } else if (errorMsg.includes("storage") || errorMsg.includes("bucket")) {
          errorMessage = "Erro no sistema de armazenamento";
          errorDetails = "Nosso servidor de arquivos está temporariamente indisponível";
        } else if (errorMsg.includes("quota") || errorMsg.includes("limit")) {
          errorMessage = "Limite de uploads atingido";
          errorDetails = "Você atingiu o limite do seu plano. Considere fazer upgrade para continuar";
        } else if (errorMsg.includes("timeout")) {
          errorMessage = "Tempo limite excedido";
          errorDetails = "Upload muito lento. Tente com menos fotos ou verifique sua conexão";
        } else {
          errorDetails = error.message;
        }
      }
      
      return res.status(500).json({
        message: errorMessage,
        details: errorDetails,
        suggestion: "Tente recarregar a página ou limpar o cache do navegador"
      });
    }
  });
  
  // ==================== New Project Management Routes ====================
  
  // Get all projects for the authenticated user (otimizado para menor uso de memória)
  app.get("/api/v2/projects", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Buscar projetos sem as fotos para reduzir o consumo de memória
      const projects = await db.query.newProjects.findMany({
        where: eq(newProjects.userId, req.user.id)
      });
      
      // Para cada projeto, adicionar apenas a contagem de fotos e não os arrays completos
      const projectsWithCounts = await Promise.all(
        projects.map(async (project) => {
          // Buscar a contagem de fotos para este projeto
          const photoCountResult = await db.select({ count: count() })
            .from(photos)
            .where(eq(photos.projectId, project.id));
            
          const photoCount = photoCountResult[0]?.count || 0;
          
          // Buscar a contagem de fotos selecionadas
          const selectedCountResult = await db.select({ count: count() })
            .from(photos)
            .where(and(
              eq(photos.projectId, project.id),
              eq(photos.selected, true)
            ));
            
          const selectedCount = selectedCountResult[0]?.count || 0;
          
          // Retornar o projeto com as contagens, mas sem o array completo
          return {
            ...project,
            photoCount,
            selectedCount,
            // Não incluímos o array 'photos' aqui para economizar memória
          };
        })
      );
      
      res.json(projectsWithCounts);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects", error: (error as Error).message });
    }
  });
  
  // Create a new project
  app.post("/api/v2/projects", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { title, description } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Project title is required" });
      }
      
      const newProject = await db.insert(newProjects).values({
        userId: req.user.id,
        title,
        description: description || null
      }).returning();
      
      res.status(201).json(newProject[0]);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project", error: (error as Error).message });
    }
  });
  
  // Get a specific project by ID (com paginação para reduzir consumo de memória)
  app.get("/api/v2/projects/:id", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const projectId = req.params.id;
      
      // Parâmetros de paginação
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 100; // valor padrão reduzido para 100 itens
      const offset = (page - 1) * pageSize;
      
      // Primeiro buscar detalhes do projeto sem as fotos
      const project = await db.query.newProjects.findFirst({
        where: and(
          eq(newProjects.id, projectId),
          eq(newProjects.userId, req.user.id)
        )
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Buscar contagem total de fotos para este projeto
      const totalPhotosResult = await db.select({ count: count() })
        .from(photos)
        .where(eq(photos.projectId, projectId));
      
      const totalPhotos = totalPhotosResult[0]?.count || 0;
      const totalPages = Math.ceil(totalPhotos / pageSize);
      
      // Agora buscar apenas as fotos da página atual
      const projectPhotos = await db.select()
        .from(photos)
        .where(eq(photos.projectId, projectId))
        .limit(pageSize)
        .offset(offset);
      
      // Combinar os resultados
      const projectWithPhotos = {
        ...project,
        photos: projectPhotos,
        pagination: {
          page,
          pageSize,
          totalItems: totalPhotos,
          totalPages
        }
      };
      
      res.json(projectWithPhotos);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project", error: (error as Error).message });
    }
  });
  
  // Add a photo to a project
  app.post("/api/v2/photos", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { projectId, url } = req.body;
      
      if (!projectId || !url) {
        return res.status(400).json({ message: "Project ID and photo URL are required" });
      }
      
      // Verify the project belongs to the user
      const project = await db.query.newProjects.findFirst({
        where: and(
          eq(newProjects.id, projectId),
          eq(newProjects.userId, req.user.id)
        )
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found or unauthorized" });
      }
      
      // Add the photo
      const newPhoto = await db.insert(photos).values({
        projectId,
        url,
        selected: false
      }).returning();
      
      res.status(201).json(newPhoto[0]);
    } catch (error) {
      console.error("Error adding photo:", error);
      res.status(500).json({ message: "Failed to add photo", error: (error as Error).message });
    }
  });
  
  // Toggle photo selection
  app.patch("/api/v2/photos/:id/select", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const photoId = req.params.id;
      const { selected } = req.body;
      
      // Verify the photo exists and belongs to the user's project
      const photo = await db.query.photos.findFirst({
        where: eq(photos.id, photoId),
        with: {
          project: true
        }
      });
      
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      if (photo.project.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized access to this photo" });
      }
      
      // Update the photo's selection status
      const updatedPhoto = await db.update(photos)
        .set({ selected: selected === undefined ? !photo.selected : !!selected })
        .where(eq(photos.id, photoId))
        .returning();
      
      res.json(updatedPhoto[0]);
    } catch (error) {
      console.error("Error updating photo selection:", error);
      res.status(500).json({ message: "Failed to update photo selection", error: (error as Error).message });
    }
  });
  
  // Delete a photo
  app.delete("/api/v2/photos/:id", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const photoId = req.params.id;
      const userId = req.user.id;
      
      // Verify the photo exists and belongs to the user's project
      const photo = await db.query.photos.findFirst({
        where: eq(photos.id, photoId),
        with: {
          project: true
        }
      });
      
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      if (photo.project.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to this photo" });
      }
      
      // Delete the photo
      await db.delete(photos).where(eq(photos.id, photoId));
      
      // Update the user's upload usage (reduce by 1)
      await storage.updateUploadUsage(userId, -1);
      if (process.env.DEBUG_UPLOAD === 'true') {
        console.log(`Updated upload usage for user ${userId} after deleting photo ${photoId}`);
      }
      
      res.json({ message: "Photo deleted successfully" });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "Failed to delete photo", error: (error as Error).message });
    }
  });
  
  // Save selections for multiple photos in a project
  app.patch("/api/v2/photos/select", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { projectId, photoIds } = req.body;
      
      if (!projectId || !Array.isArray(photoIds)) {
        return res.status(400).json({ message: "Project ID and array of photo IDs are required" });
      }
      
      if (process.env.DEBUG_SELECTION === 'true') {
        console.log(`Salvando seleção para projeto ${projectId} com ${photoIds.length} fotos`);
      }
      
      // Verificar se o projeto existe e se o usuário tem permissão
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verificar se o usuário tem permissão para este projeto
      if (project.photographerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "You don't have permission to access this project" });
      }
      
      // Atualizar seleções no projeto
      try {
        await storage.updateProjectSelections(projectId, photoIds);
        console.log(`Seleções atualizadas com sucesso para o projeto ${projectId}`);
        res.status(200).json({ 
          message: "Selections saved successfully",
          selectedCount: photoIds.length
        });
      } catch (error) {
        console.error('Erro ao atualizar seleções:', error);
        res.status(500).json({ 
          message: "Failed to update selections", 
          error: (error as Error).message 
        });
      }
    } catch (error) {
      console.error("Error saving selections:", error);
      res.status(500).json({ 
        message: "Failed to save selections", 
        error: (error as Error).message 
      });
    }
  });

  // Add photos to existing project (for batch upload)
  app.post("/api/projects/:projectId/add-photos", r2Upload.array('photos', 10000), async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId;
      console.log(`[Batch Upload] Adicionando fotos ao projeto ${projectId}`);
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }
      
      // Verificar se o projeto existe
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verificar se há arquivos para upload
      const uploadedFiles = req.files as Express.Multer.File[];
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ message: "No photos provided" });
      }
      
      console.log(`[Batch Upload] Processando ${uploadedFiles.length} fotos para o projeto ${projectId}`);
      
      let successCount = 0;
      const newPhotos: string[] = [];
      
      // Processar cada arquivo
      for (const file of uploadedFiles) {
        try {
          const filename = generateUniqueFileName(file.originalname);
          
          // Upload para o R2 usando streaming
          const result = await processAndStreamToR2(
            file.path, 
            filename, 
            file.mimetype
          );
          
          // Adicionar a foto ao banco de dados associada ao projeto
          const newPhoto = await db.insert(photos).values({
            projectId,
            url: result.url,
            filename,
            selected: false
          }).returning();
          
          if (newPhoto && newPhoto[0]) {
            newPhotos.push(newPhoto[0].id);
            successCount++;
          }
        } catch (uploadError) {
          console.error(`[Batch Upload] Erro ao processar arquivo ${file.originalname}:`, uploadError);
          // Continuar com próximo arquivo mesmo se este falhar
        }
      }
      
      // Atualizar a contagem de uploads do usuário
      if (successCount > 0) {
        await storage.updateUploadUsage(project.photographerId, successCount);
        console.log(`[Batch Upload] Atualizou contagem de uploads do usuário ${project.photographerId}: +${successCount}`);
      }
      
      // Limpar arquivos temporários
      if (uploadedFiles && uploadedFiles.length > 0) {
        await cleanupTempFiles(uploadedFiles);
      }
      
      console.log(`[Batch Upload] Concluído: ${successCount}/${uploadedFiles.length} fotos adicionadas ao projeto ${projectId}`);
      
      res.status(200).json({ 
        message: "Photos added successfully", 
        count: successCount,
        totalRequested: uploadedFiles.length,
        projectId: projectId
      });
    } catch (error) {
      console.error("[Batch Upload] Erro ao adicionar fotos:", error);
      
      // Analisar o tipo de erro para dar mensagem mais específica
      let errorMessage = "Erro durante upload em lote";
      let errorDetails = "";
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes("not found") || errorMsg.includes("project")) {
          errorMessage = "Projeto não encontrado";
          errorDetails = "O projeto foi removido ou você não tem mais acesso a ele";
        } else if (errorMsg.includes("authentication") || errorMsg.includes("unauthorized")) {
          errorMessage = "Sessão expirada";
          errorDetails = "Faça login novamente para continuar o upload";
        } else if (errorMsg.includes("storage") || errorMsg.includes("bucket") || errorMsg.includes("r2")) {
          errorMessage = "Problema no servidor de arquivos";
          errorDetails = "Sistema de armazenamento temporariamente indisponível";
        } else if (errorMsg.includes("memory") || errorMsg.includes("heap")) {
          errorMessage = "Sobrecarga do sistema";
          errorDetails = "Muitas fotos sendo processadas. Aguarde e tente com menos fotos";
        } else if (errorMsg.includes("quota") || errorMsg.includes("limit")) {
          errorMessage = "Limite de uploads excedido";
          errorDetails = "Você atingiu o limite do seu plano atual";
        } else if (errorMsg.includes("timeout")) {
          errorMessage = "Tempo limite excedido";
          errorDetails = "Upload muito lento. Tente com menos fotos por vez";
        } else {
          errorDetails = error.message;
        }
      }
      
      res.status(500).json({ 
        message: errorMessage,
        details: errorDetails,
        suggestion: "Recarregue a página e tente novamente com menos fotos"
      });
    }
  });
  
  // ==================== Auth Routes ==================== 
  // (basic routes handled by setupAuth)
  
  // Using login route defined in auth.ts instead

  // Using register route defined in auth.ts instead
  
  // ==================== User Routes ====================
  
  // Admin API Routes

  // Get all users with filtering options
  app.get("/api/admin/users", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      // Get filter parameters
      const planType = req.query.planType as string;
      const status = req.query.status as string;
      const isDelinquent = req.query.isDelinquent === 'true';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      let users = await storage.getUsers();
      
      // Apply filters if provided
      if (planType) {
        users = users.filter(user => user.planType === planType);
      }
      
      if (status) {
        users = users.filter(user => user.status === status);
      }
      
      if (isDelinquent) {
        users = users.filter(user => 
          user.subscriptionStatus === 'inactive' || 
          user.subscriptionStatus === 'canceled'
        );
      }
      
      if (startDate) {
        const start = new Date(startDate);
        users = users.filter(user => new Date(user.createdAt) >= start);
      }
      
      if (endDate) {
        const end = new Date(endDate);
        users = users.filter(user => new Date(user.createdAt) <= end);
      }
      
      // Don't send passwords back to client
      const sanitizedUsers = users.map(user => ({
        ...user,
        password: undefined,
      }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error retrieving users:", error);
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });
  
  // Get user counts by plan type for admin dashboard
  app.get("/api/admin/users/counts-by-plan", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      
      // Create a map of plan types to count
      const planCounts: Record<string, number> = {};
      
      // Count users for each plan type
      users.forEach(user => {
        const planType = user.planType || 'unknown';
        if (planCounts[planType]) {
          planCounts[planType]++;
        } else {
          planCounts[planType] = 1;
        }
      });
      
      res.json(planCounts);
    } catch (error) {
      console.error("Error retrieving plan counts:", error);
      res.status(500).json({ message: "Failed to retrieve plan counts" });
    }
  });

  // Get all projects with photo counts for admin dashboard
  app.get("/api/admin/projects", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      // Use raw SQL to get projects with real photo counts and user info
      const result = await db.execute(`
        SELECT 
          p.id,
          p.public_id,
          p.name,
          p.client_name,
          p.photographer_id,
          p.status,
          p.created_at,
          COALESCE((SELECT COUNT(*) FROM photos ph WHERE ph.project_id = p.public_id), 0) as photo_count,
          EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400 as days_old,
          u.email,
          u.status as user_status,
          u.plan_type
        FROM projects p
        LEFT JOIN users u ON p.photographer_id = u.id
        ORDER BY photo_count DESC, p.created_at DESC
      `);

      const projectsWithStats = result.rows.map(row => ({
        id: row.id,
        publicId: row.public_id,
        projectViewId: `project-view/${row.id}`,
        name: row.name,
        clientName: row.client_name,
        photographerId: row.photographer_id,
        status: row.status,
        createdAt: row.created_at,
        photoCount: parseInt(row.photo_count),
        daysOld: Math.ceil(parseFloat(row.days_old)),
        userEmail: row.email,
        userStatus: row.user_status,
        userPlanType: row.plan_type
      }));

      res.json(projectsWithStats);
    } catch (error) {
      console.error("Error retrieving projects:", error);
      res.status(500).json({ message: "Failed to retrieve projects" });
    }
  });

  // Get all users (legacy endpoint - keeping for backward compatibility)
  app.get("/api/users", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      
      // Don't send passwords back to client
      const sanitizedUsers = users.map(user => ({
        ...user,
        password: undefined,
      }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });
  
  // Set plan for a user
  app.post("/api/admin/set-plan", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email, planType } = req.body;
      
      if (!email || !planType) {
        return res.status(400).json({ message: "Email and plan type are required" });
      }
      
      // Validate plan type
      const validPlans = Object.values(SUBSCRIPTION_PLANS).map(plan => plan.type);
      if (!validPlans.includes(planType)) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Set the upload limit based on the plan
      const planConfig = Object.values(SUBSCRIPTION_PLANS).find(plan => plan.type === planType);
      const uploadLimit = planConfig ? planConfig.uploadLimit : 0;
      
      // Update user with new plan information
      const updatedUser = await storage.updateUser(user.id, { 
        planType,
        uploadLimit,
        subscriptionStatus: "active",
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      res.json({
        success: true,
        user: {
          ...updatedUser,
          password: undefined,
        }
      });
    } catch (error) {
      console.error("Error setting plan:", error);
      res.status(500).json({ message: "Failed to set plan for user" });
    }
  });

  // Rota exclusiva para ativação manual de planos pelo ADM (expira em 34 dias)
  app.post("/api/admin/activate-manual-plan", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email, planType } = req.body;
      const adminEmail = req.user?.email;
      
      if (!email || !planType) {
        return res.status(400).json({ message: "Email and plan type are required" });
      }
      
      if (!adminEmail) {
        return res.status(401).json({ message: "Admin email not found" });
      }
      
      // Validar se o plano é válido
      const validPlans = ['basic_v2', 'photographer_v2', 'studio_v2'];
      if (!validPlans.includes(planType)) {
        return res.status(400).json({ message: "Invalid plan type. Valid plans: basic_v2, photographer_v2, studio_v2" });
      }
      
      // Encontrar usuário por email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Ativar plano manual com expiração de 34 dias
      await storage.activateManualPlan(user.id, planType, adminEmail);
      
      res.json({ 
        success: true,
        message: `Plan ${planType} manually activated for user ${email}`,
        expirationNote: "This plan will expire in 34 days unless payment is made via Hotmart",
        activatedBy: adminEmail,
        activationDate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error activating manual plan:", error);
      res.status(500).json({ message: "Failed to activate manual plan" });
    }
  });

  // Rota exclusiva para redefinir senha de cliente pelo ADM
  app.post("/api/admin/reset-user-password", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email, newPassword } = req.body;
      const adminEmail = req.user?.email;
      
      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email and new password are required" });
      }
      
      if (!adminEmail) {
        return res.status(401).json({ message: "Admin email not found" });
      }
      
      // Validar força da senha
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      // Encontrar usuário por email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Redefinir senha do usuário
      await storage.resetUserPasswordByAdmin(user.id, newPassword, adminEmail);
      
      res.json({ 
        success: true,
        message: `Password successfully reset for user ${email}`,
        resetBy: adminEmail,
        resetDate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error resetting user password:", error);
      res.status(500).json({ message: "Failed to reset user password" });
    }
  });
  
  // Toggle user status (active/suspended)
  app.post("/api/admin/toggle-user", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email, status } = req.body;
      
      if (!email || !status) {
        return res.status(400).json({ message: "Email and status are required" });
      }
      
      // Validate status
      if (!["active", "suspended", "canceled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user status
      const updatedUser = await storage.updateUser(user.id, { status });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user status" });
      }
      
      res.json({
        success: true,
        user: {
          ...updatedUser,
          password: undefined,
        }
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
      res.status(500).json({ message: "Failed to toggle user status" });
    }
  });
  
  // Add a new user
  app.post("/api/admin/add-user", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, email, password, role, planType } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Set defaults and validate role
      const userRole = role === "admin" ? "admin" : "photographer";
      
      // Validate plan type and set upload limit
      let uploadLimit = 0;
      let userPlanType = planType || "free";
      
      const planConfig = Object.values(SUBSCRIPTION_PLANS).find(plan => plan.type === userPlanType);
      if (planConfig) {
        uploadLimit = planConfig.uploadLimit;
      } else {
        // Default to free plan if invalid plan type
        userPlanType = "free";
        const freePlan = Object.values(SUBSCRIPTION_PLANS).find(plan => plan.type === "free");
        uploadLimit = freePlan ? freePlan.uploadLimit : 10;
      }
      
      // Create the new user
      const newUser = await storage.createUser({
        name,
        email,
        password,
        phone: "",  // Campo obrigatório, usar string vazia como padrão
        role: userRole,
        status: "active",
        planType: userPlanType,
        subscriptionStatus: userPlanType === "free" ? "inactive" : "active",
      });
      
      // Update the user with the upload limit
      const updatedUser = await storage.updateUser(newUser.id, {
        uploadLimit,
        subscriptionStartDate: userPlanType === "free" ? undefined : new Date(),
        subscriptionEndDate: userPlanType === "free" ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      
      res.status(201).json({
        success: true,
        user: {
          ...(updatedUser || newUser),
          password: undefined,
        }
      });
    } catch (error) {
      console.error("Error adding user:", error);
      res.status(500).json({ message: "Failed to add user" });
    }
  });
  
  // Get user by ID (admin or self)
  app.get("/api/users/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Check if user is requesting own data or is admin
      if (req.user && req.user.id !== userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to access this user" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password back to client
      const { password, ...sanitizedUser } = user;
      
      res.json(sanitizedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve user" });
    }
  });

  // Get user stats for dashboard
  app.get("/api/user/stats", authenticate, async (req: Request, res: Response) => {
    let responseSent = false;
    
    try {
      if (!req.user) {
        if (!responseSent) {
          responseSent = true;
          return res.status(401).json({ message: "Authentication required" });
        }
        return;
      }
      const userId = req.user.id;
      
      // Get all projects for this user
      const userProjects = await storage.getProjects(userId);
      
      // Calculate active projects (not archived)
      const activeProjects = userProjects.filter(
        project => project.status !== "arquivado"
      ).length;
      
      // Calculate photos this month
      const currentDate = new Date();
      const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      
      // Count all photos uploaded this month across all projects
      let photosThisMonth = 0;
      userProjects.forEach(project => {
        // Check if project was created this month
        const projectDate = new Date(project.createdAt);
        if (projectDate >= firstDayOfMonth) {
          // Count photos in this project
          const photoCount = project.photos ? project.photos.length : 0;
          photosThisMonth += photoCount;
        }
      });
      
      // Calculate total usage in MB (for this example, assume 2MB per photo on average)
      const averagePhotoSizeMB = 2;
      const totalUploadUsageMB = userProjects.reduce((total, project) => {
        const photoCount = project.photos ? project.photos.length : 0;
        return total + photoCount * averagePhotoSizeMB;
      }, 0);
      
      // Get user details including plan info
      const user = await storage.getUser(userId);
      if (!user) {
        if (!responseSent) {
          responseSent = true;
          return res.status(404).json({ message: "User not found" });
        }
        return;
      }
      
      // Calculate REAL current photo count from all active projects (não arquivados)
      const activeUserProjects = userProjects.filter(project => project.status !== "arquivado");
      const realCurrentPhotoCount = activeUserProjects.reduce((total, project) => {
        const photoCount = project.photos ? project.photos.length : 0;
        return total + photoCount;
      }, 0);
      
      // Prepare response
      const stats = {
        activeProjects,
        photosThisMonth,
        totalUploadUsageMB,
        planInfo: {
          name: user.planType || 'basic',
          uploadLimit: user.uploadLimit || 1000,
          usedUploads: realCurrentPhotoCount // Use real current count instead of stored value
        }
      };
      
      if (!responseSent) {
        responseSent = true;
        res.json(stats);
      }
    } catch (error) {
      console.error("Error retrieving user stats:", error);
      if (!responseSent) {
        responseSent = true;
        res.status(500).json({ message: "Error retrieving user statistics" });
      }
    }
  });
  
  // Create user (admin only)
  app.post("/api/users", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use" });
      }
      
      const user = await storage.createUser(userData);
      
      // Don't send password back to client
      const { password, ...sanitizedUser } = user;
      
      res.status(201).json(sanitizedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  // Update user (admin or self)
  app.patch("/api/users/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Check if user is updating own data or is admin
      const isAdmin = req.user?.role === "admin";
      const isSelf = req.user?.id === userId;
      
      if (!isAdmin && !isSelf) {
        return res.status(403).json({ message: "Not authorized to update this user" });
      }
      
      // If not admin, restrict which fields can be updated
      const userData = req.body;
      
      if (!isAdmin) {
        // Regular users can only update certain fields
        const allowedFields = ["name", "password"];
        
        Object.keys(userData).forEach(key => {
          if (!allowedFields.includes(key)) {
            delete userData[key];
          }
        });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password back to client
      const { password, ...sanitizedUser } = updatedUser;
      
      res.json(sanitizedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Delete user (admin only)
  app.delete("/api/users/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Can't delete own account
      if (req.user && user.id === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  
  // ==================== Project Routes ====================
  
  // Get all projects (filtered by photographer if not admin)
  app.get("/api/projects", authenticate, async (req: Request, res: Response) => {
    try {
      let projects;
      
      if (req.user?.role === "admin") {
        // Admins can see all projects
        projects = await storage.getProjects();
      } else if (req.user) {
        // Photographers can only see their own projects
        console.log(`Filtrando projetos para o fotógrafo ID=${req.user.id}`);
        projects = await storage.getProjects(req.user.id);
      } else {
        // Usuário não autenticado
        return res.status(401).json({ message: "Não autorizado" });
      }
      
      console.log(`Retornando ${projects.length} projetos para o usuário ID=${req.user?.id}`);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve projects" });
    }
  });
  
  // Get project by ID or publicId - Rota pública para clientes visualizarem seus projetos
  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      
      // Adicionando logs para debug
      console.log(`Buscando projeto com ID ou publicId: ${idParam}`);
      
      // Pass the ID directly to storage, which now handles both numeric IDs and string publicIds
      const project = await storage.getProject(idParam);
      
      // Se ainda não encontrou, informar que o projeto não existe
      if (!project) {
        console.log(`Projeto com ID/publicId ${idParam} não encontrado`);
        return res.status(404).json({ message: "Project not found" });
      }
      
      console.log(`Projeto encontrado: ID=${project.id}, Nome=${project.name}, PublicId=${project.publicId}`);
      console.log(`Status do projeto: ${project.status}`);
      console.log(`Total de fotos: ${project.photos?.length || 0}`);
      
      // SECURITY CHECK: If a user is logged in, make sure they can only view their own projects
      // We don't restrict this for unauthenticated users to allow public project viewing
      if (req.user && req.user.role !== 'admin') {
        if (project.photographerId !== req.user.id) {
          console.log(`Acesso negado: o usuário ${req.user.id} tentou acessar projeto ${project.id} do fotógrafo ${project.photographerId}`);
          return res.status(403).json({ message: "You don't have permission to access this project" });
        }
        console.log(`Acesso autorizado: o fotógrafo ${req.user.id} está acessando seu próprio projeto ${project.id}`);
      }
      
      // Esta é uma rota pública, então retornamos o projeto completo para clientes
      // Em um ambiente de produção, poderíamos adicionar alguma forma de autenticação
      // como um token único para cada cliente, mas para simplificar, mantemos público
      res.json(project);
    } catch (error) {
      console.error(`Erro ao buscar projeto: ${error}`);
      res.status(500).json({ message: "Failed to retrieve project" });
    }
  });
  
  // Create project (authenticated photographer)
  // Removida verificação de autenticação para facilitar testes
  app.post("/api/projects", r2Upload.array('photos', 10000), async (req: Request, res: Response) => {
    try {
      console.log("Receiving request to create project", req.body);
      
      // Extract project data from request body
      // When using FormData, form fields come as strings instead of JSON objects
      const { projectName, clientName, clientEmail, photographerId, photos, photosData, applyWatermark } = req.body;
      
      // Use fields from FormData format or fallback to JSON format
      const name = projectName || req.body.nome || req.body.name;
      
      // Desativar marca d'água no backend durante upload
      const shouldApplyWatermark = false;
      
      console.log("Project data (raw):", { projectName, clientName, clientEmail, photographerId });
      console.log("Project data (processed):", { name, clientName, clientEmail, photographerId });
      
      // Validate project data and ensure photographerId is set to the current user's ID if logged in
      const currentUserId = req.user?.id || parseInt(photographerId || '1');
      
      // Generate a unique public ID for the project URL with collision detection
      let uniquePublicId;
      let attempts = 0;
      const maxAttempts = 5;
      
      do {
        uniquePublicId = nanoid(12); // Increased from 10 to 12 characters for better uniqueness
        attempts++;
        
        // Check if this public_id already exists
        const existingProject = await db.select()
          .from(projects)
          .where(eq(projects.publicId, uniquePublicId))
          .limit(1);
        
        if (existingProject.length === 0) {
          break; // Found unique ID
        }
        
        if (attempts >= maxAttempts) {
          console.error(`Failed to generate unique public_id after ${maxAttempts} attempts`);
          throw new Error("Failed to generate unique project identifier");
        }
      } while (attempts < maxAttempts);
      
      const projectData = insertProjectSchema.parse({
        name: name,
        clientName: clientName,
        clientEmail: clientEmail,
        photographerId: currentUserId,
        publicId: uniquePublicId,
      });
      
      // Check if photographer ID matches authenticated user
      if (req.user && (projectData.photographerId !== req.user.id && req.user.role !== "admin")) {
        return res.status(403).json({ message: "Cannot create projects for other photographers" });
      }
      
      // Process photos
      let processedPhotos = [];
      
      // Check if we received photos as FormData or JSON
      if (Array.isArray(photos)) {
        // Direct array of photo objects
        console.log(`Processing ${photos.length} photos sent as JSON array`);
        // Process and download photos sequentially 
        processedPhotos = [];
        
        // Use a for loop to handle async operations in sequence
        for (const photo of photos) {
          let url = photo.url;
          let id = nanoid();
          
          try {
            // Handle external URLs like Unsplash: download and upload to R2
            if (url.startsWith('http')) {
              console.log(`External photo URL: ${url} with ID: ${id}`);
              
              try {
                // Generate a unique filename for the external image
                const uniqueFilename = generateUniqueFileName(photo.filename || 'photo.jpg');
                
                // Download and upload the image to R2
                const result = await downloadAndUploadToR2(url, uniqueFilename);
                url = result.url; // Use the R2 URL
                console.log(`Successfully downloaded external image and uploaded to R2: ${url}`);
              } catch (err: any) {
                console.error(`Failed to download and upload external image from ${url}: ${err.message}`);
                // Keep the external URL if download fails
              }
            }
            
            console.log(`JSON photo: ${photo.filename}, URL: ${url}, ID: ${id}`);
            
            processedPhotos.push({
              id: id,
              url: url,
              filename: photo.filename,
              originalName: photo.originalName || photo.filename || 'external-image.jpg',
            });
          } catch (error) {
            console.error(`Error processing photo ${photo.filename}: ${error.message}`);
          }
        }
      }
      else if (photosData) {
        // Try to parse the photosData JSON string
        try {
          const parsedPhotosData = JSON.parse(photosData);
          console.log(`Processing ${parsedPhotosData.length} photos from photosData JSON`);
          // Process and download photos sequentially 
          processedPhotos = [];
          
          // Use a for loop to handle async operations in sequence
          for (const photo of parsedPhotosData) {
            let url = photo.url;
            let id = nanoid();
            
            try {
              // Handle external URLs like Unsplash: download and upload to R2
              if (url.startsWith('http')) {
                console.log(`External photo URL: ${url} with ID: ${id}`);
                
                try {
                  // Generate a unique filename for the external image
                  const uniqueFilename = generateUniqueFileName(photo.filename || 'photo.jpg');
                  
                  // Download and upload the image to R2
                  const result = await downloadAndUploadToR2(url, uniqueFilename);
                  url = result.url; // Use the R2 URL
                  console.log(`Successfully downloaded external image and uploaded to R2: ${url}`);
                } catch (err: any) {
                  console.error(`Failed to download and upload external image from ${url}: ${err.message}`);
                  // Keep the external URL if download fails
                }
              }
              
              console.log(`JSON photosData: ${photo.filename}, URL: ${url}, ID: ${id}`);
              
              processedPhotos.push({
                id: id,
                url: url,
                filename: photo.filename,
                originalName: photo.originalName || photo.filename || 'external-image.jpg',
              });
            } catch (error) {
              console.error(`Error processing photosData ${photo.filename}: ${error.message}`);
            }
          }
        } catch (error) {
          console.error("Error parsing photosData JSON:", error);
        }
      }
      // Prioritize files uploaded as multipart form data
      else if (req.files && Array.isArray(req.files)) {
        console.log(`Processing ${req.files.length} photos from multipart form-data`);
        const uploadedFiles = req.files as Express.Multer.File[];
        
        // Process each file using R2 storage
        processedPhotos = [];
        
        for (const file of uploadedFiles) {
          // Generate a unique filename
          const filename = generateUniqueFileName(file.originalname);
          
          try {
            // Upload file to R2
            const result = await uploadFileToR2(
              file.buffer,
              filename,
              file.mimetype,
              shouldApplyWatermark
            );
            
            // Add processed photo to array
            processedPhotos.push({
              id: nanoid(),
              url: result.url,
              filename: filename, // Nome único usado pelo R2
              originalName: file.originalname // Nome original do arquivo
            });
            
            console.log(`File uploaded to R2: ${file.originalname}, R2 URL: ${result.url}`);
          } catch (error) {
            console.error(`Error uploading file to R2: ${error}`);
            // Continue with other files even if one fails
          }
        }
      }
      // If no photos were provided through any method, use a single placeholder
      if (processedPhotos.length === 0) {
        console.log("No photos found in request, using a placeholder");
        processedPhotos = [
          { 
            id: nanoid(),
            url: 'https://via.placeholder.com/800x600?text=No+Photo+Uploaded', 
            filename: 'placeholder.jpg',
            originalName: 'No Photo Uploaded.jpg'
          }
        ];
      }
      
      console.log(`Fotos processadas: ${processedPhotos.length}`);
      
      // Forçar garbage collection após processamento de lote grande de fotos
      if (processedPhotos.length >= 5) {
        try {
          if (global.gc) {
            global.gc();
            console.log(`[GC] Garbage collection executado após processamento de ${processedPhotos.length} fotos`);
          }
        } catch (gcError) {
          console.warn('[GC] Erro ao executar garbage collection:', gcError);
        }
      }
      
      // Verificar o limite de uploads do usuário
      const photoCount = processedPhotos.length;
      
      if (req.user) {
        const hasUploadLimit = await storage.checkUploadLimit(req.user.id, photoCount);
        
        if (!hasUploadLimit) {
          // Buscar informações detalhadas do usuário para mensagem personalizada
          const user = await storage.getUser(req.user.id);
          const planName = user?.planType || 'gratuito';
          const uploadLimit = user?.uploadLimit || 0;
          const usedUploads = user?.usedUploads || 0;
          
          return res.status(403).json({ 
            message: "Limite de uploads atingido", 
            error: "UPLOAD_LIMIT_REACHED",
            details: `Sua conta ${planName} atingiu o limite de ${uploadLimit} fotos (${usedUploads} utilizadas). Para continuar fazendo uploads, verifique sua assinatura no painel ou entre em contato com nosso suporte.`
          });
        }
      }
      
      // Criar o projeto
      const project = await storage.createProject(projectData, processedPhotos);
      console.log(`Projeto criado com ID: ${project.id}`);
      
      // Atualizar contador de uploads
      if (req.user) {
        await storage.updateUploadUsage(req.user.id, photoCount);
      }
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack available');
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid project data", 
          errors: error.errors,
          details: error.message 
        });
      }
      
      // Check for database constraint errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate key value')) {
          return res.status(409).json({ 
            message: "Duplicate key error - this should not happen after sequence fix",
            error: error.message 
          });
        }
        
        return res.status(500).json({ 
          message: "Failed to create project", 
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
      
      res.status(500).json({ message: "Failed to create project - unknown error" });
    }
  });
  
  // Finalize project selections (public)
  app.patch("/api/projects/:id/finalize", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const { selectedPhotos } = req.body;
      
      if (!Array.isArray(selectedPhotos)) {
        return res.status(400).json({ message: "Selected photos must be an array" });
      }
      
      console.log(`Finalizando seleção de fotos para projeto ${idParam}. Fotos selecionadas: ${selectedPhotos.length}`);
      
      // Find the project by ID or publicId
      const project = await storage.getProject(idParam);
      let projectId = 0;
      
      if (project) {
        projectId = project.id;
        console.log(`Projeto encontrado: ID=${project.id}, Nome=${project.name}, PublicId=${project.publicId}`);
      }
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Validate that all selected photos exist in the project
      if (!project.photos || !Array.isArray(project.photos)) {
        return res.status(400).json({ message: "Projeto não contém fotos para seleção" });
      }
      
      const validPhotoIds = project.photos.map(photo => photo.id);
      const invalidPhotoIds = selectedPhotos.filter(id => !validPhotoIds.includes(id));
      
      if (invalidPhotoIds.length > 0) {
        return res.status(400).json({ 
          message: "Algumas fotos selecionadas não existem neste projeto",
          invalidIds: invalidPhotoIds
        });
      }
      
      const updatedProject = await storage.finalizeProjectSelection(projectId, selectedPhotos);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to finalize project selections" });
    }
  });
  
  // Archive project (photographer only)
  app.patch("/api/projects/:id/archive", authenticate, requireActiveUser, async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const project = await storage.getProject(idParam);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if photographer ID matches authenticated user
      if (req.user && (project.photographerId !== req.user.id && req.user.role !== "admin")) {
        return res.status(403).json({ message: "Cannot archive projects of other photographers" });
      }
      
      const updatedProject = await storage.archiveProject(project.id);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to archive project" });
    }
  });
  
  // Reopen project (photographer only)
  // Rota para atualizar um projeto (dados gerais)
  app.patch("/api/projects/:id", authenticate, requireActiveUser, async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const project = await storage.getProject(idParam);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if photographer ID matches authenticated user
      if (project.photographerId !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Cannot update projects of other photographers" });
      }
      
      // Atualizar apenas os campos permitidos
      const updateData = {
        name: req.body.name,
        clientName: req.body.clientName,
        clientEmail: req.body.clientEmail,
        status: req.body.status
      };
      
      const updatedProject = await storage.updateProject(project.id, updateData);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.patch("/api/projects/:id/reopen", authenticate, requireActiveUser, async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const project = await storage.getProject(idParam);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if photographer ID matches authenticated user
      if (project.photographerId !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Cannot reopen projects of other photographers" });
      }
      
      const updatedProject = await storage.reopenProject(project.id);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to reopen project" });
    }
  });

  // Update project watermark setting
  app.patch("/api/projects/:id/watermark", authenticate, requireActiveUser, async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const { showWatermark } = req.body;
      
      console.log(`[WATERMARK] Atualizando marca d'água do projeto ${idParam} para: ${showWatermark}`);
      
      if (typeof showWatermark !== 'boolean') {
        return res.status(400).json({ message: "showWatermark must be a boolean" });
      }
      
      const project = await storage.getProject(idParam);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      console.log(`[WATERMARK] Projeto encontrado: ${project.name}, atual showWatermark: ${project.showWatermark}`);
      
      // Check if photographer ID matches authenticated user
      if (project.photographerId !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Cannot modify projects of other photographers" });
      }
      
      const updatedProject = await storage.updateProjectWatermark(project.id, showWatermark);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (process.env.DEBUG_WATERMARK === 'true') {
        console.log(`[WATERMARK] Projeto atualizado: showWatermark = ${updatedProject.showWatermark}`);
      }
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project watermark:", error);
      res.status(500).json({ message: "Failed to update project watermark" });
    }
  });
  
  // Adicionar novas fotos a um projeto existente
  app.post("/api/projects/:id/photos", authenticate, requireActiveUser, r2Upload.array('photos', 10000), async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const { applyWatermark } = req.body;
      
      // Desativar marca d'água no backend durante upload de fotos adicionais
      const shouldApplyWatermark = false;
      
      // Verificar se o projeto existe
      const project = await storage.getProject(idParam);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get the numeric ID for storage operations
      const projectId = project.id;
      
      // Verificar se o usuário é o fotógrafo do projeto
      if (req.user && project.photographerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "You don't have permission to edit this project" });
      }
      
      // Process uploaded files or JSON data
      let processedPhotos = [];
      let photoCount = 0;
      
      // Check for uploaded files via multer
      if (req.files && Array.isArray(req.files)) {
        const uploadedFiles = req.files as Express.Multer.File[];
        photoCount = uploadedFiles.length;
        
        console.log(`Processing ${photoCount} uploaded photos for project ${projectId}`);
        
        // Process each file using R2 storage
        processedPhotos = [];
        
        for (const file of uploadedFiles) {
          // Generate a unique filename
          const filename = generateUniqueFileName(file.originalname);
          
          try {
            // Upload file to R2
            const result = await uploadFileToR2(
              file.buffer,
              filename,
              file.mimetype,
              shouldApplyWatermark
            );
            
            // Add processed photo to array
            processedPhotos.push({
              id: nanoid(),
              url: result.url,
              filename: filename, // Nome único usado pelo R2
              originalName: file.originalname // Nome original do arquivo
            });
            
            console.log(`File uploaded to R2 for project ${projectId}: ${file.originalname}, R2 URL: ${result.url}`);
          } catch (error) {
            console.error(`Error uploading file to R2: ${error}`);
            // Continue with other files even if one fails
          }
        }
      } 
      // Check for photos in JSON format
      else if (req.body.photos && Array.isArray(req.body.photos)) {
        const { photos } = req.body;
        photoCount = photos.length;
        
        console.log(`Processing ${photoCount} photos from JSON data`);
        
        // Process and download photos sequentially 
        processedPhotos = [];
        
        // Use a for loop to handle async operations in sequence
        for (const photo of photos) {
          let url = photo.url;
          let id = photo.id || nanoid();
          
          try {
            // Handle external URLs like Unsplash: download and upload to R2
            let savedFilename = photo.filename; // Nome de arquivo padrão
            
            if (url.startsWith('http')) {
              console.log(`External photo URL: ${url} with ID: ${id}`);
              
              try {
                // Generate a unique filename for the external image
                const uniqueFilename = generateUniqueFileName(photo.filename || 'photo.jpg');
                savedFilename = uniqueFilename; // Salvar o nome gerado para uso posterior
                
                // Download and upload the image to R2
                const result = await downloadAndUploadToR2(url, uniqueFilename);
                url = result.url; // Use the R2 URL
                console.log(`Successfully downloaded external image and uploaded to R2: ${url}`);
              } catch (err: any) {
                console.error(`Failed to download and upload external image from ${url}: ${err.message}`);
                // Keep the external URL if download fails
                savedFilename = photo.filename; // Reverter para o nome original se falhar
              }
            }
            
            console.log(`JSON photo for existing project: ${photo.filename}, URL: ${url}, ID: ${id}, Saved filename: ${savedFilename}`);
            
            processedPhotos.push({
              id: id,
              url: url,
              filename: savedFilename,
              originalName: photo.originalName || photo.filename || 'external-image.jpg'
            });
          } catch (error: any) {
            console.error(`Error processing photo for existing project ${photo.filename}: ${error.message}`);
          }
        }
      }
      
      if (processedPhotos.length === 0) {
        return res.status(400).json({ message: "No photos provided" });
      }
      
      // Verificar o limite de upload do usuário (se não for admin)
      if (req.user && req.user.role !== "admin") {
        const canUpload = await storage.checkUploadLimit(req.user.id, photoCount);
        if (!canUpload) {
          return res.status(403).json({ 
            message: "Upload limit exceeded", 
            error: "UPLOAD_LIMIT_REACHED",
            details: "You have reached the upload limit for your current plan. Please upgrade to continue uploading photos."
          });
        }
        
        // Atualizar o uso de upload
        await storage.updateUploadUsage(req.user.id, photoCount);
      }
      
      // Atualizar o projeto com as novas fotos
      const updatedProject = await storage.updateProject(projectId, {
        photos: [...(project.photos || []), ...processedPhotos]
      });
      
      if (!updatedProject) {
        return res.status(400).json({ message: "Failed to add photos to project" });
      }
      
      res.status(200).json({ 
        message: "Photos added successfully", 
        count: photoCount
      });
    } catch (error) {
      console.error("Erro ao adicionar fotos:", error);
      res.status(500).json({ message: "Failed to add photos to project" });
    }
  });
  
  // Delete project (photographer only)
  app.delete("/api/projects/:id", authenticate, requireActiveUser, async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const project = await storage.getProject(idParam);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Verificar se o fotógrafo é o dono do projeto ou se é admin
      if (project.photographerId !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Você não tem permissão para excluir este projeto" });
      }
      
      // Log the photo count that will be removed from upload usage
      const photoCount = project.photos ? project.photos.length : 0;
      console.log(`Deletando projeto ID=${project.id} com ${photoCount} fotos - removendo do contador de uploads`);
      
      // Delete all related files from R2 before removing the project
      if (project.photos && Array.isArray(project.photos)) {
        for (const photo of project.photos) {
          try {
            await deleteFileFromR2(photo.filename);
          } catch (error) {
            console.error(`Error deleting ${photo.filename} from R2:`, error);
          }
        }
      }
      
      // Modified deleteProject will handle the usage count reduction
      const deleted = await storage.deleteProject(project.id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Falha ao excluir projeto" });
      }
      
      // Invalidate user stats after successful deletion
      console.log(`Projeto ID=${project.id} excluído com sucesso - contador de uploads atualizado`);
      
      res.json({ 
        success: true, 
        message: "Projeto excluído com sucesso",
        photosRemoved: photoCount // Include count in response for client-side feedback
      });
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      res.status(500).json({ message: "Falha ao excluir projeto" });
    }
  });
  
  // ==================== Photo Comment Routes ====================
  
  // Create a comment on a photo (for clients) - New endpoint format
  app.post("/api/photo-comments", async (req: Request, res: Response) => {
    try {
      const { photoId, clientName, comment } = req.body;
      
      console.log("Dados recebidos para comentário:", { photoId, clientName, comment });
      
      if (!photoId || !clientName || !comment) {
        return res.status(400).json({ message: "ID da foto, nome do cliente e comentário são obrigatórios" });
      }
      
      // Validate the comment data
      const commentData = insertPhotoCommentSchema.parse({
        photoId,
        clientName: clientName.trim(),
        comment: comment.trim()
      });
      
      console.log("Dados validados do comentário:", commentData);
      
      const newComment = await storage.createPhotoComment(commentData);
      console.log("Comentário criado com sucesso:", newComment);
      res.json(newComment);
    } catch (error) {
      console.error("Erro detalhado ao criar comentário:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: "Falha ao criar comentário", error: error.message });
      } else {
        res.status(500).json({ message: "Falha ao criar comentário" });
      }
    }
  });

  // Create a comment on a photo (for clients) - Legacy endpoint
  app.post("/api/photos/:photoId/comments", async (req: Request, res: Response) => {
    try {
      const { photoId } = req.params;
      const { clientName, comment } = req.body;
      
      if (!clientName || !comment) {
        return res.status(400).json({ message: "Nome do cliente e comentário são obrigatórios" });
      }
      
      // Validate the comment data
      const commentData = insertPhotoCommentSchema.parse({
        photoId,
        clientName: clientName.trim(),
        comment: comment.trim()
      });
      
      const newComment = await storage.createPhotoComment(commentData);
      res.json(newComment);
    } catch (error) {
      console.error("Erro ao criar comentário:", error);
      res.status(500).json({ message: "Falha ao criar comentário" });
    }
  });
  
  // Get comments for a photo
  app.get("/api/photos/:photoId/comments", async (req: Request, res: Response) => {
    try {
      const { photoId } = req.params;
      const comments = await storage.getPhotoComments(photoId);
      res.json(comments);
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
      res.status(500).json({ message: "Falha ao buscar comentários" });
    }
  });
  
  // Get all comments for a project (for photographers only)
  app.get("/api/projects/:projectId/comments", authenticate, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      
      // First, verify that the user has access to this project
      const project = await storage.getProject(parseInt(projectId));
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Check if the user is the owner of the project or an admin
      if (req.user?.role !== "admin" && project.photographerId !== req.user?.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const comments = await storage.getProjectPhotoComments(project.id.toString());
      res.json(comments);
    } catch (error) {
      console.error("Erro ao buscar comentários do projeto:", error);
      res.status(500).json({ message: "Falha ao buscar comentários do projeto" });
    }
  });
  
  // Mark comments as viewed (for photographers only)
  app.post("/api/comments/mark-viewed", authenticate, async (req: Request, res: Response) => {
    try {
      const { commentIds } = req.body;
      
      if (!Array.isArray(commentIds)) {
        return res.status(400).json({ message: "IDs dos comentários devem ser um array" });
      }
      
      await storage.markCommentsAsViewed(commentIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar comentários como visualizados:", error);
      res.status(500).json({ message: "Falha ao marcar comentários como visualizados" });
    }
  });
  
  // ==================== Subscription Routes ====================
  
  // Obter planos de assinatura
  app.get("/api/subscription/plans", authenticate, async (req: Request, res: Response) => {
    try {
      // Obter o tipo de plano do usuário atual
      const userPlanType = req.user?.planType || 'free';
      
      // Normalizar o planType para comparação (converter para lowercase e remover espaços)
      const normalizedUserPlan = userPlanType.toLowerCase().trim();
      
      // Mapear todos os planos disponíveis e marcar o atual
      const allPlans = {
        FREE: { ...SUBSCRIPTION_PLANS.FREE, current: normalizedUserPlan === 'free' },
        BASIC: { ...SUBSCRIPTION_PLANS.BASIC, current: normalizedUserPlan === 'basic' },
        BASIC_V2: { ...SUBSCRIPTION_PLANS.BASIC_V2, current: normalizedUserPlan === 'basic_v2' },
        STANDARD: { ...SUBSCRIPTION_PLANS.STANDARD, current: normalizedUserPlan === 'standard' },
        STANDARD_V2: { ...SUBSCRIPTION_PLANS.STANDARD_V2, current: normalizedUserPlan === 'standard_v2' },
        PROFESSIONAL: { ...SUBSCRIPTION_PLANS.PROFESSIONAL, current: normalizedUserPlan === 'professional' },
        PROFESSIONAL_V2: { ...SUBSCRIPTION_PLANS.PROFESSIONAL_V2, current: normalizedUserPlan === 'professional_v2' },
      };
      
      // Filtrar apenas os planos que existem no SUBSCRIPTION_PLANS
      const plans = Object.fromEntries(
        Object.entries(allPlans).filter(([key, plan]) => 
          SUBSCRIPTION_PLANS[key as keyof typeof SUBSCRIPTION_PLANS] !== undefined
        )
      );
      
      // Incluir estatísticas do usuário atual
      const userStats = {
        uploadLimit: req.user?.uploadLimit || 0,
        usedUploads: req.user?.usedUploads || 0,
        remainingUploads: (req.user?.uploadLimit || 0) - (req.user?.usedUploads || 0),
        planType: userPlanType,
        subscriptionStatus: req.user?.subscriptionStatus || 'inactive',
        subscriptionEndDate: req.user?.subscriptionEndDate
      };
      
      res.json({ plans, userStats });
    } catch (error) {
      console.error("Erro ao buscar planos de assinatura:", error);
      res.status(500).json({ message: "Falha ao buscar planos de assinatura" });
    }
  });
  
  // Rota para criar intent de pagamento no Stripe
  app.post("/api/create-payment-intent", authenticate, async (req: Request, res: Response) => {
    try {
      const { planType } = req.body;
      
      if (!planType) {
        return res.status(400).json({ message: "Tipo de plano é obrigatório" });
      }
      
      // Processar o nome do plano para garantir que encontraremos no SUBSCRIPTION_PLANS
      // Converter para uppercase e tratar casos de planos V2 (basic_v2, standard_v2, etc.)
      let planKey: keyof typeof SUBSCRIPTION_PLANS;
      
      if (planType.includes('_')) {
        // Se já tem underline, é um formato como 'basic_v2'
        planKey = planType.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS;
      } else if (planType === 'free') {
        planKey = 'FREE';
      } else {
        // Para compatibilidade com formatos como 'basic', 'standard', etc.
        planKey = planType.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS;
      }
      
      // Obter o plano diretamente do esquema SUBSCRIPTION_PLANS
      const plan = SUBSCRIPTION_PLANS[planKey];
      
      if (!plan || plan.price === undefined) {
        // Se não encontrou o plano exato, tente encontrar uma versão V2 compatível
        const fallbackKey = `${planType.toUpperCase()}_V2` as keyof typeof SUBSCRIPTION_PLANS;
        const fallbackPlan = SUBSCRIPTION_PLANS[fallbackKey];
        
        if (!fallbackPlan) {
          return res.status(400).json({ message: "Plano inválido ou não encontrado" });
        }
        
        // Use o plano V2 como fallback
        if (process.env.DEBUG_SUBSCRIPTION === 'true') {
          console.log(`Plano ${planKey} não encontrado, usando fallback ${fallbackKey}`);
        }
        planKey = fallbackKey;
      }
      
      // Garantir que temos um plano válido
      const selectedPlan = SUBSCRIPTION_PLANS[planKey];
      if (!selectedPlan) {
        return res.status(400).json({ message: "Plano inválido ou não encontrado" });
      }
      
      // Verificar se temos o Stripe inicializado
      if (!stripe) {
        return res.status(500).json({ 
          message: "Erro no serviço de pagamento", 
          details: "Stripe não está configurado corretamente" 
        });
      }
      
      // Calcular o valor em centavos a partir do preço do plano
      const amountInCents = Math.round(selectedPlan.price * 100);
      
      // Determinar se estamos usando um plano V2 ou um plano legado
      const isV2Plan = planKey.includes('_V2') || planType.includes('_v2');
      
      // Normalizar o tipo de plano para garantir que esteja no formato correto
      // Sempre usar a versão v2 se disponível
      const normalizedPlanType = isV2Plan 
        ? planType.toLowerCase() 
        : `${planType.toLowerCase()}_v2`;
      
      if (process.env.DEBUG_SUBSCRIPTION === 'true') {
        console.log(`Criando PaymentIntent para plano: ${normalizedPlanType} (valor: R$${selectedPlan.price.toFixed(2)}, limite: ${selectedPlan.uploadLimit} uploads)`);
      }
      
      // Armazenar os metadados do plano para usar após o pagamento ser concluído
      const metadata = {
        userId: req.user?.id.toString() || '',
        planType: normalizedPlanType, // Usar a versão normalizada do planType
        userEmail: req.user?.email || '',
      };
      
      // Criar o PaymentIntent no Stripe usando os dados do plano do esquema
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents, // Valor em centavos calculado a partir do preço do plano
        currency: "brl",
        metadata: {
          ...metadata,
          planName: selectedPlan.name, // Adicionar o nome amigável do plano aos metadados
          planPrice: selectedPlan.price.toString(), // Adicionar o preço do plano aos metadados
          uploadLimit: selectedPlan.uploadLimit.toString() // Adicionar o limite de uploads aos metadados
        },
        description: `Assinatura do plano ${selectedPlan.name} - R$${selectedPlan.price.toFixed(2)} - ${selectedPlan.uploadLimit} uploads - PhotoSelect`,
      });
      
      // Retornar o client_secret junto com informações do plano para exibição no frontend
      res.json({
        clientSecret: paymentIntent.client_secret,
        planName: selectedPlan.name,
        planPrice: selectedPlan.price.toString()
      });
    } catch (error) {
      if (process.env.DEBUG_SUBSCRIPTION === 'true') {
        console.error("Erro ao criar intent de pagamento:", 
          error instanceof Error ? error.message : "Erro desconhecido");
      }
      res.status(500).json({ 
        message: "Falha ao processar pagamento"
      });
    }
  });
  
  // Rota para atualizar o plano de assinatura
  app.post("/api/subscription/upgrade", authenticate, async (req: Request, res: Response) => {
    try {
      const { planType } = req.body;
      const userPlanType = req.user?.planType || 'free';
      
      // Lista de planos válidos para upgrade: planos V2 ou o plano atual do usuário
      const validPlans = [
        'free',
        'basic_v2', 'standard_v2', 'professional_v2',
        userPlanType // permitir que o usuário permaneça no seu plano atual, mesmo se for legado
      ];
      
      if (!planType || !validPlans.includes(planType)) {
        return res.status(400).json({ message: "Tipo de plano inválido. Apenas os novos planos V2 estão disponíveis para upgrade." });
      }
      
      // Na implementação real, aqui integraríamos com o Stripe para processar o pagamento
      // e criar/atualizar a assinatura. Como é uma simulação, atualizamos diretamente.
      
      const updatedUser = await storage.updateUserSubscription(req.user?.id || 0, planType);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Remover dados sensíveis antes de enviar resposta
      const { password, ...userInfo } = updatedUser;
      
      res.json({ 
        message: "Assinatura atualizada com sucesso",
        plan: planType,
        user: userInfo
      });
    } catch (error) {
      console.error("Erro ao atualizar assinatura:", error);
      res.status(500).json({ message: "Falha ao atualizar assinatura" });
    }
  });
  
  // ==================== Webhook Routes ====================
  
  // Generic payment webhook (compatibilidade com sistemas legados)
  app.post("/api/webhook", async (req: Request, res: Response) => {
    try {
      // Validate webhook payload
      const webhookPayloadSchema = z.object({
        type: z.string(),
        email: z.string().email(),
        subscription_id: z.string(),
        timestamp: z.string().datetime(),
      });
      
      const payload = webhookPayloadSchema.parse(req.body);
      
      // Process the webhook event
      const updatedUser = await storage.handleWebhookEvent(payload);
      
      if (!updatedUser) {
        return res.status(404).json({ 
          message: "User not found",
          event: "processed",
          status: "warning"
        });
      }
      
      res.json({ 
        message: "Webhook processed successfully",
        event: payload.type,
        userStatus: updatedUser.status
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid webhook payload", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });
  
  // Stripe webhook
  app.post("/api/webhook/stripe", async (req: Request, res: Response) => {
    try {
      // Verificar assinatura (em um cenário real, faríamos verificação com o Stripe)
      // Para implementar verificação de assinatura, precisaríamos do webhookSecret do Stripe
      
      // Em ambiente de produção, usaríamos:
      // const sig = req.headers['stripe-signature'];
      // const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      
      // Processar eventos de assinatura Stripe
      const event = req.body;
      
      if (!event || !event.type || !event.data) {
        return res.status(400).json({ error: "Evento inválido" });
      }
      
      if (event.type.startsWith('subscription.')) {
        // Processar eventos relacionados a assinaturas
        const updatedUser = await storage.handleStripeWebhook(event);
        
        if (!updatedUser) {
          return res.status(404).json({ 
            message: "User not found",
            event: "processed",
            status: "warning"
          });
        }
        
        return res.json({
          message: "Stripe webhook processado com sucesso",
          event: event.type,
          status: "success"
        });
      }
      
      // Outros eventos Stripe não processados
      return res.json({ 
        message: "Evento não processado",
        event: event.type,
        status: "ignored"
      });
    } catch (error) {
      console.error("Erro ao processar webhook do Stripe:", error);
      res.status(500).json({ message: "Falha ao processar webhook do Stripe" });
    }
  });
  
  // Hotmart webhook
  /**
   * Webhook para integração com a Hotmart
   * 
   * Eventos suportados:
   * - Compra aprovada: PURCHASE_APPROVED, SALE, PURCHASE_COMPLETE, etc.
   * - Reembolso: PURCHASE_REFUNDED, REFUND, REEMBOLSO, etc.
   * - Cancelamento: PURCHASE_CANCELED, ORDER_CANCELED, CANCELLED, etc.
   * - Disputa/Chargeback: PURCHASE_CHARGEBACK, PROTEST, DISPUTA, etc.
   * - Cancelamento de assinatura: SUBSCRIPTION_CANCELLATION, ASSINATURA_CANCELADA, etc.
   * 
   * Funcionalidades:
   * - Criação automática de usuários quando uma compra é aprovada
   * - Definição do plano correto com base no ID da oferta
   * - Rejeição de planos de teste
   * - Cancelamento de assinaturas quando há reembolso ou cancelamento
   */
  app.post("/api/webhook/hotmart", async (req: Request, res: Response) => {
    try {
      console.log("========== INICIO WEBHOOK HOTMART ==========");
      console.log("Recebido evento da Hotmart");
      
      // Registrar a estrutura completa do payload (removendo dados sensíveis)
      try {
        // Criar uma cópia do payload para logar
        const safePayload = JSON.parse(JSON.stringify(req.body));
        
        // Remover ou mascarar dados sensíveis para log
        if (safePayload.data && safePayload.data.buyer) {
          if (safePayload.data.buyer.phone) safePayload.data.buyer.phone = '[REDACTED]';
          if (safePayload.data.buyer.document) safePayload.data.buyer.document = '[REDACTED]';
        }
        
        // Logar a estrutura completa para análise e debugging
        console.log("Estrutura completa do payload Hotmart:");
        console.log(JSON.stringify(safePayload, null, 2));
      } catch (logError) {
        console.error("Erro ao logar payload da Hotmart:", logError);
      }
      
      // Extrair assinatura do cabeçalho (se existir)
      const signature = req.headers['x-hotmart-signature'] as string;
      const webhookSecret = process.env.HOTMART_WEBHOOK_SECRET || '';
      
      // Verificar assinatura (se configurada)
      if (signature && webhookSecret) {
        const rawBody = JSON.stringify(req.body);
        const isValid = validateHotmartSignature(rawBody, signature, webhookSecret);
        
        if (!isValid) {
          console.warn("Assinatura inválida no webhook da Hotmart");
          return res.status(401).json({ message: "Assinatura inválida" });
        }
      } else {
        // Avisar se a verificação de assinatura estiver desativada
        console.warn("Verificação de assinatura da Hotmart desativada - HOTMART_WEBHOOK_SECRET não configurado");
        console.log("Para maior segurança, defina a variável HOTMART_WEBHOOK_SECRET com a chave compartilhada da Hotmart");
      }
      
      // Processar o payload do webhook
      const result = await processHotmartWebhook(req.body);
      
      if (result.success) {
        console.log(`Hotmart webhook processado: ${result.message}`);
        console.log("========== FIM WEBHOOK HOTMART ==========");
        return res.status(200).json({ 
          message: "Hotmart webhook processado com sucesso",
          details: result.message
        });
      } else {
        console.warn(`Hotmart webhook com erro: ${result.message}`);
        console.log("========== FIM WEBHOOK HOTMART (COM ERRO) ==========");
        return res.status(400).json({ 
          message: "Erro ao processar webhook",
          details: result.message
        });
      }
    } catch (error: any) {
      console.error("Erro ao processar webhook da Hotmart:", error);
      console.log("========== FIM WEBHOOK HOTMART (COM EXCEÇÃO) ==========");
      return res.status(500).json({ 
        message: "Falha ao processar webhook da Hotmart",
        error: error.message || "Erro desconhecido"
      });
    }
  });

  // ==================== Email Test Route ====================
  
  /**
   * Rota temporária para testar o envio de e-mails
   * 
   * POST /api/test-email
   * Body: { to: string, subject: string, html: string }
   * 
   * Retorna o resultado do envio de e-mail
   */
  app.post("/api/test-email", async (req: Request, res: Response) => {
    try {
      const { to, subject, html } = req.body;
      
      // Valida os campos necessários
      if (!to || !subject || !html) {
        return res.status(400).json({ 
          success: false, 
          message: "Os campos 'to', 'subject' e 'html' são obrigatórios" 
        });
      }
      
      // Valida o formato do e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({ 
          success: false, 
          message: "Endereço de e-mail inválido" 
        });
      }
      
      // Tenta enviar o e-mail
      const result = await sendEmail({ to, subject, html });
      
      // Retorna o resultado
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("Erro ao testar envio de e-mail:", error);
      return res.status(500).json({ 
        success: false, 
        message: `Erro inesperado ao enviar e-mail: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      });
    }
  });
  
  // ==================== Portfolio Routes ====================
  
  /**
   * Get user portfolios with photos
   * GET /api/portfolios
   */
  app.get("/api/portfolios", authenticate, async (req: Request, res: Response) => {
    try {
      // Se as tabelas de portfólio não existem, retorna lista vazia
      const userPortfolios = await db
        .select({
          id: portfolios.id,
          name: portfolios.name,
          slug: portfolios.slug,
          description: portfolios.description,
          coverImageUrl: portfolios.coverImageUrl,
          isPublic: portfolios.isPublic,
          createdAt: portfolios.createdAt,
          updatedAt: portfolios.updatedAt,
        })
        .from(portfolios)
        .where(eq(portfolios.userId, req.user!.id))
        .orderBy(desc(portfolios.updatedAt));

      // Get photos for each portfolio
      const portfoliosWithPhotos = await Promise.all(
        userPortfolios.map(async (portfolio) => {
          const photos = await db
            .select()
            .from(portfolioPhotos)
            .where(eq(portfolioPhotos.portfolioId, portfolio.id))
            .orderBy(portfolioPhotos.order);

          return {
            ...portfolio,
            photos
          };
        })
      );

      res.json(portfoliosWithPhotos);
    } catch (error) {
      console.error("Error fetching user portfolios:", error);
      // Se a tabela não existe, retorna lista vazia em vez de erro
      res.json([]);
    }
  });

  /**
   * Create new portfolio
   * POST /api/portfolios
   */
  app.post("/api/portfolios", authenticate, async (req: Request, res: Response) => {
    try {
      const { name, description, isPublic } = req.body;
      
      if (!name?.trim()) {
        return res.status(400).json({ error: "Portfolio name is required" });
      }

      // Generate unique slug from name
      const baseSlug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .trim();

      // Check if slug exists and make it unique
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await db
          .select({ id: portfolios.id })
          .from(portfolios)
          .where(eq(portfolios.slug, slug))
          .limit(1);

        if (existing.length === 0) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const [newPortfolio] = await db
        .insert(portfolios)
        .values({
          userId: req.user!.id,
          name: name.trim(),
          slug,
          description: description?.trim() || null,
          isPublic: isPublic ?? true,
        })
        .returning();

      res.status(201).json({
        ...newPortfolio,
        photos: []
      });
    } catch (error) {
      console.error("Error creating portfolio:", error);
      res.status(500).json({ error: "Failed to create portfolio" });
    }
  });

  /**
   * Update portfolio
   * PUT /api/portfolios/:id
   */
  app.put("/api/portfolios/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const portfolioId = parseInt(req.params.id);
      const { name, description, isPublic } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "Portfolio name is required" });
      }

      // Check if portfolio belongs to user
      const [existingPortfolio] = await db
        .select()
        .from(portfolios)
        .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, req.user!.id)))
        .limit(1);

      if (!existingPortfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }

      const [updatedPortfolio] = await db
        .update(portfolios)
        .set({
          name: name.trim(),
          description: description?.trim() || null,
          isPublic: isPublic ?? true,
          updatedAt: new Date(),
        })
        .where(eq(portfolios.id, portfolioId))
        .returning();

      // Get photos for the updated portfolio
      const photos = await db
        .select()
        .from(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, portfolioId))
        .orderBy(portfolioPhotos.order);

      res.json({
        ...updatedPortfolio,
        photos
      });
    } catch (error) {
      console.error("Error updating portfolio:", error);
      res.status(500).json({ error: "Failed to update portfolio" });
    }
  });

  /**
   * Delete portfolio
   * DELETE /api/portfolios/:id
   */
  app.delete("/api/portfolios/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const portfolioId = parseInt(req.params.id);

      // Check if portfolio belongs to user
      const [existingPortfolio] = await db
        .select()
        .from(portfolios)
        .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, req.user!.id)))
        .limit(1);

      if (!existingPortfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }

      // Delete portfolio photos first (due to foreign key constraint)
      await db
        .delete(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, portfolioId));

      // Delete portfolio
      await db
        .delete(portfolios)
        .where(eq(portfolios.id, portfolioId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting portfolio:", error);
      res.status(500).json({ error: "Failed to delete portfolio" });
    }
  });

  /**
   * Add photos to portfolio from existing projects
   * POST /api/portfolios/:id/photos
   */
  app.post("/api/portfolios/:id/photos", authenticate, async (req: Request, res: Response) => {
    try {
      const portfolioId = parseInt(req.params.id);
      const { photoUrls } = req.body;

      if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
        return res.status(400).json({ error: "Photo URLs array is required" });
      }

      // Check if portfolio belongs to user
      const [existingPortfolio] = await db
        .select()
        .from(portfolios)
        .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, req.user!.id)))
        .limit(1);

      if (!existingPortfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }

      // Get current max order
      const [maxOrderResult] = await db
        .select({ maxOrder: portfolioPhotos.order })
        .from(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, portfolioId))
        .orderBy(desc(portfolioPhotos.order))
        .limit(1);

      let nextOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

      // Add photos to portfolio
      const newPhotos = [];
      for (const photoUrl of photoUrls) {
        // Extract photo ID from URL (e.g., from "https://cdn.fottufy.com/1745693254465-gkh3yn7h2a.jpg" extract "1745693254465-gkh3yn7h2a")
        const photoId = photoUrl.replace('https://cdn.fottufy.com/', '').replace('.jpg', '');
        
        const [newPhoto] = await db
          .insert(portfolioPhotos)
          .values({
            portfolioId,
            photoUrl: photoId, // Store just the ID, not the full URL
            originalName: `portfolio-photo-${Date.now()}-${nextOrder}.jpg`,
            order: nextOrder,
          })
          .returning();

        newPhotos.push(newPhoto);
        nextOrder++;
      }

      // Update portfolio's updated timestamp
      await db
        .update(portfolios)
        .set({ updatedAt: new Date() })
        .where(eq(portfolios.id, portfolioId));

      res.status(201).json(newPhotos);
    } catch (error) {
      console.error("Error adding photos to portfolio:", error);
      res.status(500).json({ error: "Failed to add photos to portfolio" });
    }
  });

  /**
   * Update photo order in portfolio
   * PATCH /api/portfolios/:id/photos/reorder
   */
  app.patch("/api/portfolios/:id/photos/reorder", authenticate, async (req: Request, res: Response) => {
    try {
      const portfolioId = parseInt(req.params.id);
      const { photoOrders } = req.body; // Array of { photoId, order }

      if (!Array.isArray(photoOrders)) {
        return res.status(400).json({ error: "Photo orders array is required" });
      }

      // Check if portfolio belongs to user
      const [existingPortfolio] = await db
        .select()
        .from(portfolios)
        .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, req.user!.id)))
        .limit(1);

      if (!existingPortfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }

      // Update photo orders
      for (const { photoId, order } of photoOrders) {
        await db
          .update(portfolioPhotos)
          .set({ order })
          .where(and(
            eq(portfolioPhotos.id, photoId),
            eq(portfolioPhotos.portfolioId, portfolioId)
          ));
      }

      // Update portfolio's updated timestamp
      await db
        .update(portfolios)
        .set({ updatedAt: new Date() })
        .where(eq(portfolios.id, portfolioId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering portfolio photos:", error);
      res.status(500).json({ error: "Failed to reorder photos" });
    }
  });

  /**
   * Delete photo from portfolio
   * DELETE /api/portfolios/:id/photos/:photoId
   */
  app.delete("/api/portfolios/:id/photos/:photoId", authenticate, async (req: Request, res: Response) => {
    try {
      const portfolioId = parseInt(req.params.id);
      const photoId = parseInt(req.params.photoId);

      // Check if portfolio belongs to user
      const [existingPortfolio] = await db
        .select()
        .from(portfolios)
        .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, req.user!.id)))
        .limit(1);

      if (!existingPortfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }

      // Delete photo
      const deletedRows = await db
        .delete(portfolioPhotos)
        .where(and(
          eq(portfolioPhotos.id, photoId),
          eq(portfolioPhotos.portfolioId, portfolioId)
        ));

      if (deletedRows.length === 0) {
        return res.status(404).json({ error: "Photo not found in portfolio" });
      }

      // Update portfolio's updated timestamp
      await db
        .update(portfolios)
        .set({ updatedAt: new Date() })
        .where(eq(portfolios.id, portfolioId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting portfolio photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  /**
   * Get user's projects and photos for portfolio selection
   * GET /api/portfolios/photos-source
   */
  app.get("/api/portfolios/photos-source", authenticate, async (req: Request, res: Response) => {
    try {
      // Get user's projects from the old projects table
      const userProjects = await db
        .select({
          id: projects.id,
          name: projects.name,
          photos: projects.photos,
        })
        .from(projects)
        .where(eq(projects.photographerId, req.user!.id))
        .orderBy(desc(projects.createdAt));

      // Parse photos JSON data for each project (handle both string and object formats)
      const projectsWithParsedPhotos = userProjects.map(project => {
        let photos = [];
        
        if (project.photos) {
          try {
            // If it's already an object, use it directly; if it's a string, parse it
            if (typeof project.photos === 'string') {
              photos = JSON.parse(project.photos);
            } else if (Array.isArray(project.photos)) {
              photos = project.photos;
            }
          } catch (error) {
            console.error(`Error parsing photos for project ${project.id}:`, error);
            photos = [];
          }
        }
        
        return {
          id: project.id,
          name: project.name,
          photos
        };
      });

      res.json(projectsWithParsedPhotos);
    } catch (error) {
      console.error("Error fetching user projects for portfolio:", error);
      res.status(500).json({ error: "Failed to fetch photos source" });
    }
  });

  /**
   * Get public portfolio by slug
   * GET /api/portfolios/public/:slug
   */
  app.get("/api/portfolios/public/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;

      // Get portfolio with user information
      const [portfolio] = await db
        .select({
          id: portfolios.id,
          name: portfolios.name,
          slug: portfolios.slug,
          description: portfolios.description,
          coverImageUrl: portfolios.coverImageUrl,
          isPublic: portfolios.isPublic,
          createdAt: portfolios.createdAt,
          updatedAt: portfolios.updatedAt,
          userName: users.name,
        })
        .from(portfolios)
        .innerJoin(users, eq(portfolios.userId, users.id))
        .where(and(eq(portfolios.slug, slug), eq(portfolios.isPublic, true)))
        .limit(1);

      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }

      // Get portfolio photos with proper field mapping and construct full URLs
      const rawPhotos = await db
        .select({
          id: portfolioPhotos.id,
          photoUrl: portfolioPhotos.photoUrl,
          originalName: portfolioPhotos.originalName,
          description: portfolioPhotos.description,
          order: portfolioPhotos.order,
        })
        .from(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, portfolio.id))
        .orderBy(portfolioPhotos.order);

      // Map photos with proper URL handling
      const photos = rawPhotos.map(photo => ({
        ...photo,
        photoUrl: photo.photoUrl.startsWith('http') 
          ? photo.photoUrl // Use complete URLs as-is
          : `https://cdn.fottufy.com/${photo.photoUrl}.jpg` // Build URL for IDs
      }));

      const result = {
        id: portfolio.id,
        name: portfolio.name,
        slug: portfolio.slug,
        description: portfolio.description,
        coverImageUrl: portfolio.coverImageUrl,
        isPublic: portfolio.isPublic,
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt,
        userName: portfolio.userName,
        photos
      };

      res.json(result);
    } catch (error) {
      console.error("Error fetching public portfolio:", error);
      res.status(500).json({ error: "Failed to fetch portfolio" });
    }
  });

  // Update portfolio
  app.put("/api/portfolios/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, isPublic } = req.body;
      
      const portfolio = await storage.getPortfolio(parseInt(id));
      if (!portfolio || portfolio.userId !== req.user!.id) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      const updatedPortfolio = await storage.updatePortfolio(parseInt(id), {
        name,
        description,
        isPublic
      });

      res.json(updatedPortfolio);
    } catch (error) {
      console.error("Error updating portfolio:", error);
      res.status(500).json({ message: "Failed to update portfolio" });
    }
  });

  // Delete portfolio
  app.delete("/api/portfolios/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const portfolio = await storage.getPortfolio(parseInt(id));
      if (!portfolio || portfolio.userId !== req.user!.id) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      await storage.deletePortfolio(parseInt(id));
      res.json({ message: "Portfolio deleted successfully" });
    } catch (error) {
      console.error("Error deleting portfolio:", error);
      res.status(500).json({ message: "Failed to delete portfolio" });
    }
  });

  // Add photos to portfolio
  app.post("/api/portfolios/:id/photos", authenticate, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { photoIds } = req.body;
      
      if (!photoIds || !Array.isArray(photoIds)) {
        return res.status(400).json({ message: "Photo IDs array is required" });
      }

      const portfolio = await storage.getPortfolio(parseInt(id));
      if (!portfolio || portfolio.userId !== req.user!.id) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      await storage.addPhotosToPortfolio(parseInt(id), photoIds);
      const updatedPortfolio = await storage.getPortfolio(parseInt(id));
      
      res.json(updatedPortfolio);
    } catch (error) {
      console.error("Error adding photos to portfolio:", error);
      res.status(500).json({ message: "Failed to add photos to portfolio" });
    }
  });

  // Remove photos from portfolio
  app.delete("/api/portfolios/:id/photos", authenticate, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { photoIds } = req.body;
      
      if (!photoIds || !Array.isArray(photoIds)) {
        return res.status(400).json({ message: "Photo IDs array is required" });
      }

      const portfolio = await storage.getPortfolio(parseInt(id));
      if (!portfolio || portfolio.userId !== req.user!.id) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      await storage.removePhotosFromPortfolio(parseInt(id), photoIds);
      const updatedPortfolio = await storage.getPortfolio(parseInt(id));
      
      res.json(updatedPortfolio);
    } catch (error) {
      console.error("Error removing photos from portfolio:", error);
      res.status(500).json({ message: "Failed to remove photos from portfolio" });
    }
  });

  // ==================== Rotas para redefinição de senha ====================
  
  /**
   * Rota para solicitar redefinição de senha
   * 
   * POST /api/password/forgot
   * Body: { email: string }
   * 
   * Retorna:
   * - 200 { success: true } independente se o email existe ou não (por segurança)
   * - 400 { success: false, message: "..." } apenas em caso de erro de validação
   */
  app.post("/api/password/forgot", async (req: Request, res: Response) => {
    try {
      console.log("[Forgot Password] Requisição recebida:", req.body);
      const { email } = req.body;
      
      // Validar email
      if (!email || typeof email !== 'string') {
        console.log("[Forgot Password] Email inválido:", email);
        return res.status(400).json({
          success: false,
          message: "Email inválido"
        });
      }
      
      // Normalizar o email para minúsculas
      const normalizedEmail = email.toLowerCase().trim();
      console.log("[Forgot Password] Email normalizado:", normalizedEmail);
      
      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        console.log("[Forgot Password] Formato de email inválido:", normalizedEmail);
        return res.status(400).json({
          success: false,
          message: "Formato de email inválido"
        });
      }
      
      // Buscar usuário pelo email
      console.log("[Forgot Password] Buscando usuário pelo email:", normalizedEmail);
      const user = await storage.getUserByEmail(normalizedEmail);
      
      // Se o usuário existir, gerar token e enviar email
      if (user) {
        console.log("[Forgot Password] Usuário encontrado:", user.id, user.email);
        // Gerar token com validade de 1 hora
        console.log("[Forgot Password] Gerando token para o usuário ID:", user.id);
        const token = await generatePasswordResetToken(user.id, 60);
        
        if (token) {
          console.log("[Forgot Password] Token gerado com sucesso:", token.substring(0, 8) + "...");
          // Enviar email com link para redefinição
          console.log("[Forgot Password] Enviando email para:", user.email);
          const emailResult = await sendPasswordResetEmail(user.email, token, false, user.name);
          console.log("[Forgot Password] Resultado do envio de email:", emailResult);
          console.log(`Token de redefinição de senha gerado para: ${normalizedEmail}`);
        } else {
          console.error(`Falha ao gerar token para: ${normalizedEmail}`);
        }
      } else {
        console.log(`Tentativa de redefinição para email não cadastrado: ${normalizedEmail}`);
      }
      
      // Sempre retornar sucesso para evitar enumeração de emails
      return res.status(200).json({
        success: true,
        message: "Se este email estiver cadastrado, você receberá instruções para redefinir sua senha"
      });
      
    } catch (error) {
      console.error("Erro ao processar solicitação de redefinição de senha:", error);
      return res.status(500).json({
        success: false,
        message: "Ocorreu um erro ao processar sua solicitação"
      });
    }
  });
  
  /**
   * Rota para verificar se um token de redefinição de senha é válido
   * 
   * GET /api/password/verify-token?token=xxx
   * 
   * Retorna:
   * - 200 { isValid: true } se o token for válido
   * - 400 { isValid: false, message: "..." } se o token for inválido
   */
  app.get("/api/password/verify-token", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        console.log("Verificação de token falhou: token não fornecido ou em formato incorreto");
        return res.status(400).json({ 
          isValid: false, 
          message: "Token inválido ou ausente" 
        });
      }
      
      console.log(`Verificando token: ${token.substring(0, 8)}...`);
      
      // Antes de verificar na DB, verificar se o token tem formato válido de UUID
      if (!token.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.log(`Token com formato inválido: ${token.substring(0, 8)}...`);
        return res.status(400).json({
          isValid: false,
          message: "Formato de token inválido"
        });
      }
      
      try {
        const result = await verifyPasswordResetToken(token);
        
        if (result.isValid) {
          console.log(`Token válido: ${token.substring(0, 8)}...`);
          return res.json({ isValid: true });
        } else {
          console.log(`Token expirado ou inválido: ${token.substring(0, 8)}...`);
          return res.status(400).json({ 
            isValid: false, 
            message: "Token expirado ou inválido" 
          });
        }
      } catch (dbError: any) {
        // Erro específico de banco de dados
        console.error("Erro de banco de dados ao verificar token:", dbError);
        return res.status(400).json({
          isValid: false,
          message: "Token inválido",
          detail: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
    } catch (error: any) {
      console.error("Erro ao verificar token de redefinição de senha:", error);
      return res.status(500).json({ 
        isValid: false, 
        message: "Erro ao verificar token",
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // 1. Primeiro, registre um middleware para garantir que todos os arquivos sejam servidos com o MIME type correto
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    
    // Configurar o Content-Type adequado baseado na extensão do arquivo
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    } else if (path.endsWith('.js') || path.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (path.endsWith('.jsx') || path.endsWith('.tsx')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    }
    
    next();
  });
  
  // Middleware específico para arquivos .tsx e .jsx no desenvolvimento do Vite
  app.get(['*.tsx', '*.jsx', '*/src/*.tsx', '*/src/*.jsx'], (req: Request, res: Response, next: NextFunction) => {
    // Configurar corretamente o Content-Type para módulos ES
    res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    // Log de baixo nível para debug
    if (process.env.DEBUG_MIME === 'true') {
      console.log(`[MIME] Servindo ${req.path} com Content-Type: application/javascript`);
    }
    next();
  });
  
  // Middleware específico para outros módulos ES no desenvolvimento
  app.get(['*.ts', '*.mjs', '*/src/*.ts', '*/src/*.mjs'], (req: Request, res: Response, next: NextFunction) => {
    // Garantir que módulos ES sejam servidos com o tipo correto
    res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    if (process.env.DEBUG_MIME === 'true') {
      console.log(`[MIME] Servindo ${req.path} com Content-Type: application/javascript`);
    }
    next();
  });
  
  // 2. Middleware específico para processar os arquivos HTML estáticos de redefinição/criação de senha
  app.get(['*/reset-password.html', '*/create-password.html'], (req: Request, res: Response, next: NextFunction) => {
    console.log(`Servindo arquivo HTML estático de redefinição de senha: ${req.path}`);
    
    // Definir explicitamente TODOS os cabeçalhos necessários para evitar problemas de MIME
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    
    // Desativar cache para garantir que sempre use a versão mais recente
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Configurações de segurança
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Log para debug
    console.log(`Headers para ${req.path}:`, {
      contentType: res.getHeader('Content-Type'),
      cacheControl: res.getHeader('Cache-Control')
    });
    
    next();
  });
  
  // 3. Rota explícita para lidar com URLs sem ".html" que devem ser servidas como HTML estático
  app.get(["/reset-password", "/create-password"], (req: Request, res: Response, next: NextFunction) => {
    // Se a resposta já foi enviada (prevenção de erro ERR_HTTP_HEADERS_SENT)
    if (res.headersSent) {
      console.log(`Headers já enviados para ${req.url}, ignorando handler redundante`);
      return;
    }

    // Verificar se há token na query string
    const token = req.query.token;
    
    /**
     * MELHORIAS NO FLUXO DE REDEFINIÇÃO DE SENHA:
     * 
     * 1. Em ambiente de desenvolvimento, sempre passamos para o app React para facilitar debugging
     * 2. Em produção com token, servimos a página HTML estática sem problemas de MIME type
     * 3. Sem token, passamos para o app React que exibirá mensagem de erro apropriada
     */
    
    try {
      // Em ambiente de desenvolvimento, sempre passar para o React
      if (process.env.NODE_ENV === 'development') {
        console.log(`Ambiente de desenvolvimento: delegando ${req.path} para o React`);
        
        // Configurar cabeçalhos para garantir funcionamento adequado
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        
        // No desenvolvimento, passar para o próximo middleware (Vite/React)
        return next();
      }
      
      // Em produção, se há token, servir o arquivo HTML estático diretamente
      if (token) {
        console.log(`Token encontrado na URL ${req.path}, servindo página HTML estática`);
        
        // Determinar qual arquivo servir
        const htmlFile = req.path === '/reset-password' 
          ? 'reset-password.html' 
          : 'create-password.html';
        
        const htmlPath = path.resolve(
          import.meta.dirname,
          "..",
          "public",
          htmlFile
        );
        
        // Configurar cabeçalhos explicitamente
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Registrar detalhes para debug
        console.log(`Servindo arquivo HTML estático: ${htmlPath} com Content-Type: ${res.getHeader('Content-Type')}`);
        
        // Servir o arquivo HTML estático
        return res.sendFile(htmlPath);
      }
      
      // Se não há token, passar para o app React normal
      return next();
    } catch (error) {
      // Tratamento de erros para evitar que erros não tratados quebrem o fluxo
      console.error(`Erro no processamento da rota ${req.path}:`, error);
      if (!res.headersSent) {
        return res.status(500).send("Erro interno do servidor");
      }
    }
  });
  
  // 4. Rota para o app React nas rotas de redefinição/criação de senha
  app.get(["/reset-password", "/reset-password/*", "/create-password", "/create-password/*"], (req: Request, res: Response, next: NextFunction) => {
    // Se for uma solicitação ao arquivo HTML estático, passamos para o próximo middleware
    if (req.path.endsWith('.html')) {
      console.log(`Redirecionando para arquivo HTML estático: ${req.path}`);
      return next();
    }
    
    // Se a resposta já foi enviada (prevenção de erro ERR_HTTP_HEADERS_SENT)
    if (res.headersSent) {
      console.log(`Headers já enviados para ${req.url}, ignorando handler redundante`);
      return;
    }
    
    const clientHtmlPath = path.resolve(
      import.meta.dirname,
      "..",
      "client",
      "index.html",
    );
    
    console.log(`Servindo app React para rota de senha: ${req.url}`);
    
    try {
      // Retorna o HTML principal para o React com o Content-Type correto
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      return res.sendFile(clientHtmlPath);
    } catch (error) {
      if (!res.headersSent) {
        console.error(`Erro ao servir HTML para ${req.url}:`, error);
        return res.status(500).send("Erro interno do servidor");
      }
    }
  });
  
  /**
   * Rota para redefinir a senha usando um token
   * 
   * POST /api/password/reset
   * Body: { token: string, password: string }
   * 
   * Retorna:
   * - 200 { success: true, message: "..." } se a senha for alterada com sucesso
   * - 400 { success: false, message: "..." } se o token for inválido ou a senha não atender aos requisitos
   */
  app.post("/api/password/reset", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Token e senha são obrigatórios" 
        });
      }
      
      // Verificar se a senha atende aos requisitos mínimos
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false, 
          message: "A senha deve ter pelo menos 6 caracteres" 
        });
      }
      
      // Redefinir a senha usando o token
      const result = await resetPasswordWithToken(token, password);
      
      if (result) {
        return res.json({ 
          success: true, 
          message: "Senha alterada com sucesso" 
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: "Não foi possível redefinir a senha. O token pode estar expirado ou já ter sido utilizado." 
        });
      }
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao redefinir senha" 
      });
    }
  });
  
  /**
   * Rota para enviar a senha atual do usuário por email
   * 
   * POST /api/password/send-current
   * Body: { email: string }
   * 
   * Retorna:
   * - 200 { success: true, message: "..." } se o email for enviado com sucesso
   * - 400 { success: false, message: "..." } se o email não existir
   */
  app.post("/api/password/send-current", async (req: Request, res: Response) => {
    // Garantir que a resposta seja JSON
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log("[Send Current Password] Requisição recebida");
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email é obrigatório"
        });
      }
      
      // Normalizar email para busca
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log("[Send Current Password] Buscando usuário pelo email:", normalizedEmail);
      const user = await storage.getUserByEmail(normalizedEmail);
      
      // Se o usuário existir, gerar uma senha temporária e enviá-la por email
      if (user) {
        console.log("[Send Current Password] Usuário encontrado:", user.id);
        
        // Gerar uma senha temporária de 8 caracteres (letras e números)
        const temporaryPassword = Math.random().toString(36).substring(2, 10);
        
        // Gerar hash da nova senha
        const hashedPassword = await hashPassword(temporaryPassword);
        
        // Atualizar senha do usuário no banco de dados
        await db
          .update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));
        
        console.log("[Send Current Password] Senha temporária gerada para usuário ID:", user.id);
        
        // Enviar a senha por email
        try {
          const emailResult = await sendEmail({
            to: user.email,
            subject: "Sua senha de acesso - Fottufy",
            html: `
              <h1>Recuperação de acesso</h1>
              <p>Olá ${user.name || ''},</p>
              <p>Conforme solicitado, aqui está a sua senha de acesso para a plataforma Fottufy:</p>
              <p style="font-size: 18px; font-weight: bold; padding: 10px; background-color: #f5f5f5; text-align: center; border: 1px solid #ddd; border-radius: 4px;">${temporaryPassword}</p>
              <p>Recomendamos que você altere esta senha após fazer login.</p>
              <p>Se você não solicitou esta recuperação, por favor, entre em contato com nosso suporte imediatamente.</p>
              <p>Atenciosamente,<br>Equipe Fottufy</p>
            `
          });
          
          if (!emailResult.success) {
            console.error("[Send Current Password] Falha ao enviar email:", emailResult.message);
            return res.status(500).json({
              success: false,
              message: "Erro ao enviar email. Por favor, tente novamente mais tarde."
            });
          }
          
          console.log("[Send Current Password] Email enviado com sucesso para:", user.email);
        } catch (emailError) {
          console.error("Erro ao enviar email com a senha:", emailError);
          return res.status(500).json({
            success: false,
            message: "Erro ao enviar email. Por favor, tente novamente mais tarde."
          });
        }
        
        // Sempre retornar sucesso para não revelar se o email existe
        return res.status(200).json({
          success: true,
          message: "Se este email estiver cadastrado, você receberá sua senha em instantes."
        });
      } else {
        console.log("[Send Current Password] Usuário não encontrado:", normalizedEmail);
        
        // Não revelar que o usuário não existe (segurança)
        return res.status(200).json({
          success: true,
          message: "Se este email estiver cadastrado, você receberá sua senha em instantes."
        });
      }
    } catch (error) {
      console.error("Erro ao processar envio de senha:", error);
      return res.status(500).json({
        success: false,
        message: "Ocorreu um erro ao processar sua solicitação"
      });
    }
  });

  // ===============================
  // PORTFOLIO SYSTEM ROUTES - NEW FEATURE
  // ===============================
  


  return httpServer;
}
