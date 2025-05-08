import type { Express, Request, Response } from "express";
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
  newProjects,
  photos,
  insertNewProjectSchema,
  insertPhotoSchema
} from "@shared/schema";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { setupAuth } from "./auth";
import Stripe from 'stripe';
import { upload } from "./index";
import http from "http";
import https from "https";
import bodyParser from "body-parser";
import passport from "passport";
import { db } from "./db";
import { eq, and, or, not, desc } from "drizzle-orm";
import { sendEmail } from "./utils/sendEmail";
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

// Basic authentication middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
  console.log(`[AUTH] Checking authentication for ${req.method} ${req.path}`);
  console.log(`[AUTH] Session ID: ${req.sessionID}, isAuthenticated: ${req.isAuthenticated ? req.isAuthenticated() : "not a function"}`);
  console.log(`[AUTH] Raw cookies: ${req.headers.cookie || "none"}`);
  console.log(`[AUTH] User: ${req.user ? `ID=${req.user.id}, role=${req.user.role}` : "undefined"}`);
  
  // First check for session-based authentication (Passport adds isAuthenticated method)
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log(`[AUTH] User authenticated via session: ID=${req.user?.id}`);
    return next();
  }
  
  // Check if we have any cookie that can be used to authenticate
  if (req.headers.cookie) {
    console.log(`[AUTH] Cookies found but no passport session: ${req.headers.cookie}`);
    
    // First, try to recover from the session cookie
    if (req.headers.cookie.includes('studio.sid') && req.session && req.sessionID) {
      console.log(`[AUTH] Attempting to recover session ${req.sessionID}`);
      
      // If we have session cookie but no session data, try to force a session refresh
      req.session.reload((err) => {
        if (err) {
          console.error(`[AUTH] Failed to reload session:`, err);
        } else {
          console.log(`[AUTH] Session reloaded, checking authentication again`);
          if (req.isAuthenticated && req.isAuthenticated()) {
            console.log(`[AUTH] User authenticated after session reload: ID=${req.user?.id}`);
            return next();
          }
        }
      });
    }
    
    // Check for our direct authentication cookie
    if (req.headers.cookie.includes('user_id=')) {
      console.log(`[AUTH] Found direct user_id cookie, extracting ID`);
      
      // Try to extract user ID from cookie
      let userId = null;
      const cookies = req.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'user_id') {
          userId = parseInt(value);
          console.log(`[AUTH] Found user ID ${userId} in direct cookie`);
          break;
        }
      }
      
      if (userId && !isNaN(userId)) {
        // Get user from storage and establish session
        storage.getUser(userId)
          .then(user => {
            if (user) {
              console.log(`[AUTH] Successfully loaded user from direct cookie ID: ${userId}`);
              
              // Login the user to establish a session
              req.login(user, (err) => {
                if (err) {
                  console.error('[AUTH] Error establishing session from direct cookie:', err);
                } else {
                  console.log(`[AUTH] Session established from direct cookie, continuing request`);
                  next();
                }
              });
            }
          })
          .catch(err => {
            console.error('[AUTH] Error loading user from direct cookie ID:', err);
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
  console.log("[AUTH] No authentication found, returning 401");
  
  // Return more helpful error for debugging
  return res.status(401).json({ 
    message: "Não autorizado", 
    debug: {
      sessionId: req.sessionID,
      hasCookies: Boolean(req.headers.cookie),
      sessionExists: Boolean(req.session),
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false
    }
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
  app.post("/api/photos/upload", authenticate, r2Upload.array('photos', 10000), async (req: Request, res: Response) => {
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
        return res.status(403).json({ 
          message: "Upload limit exceeded. Please upgrade your plan to upload more photos.", 
          uploadLimit: req.user.uploadLimit,
          usedUploads: req.user.usedUploads
        });
      }
      
      // Upload cada arquivo para o Cloudflare R2 Storage
      const uploadedFiles = [];
      
      for (const file of req.files as Express.Multer.File[]) {
        const filename = generateUniqueFileName(file.originalname);
        
        try {
          // Upload para o R2
          const result = await uploadFileToR2(
            file.buffer, 
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
            url: result.url, // Usar a URL retornada pelo método uploadFileToR2
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
      return res.status(500).json({
        message: "Failed to upload files",
        error: (error as Error).message
      });
    }
  });
  
  // Upload uma ou mais imagens diretamente para o Cloudflare R2 Storage e associa a um projeto específico
  app.post("/api/projects/:id/photos/upload", authenticate, r2Upload.array('photos', 10000), async (req: Request, res: Response) => {
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
        return res.status(403).json({ 
          message: "Upload limit exceeded. Please upgrade your plan to upload more photos.", 
          uploadLimit: req.user.uploadLimit,
          usedUploads: req.user.usedUploads
        });
      }
      
      // Upload cada arquivo para o Cloudflare R2 Storage
      const uploadedFiles = [];
      const newPhotos = [];
      
      for (const file of req.files as Express.Multer.File[]) {
        const filename = generateUniqueFileName(file.originalname);
        
        try {
          // Upload para o R2
          const result = await uploadFileToR2(
            file.buffer, 
            filename, 
            file.mimetype
          );
          
          // Usar a URL retornada pela função de upload, que usa o domínio CDN
          // Formato atual: https://cdn.fottufy.com/{filename}
          
          // Adicionar a foto ao banco de dados associada ao projeto
          try {
            const newPhoto = await db.insert(photos).values({
              projectId,
              url: result.url, // Usar a URL retornada pelo método uploadFileToR2
              filename,
              selected: false
            }).returning();
            
            if (newPhoto && newPhoto[0]) {
              newPhotos.push(newPhoto[0]);
            }
          } catch (dbError) {
            console.error(`Error adding photo to database: ${dbError}`);
            // Mesmo com erro no banco, ainda listamos o arquivo no resultado
          }
            
          // Usar a URL retornada pela função de upload
          uploadedFiles.push({
            originalName: file.originalname,
            filename: filename,
            size: file.size,
            mimetype: file.mimetype,
            url: result.url, // Usar a URL retornada pelo método uploadFileToR2
            key: result.key
          });
        } catch (uploadError) {
          console.error(`Error uploading file ${filename} to R2:`, uploadError);
          continue; // Continuar com próximo arquivo mesmo se este falhar
        }
      }
      
      // Atualizar a contagem de uploads do usuário
      if (uploadedFiles.length > 0) {
        await storage.updateUploadUsage(req.user.id, uploadedFiles.length);
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
      return res.status(500).json({
        message: "Failed to upload files to project",
        error: (error as Error).message
      });
    }
  });
  
  // ==================== New Project Management Routes ====================
  
  // Get all projects for the authenticated user
  app.get("/api/v2/projects", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const projects = await db.query.newProjects.findMany({
        where: eq(newProjects.userId, req.user.id),
        with: {
          photos: true
        }
      });
      
      res.json(projects);
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
  
  // Get a specific project by ID
  app.get("/api/v2/projects/:id", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const projectId = req.params.id;
      
      const project = await db.query.newProjects.findFirst({
        where: and(
          eq(newProjects.id, projectId),
          eq(newProjects.userId, req.user.id)
        ),
        with: {
          photos: true
        }
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
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
      console.log(`Updated upload usage for user ${userId} after deleting photo ${photoId}`);
      
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
      
      console.log(`Salvando seleção para projeto ${projectId} com ${photoIds.length} fotos`);
      
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
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
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
      
      // Prepare response
      const stats = {
        activeProjects,
        photosThisMonth,
        totalUploadUsageMB,
        planInfo: {
          name: user?.planType || 'basic',
          uploadLimit: user?.uploadLimit || 1000,
          usedUploads: user?.usedUploads || 0
        }
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error retrieving user stats:", error);
      res.status(500).json({ message: "Error retrieving user statistics" });
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
      
      // Parse watermark setting (convert string "true"/"false" to boolean)
      const shouldApplyWatermark = applyWatermark === "false" ? false : true;
      
      console.log("Project data (raw):", { projectName, clientName, clientEmail, photographerId });
      console.log("Project data (processed):", { name, clientName, clientEmail, photographerId });
      
      // Validate project data and ensure photographerId is set to the current user's ID if logged in
      const currentUserId = req.user?.id || parseInt(photographerId || '1');
      
      // Generate a unique public ID for the project URL
      const uniquePublicId = nanoid(10); // 10 character unique ID
      
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
      
      // Verificar o limite de uploads do usuário
      const photoCount = processedPhotos.length;
      
      if (req.user) {
        const hasUploadLimit = await storage.checkUploadLimit(req.user.id, photoCount);
        
        if (!hasUploadLimit) {
          return res.status(403).json({ 
            message: "Upload limit reached", 
            error: "UPLOAD_LIMIT_REACHED",
            details: "You have reached the upload limit for your current plan. Please upgrade to continue uploading photos."
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
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
  
  // Adicionar novas fotos a um projeto existente
  app.post("/api/projects/:id/photos", authenticate, requireActiveUser, r2Upload.array('photos', 10000), async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const { applyWatermark } = req.body;
      
      // Parse watermark setting (convert string "true"/"false" to boolean)
      const shouldApplyWatermark = applyWatermark === "false" ? false : true;
      
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
  
  // ==================== Subscription Routes ====================
  
  // Obter planos de assinatura
  app.get("/api/subscription/plans", authenticate, async (req: Request, res: Response) => {
    try {
      // Preparar os planos V2 para mostrar a todos os usuários
      const plansV2 = {
        FREE: { ...SUBSCRIPTION_PLANS.FREE, current: req.user?.planType === 'free' },
        BASIC_V2: { ...SUBSCRIPTION_PLANS.BASIC_V2, current: req.user?.planType === 'basic_v2' },
        STANDARD_V2: { ...SUBSCRIPTION_PLANS.STANDARD_V2, current: req.user?.planType === 'standard_v2' },
        PROFESSIONAL_V2: { ...SUBSCRIPTION_PLANS.PROFESSIONAL_V2, current: req.user?.planType === 'professional_v2' },
      };
      
      // Verificar se o usuário está em um plano antigo
      const userPlanType = req.user?.planType || 'free';
      const isLegacyPlan = ['basic', 'standard', 'professional'].includes(userPlanType);
      
      // Se o usuário está em um plano antigo, adicione esse plano específico aos planos disponíveis
      let plans = plansV2;
      if (isLegacyPlan) {
        const planKey = userPlanType.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS;
        plans = {
          ...plansV2,
          [planKey]: { ...SUBSCRIPTION_PLANS[planKey], current: true }
        };
      }
      
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
        console.log(`Plano ${planKey} não encontrado, usando fallback ${fallbackKey}`);
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
      
      console.log(`Criando PaymentIntent para plano: ${normalizedPlanType} (valor: R$${selectedPlan.price.toFixed(2)}, limite: ${selectedPlan.uploadLimit} uploads)`);
      
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
      console.error("Erro ao criar intent de pagamento:", error);
      res.status(500).json({ 
        message: "Falha ao processar pagamento", 
        details: error instanceof Error ? error.message : "Erro desconhecido" 
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

  return httpServer;
}
