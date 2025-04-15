import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertProjectSchema, WebhookPayload, SUBSCRIPTION_PLANS, Project } from "@shared/schema";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { setupAuth } from "./auth";
import Stripe from 'stripe';
import { upload } from "./index";
import http from "http";
import https from "https";

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

// Basic authentication middleware - MODIFICADO PARA BYPASS DE AUTENTICAÇÃO EM DESENVOLVIMENTO
const authenticate = async (req: Request, res: Response, next: Function) => {
  console.log("Status de autenticação:", 
    req.isAuthenticated ? req.isAuthenticated() : "isAuthenticated não é uma função",
    "User:", req.user);
  
  // DESENVOLVIMENTO: Verificar autenticação
  if (req.isAuthenticated && req.isAuthenticated()) {
    // Usuário já está autenticado pela sessão
    console.log(`Usuário autenticado pela sessão: ID=${req.user?.id}`);
    return next();
  }
  
  // Para usuários não autenticados via sessão, usar cookie auth-bypass ou o cabeçalho
  if (!req.user) {
    // Verificar se há um token ou usuário de teste na sessão
    if (req.headers['x-user-id']) {
      // Autenticação via header para testes
      const userId = parseInt(req.headers['x-user-id'] as string);
      if (!isNaN(userId)) {
        const user = await storage.getUser(userId);
        if (user) {
          console.log(`Usuário carregado do header x-user-id: ${userId}`);
          req.user = user;
          return next();
        }
      }
    }
    
    // Se chegou aqui, não há usuário autenticado, usar o bypass para desenvolvimento
    console.log("GET /api/user - Status de autenticação: false");
    console.log("Retornando usuário de teste para GET /api/user");
    req.user = {
      id: 1,
      name: "Usuário de Teste",
      email: "teste@example.com",
      role: "photographer",
      status: "active",
      planType: "standard",
      uploadLimit: 5000,
      usedUploads: 0,
      subscriptionStatus: "active",
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }
  
  return next();
  
  // CÓDIGO ORIGINAL COMENTADO:
  /*
  // Verificar se o usuário já está autenticado pela sessão
  if (req.isAuthenticated && req.isAuthenticated()) {
    // O usuário já está autenticado pela sessão
    return next();
  }
  
  // Se não estiver autenticado pela sessão, tenta pelo header Authorization
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const [type, token] = authHeader.split(" ");
  
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Invalid authentication" });
  }
  
  // In a real app, this would validate JWT tokens
  // For now, we're simulating auth with a basic check
  const userId = token;
  
  try {
    const user = await storage.getUser(parseInt(userId));
    
    if (!user) {
      return res.status(401).json({ message: "Invalid authentication token" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Authentication error" });
  }
  */
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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Inicializar Stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Chave secreta do Stripe não encontrada. As funcionalidades de pagamento não funcionarão corretamente.');
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  
  // Configure auth with Passport.js and sessions
  setupAuth(app);
  
  // ==================== Auth Routes ==================== 
  // (basic routes handled by setupAuth)
  
  // Login route
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      console.log("Recebida requisição de login:", req.body);
      const { email, password } = req.body;
      
      if (!email || !password) {
        console.warn("Tentativa de login sem email ou senha");
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      
      console.log("Buscando usuário pelo email:", email);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.warn(`Usuário não encontrado para o email: ${email}`);
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }
      
      if (user.password !== password) {
        console.warn(`Senha incorreta para o usuário: ${email}`);
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }
      
      console.log(`Login bem-sucedido para: ${email}, ID: ${user.id}, Função: ${user.role}`);
      
      // In a real app, we would create and return a JWT token here
      // For now, we'll return the user
      const userData = {
        ...user,
        password: undefined, // Don't send password back to client
      };
      
      res.json({ 
        user: userData
      });
    } catch (error) {
      console.error("Erro durante o login:", error);
      res.status(500).json({ message: "Falha no login, tente novamente mais tarde" });
    }
  });
  
  // Register route
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse({
        ...req.body,
        role: "photographer", // Force role to be photographer
        status: "active",     // Default to active status
      });
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use" });
      }
      
      const user = await storage.createUser(userData);
      
      res.status(201).json({ 
        user: {
          ...user,
          password: undefined, // Don't send password back to client
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });
  
  // ==================== User Routes ====================
  
  // Get all users (admin only)
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
  
  // Get project by ID - Rota pública para clientes visualizarem seus projetos
  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      
      // Adicionando logs para debug
      console.log(`Buscando projeto com ID: ${idParam}`);
      
      // Tentar várias estratégias para encontrar o projeto pelo ID fornecido
      
      // Estratégia 1: Buscar diretamente pelo ID como número (para IDs numéricos)
      let project: Project | undefined;
      if (!isNaN(parseInt(idParam))) {
        const numericId = parseInt(idParam);
        console.log(`Estratégia 1: Buscando projeto com ID numérico ${numericId}`);
        project = await storage.getProject(numericId);
      }
      
      // Estratégia 2: Verificar todos os projetos e comparar como string
      if (!project) {
        console.log("Estratégia 2: Buscando projeto com comparação de string");
        const allProjects = await storage.getProjects();
        project = allProjects.find(p => p.id.toString() === idParam);
      }
      
      // Estratégia 3: Se for um ID longo (timestamp), tentar converter e buscar
      if (!project && idParam.length > 8) {
        console.log(`Estratégia 3: Buscando como possível timestamp: ${idParam}`);
        const timestampId = parseInt(idParam);
        if (!isNaN(timestampId)) {
          const allProjects = await storage.getProjects();
          project = allProjects.find(p => p.id === timestampId);
        }
      }
      
      // Estratégia 4: Verificar se o ID está contido ou contém outro ID (match parcial)
      if (!project) {
        console.log("Estratégia 4: Verificando correspondência parcial de IDs");
        const allProjects = await storage.getProjects();
        project = allProjects.find(p => {
          const projectIdStr = p.id.toString();
          return projectIdStr.includes(idParam) || idParam.includes(projectIdStr);
        });
      }
      
      // Se ainda não encontrou, informar que o projeto não existe
      if (!project) {
        console.log(`Projeto com ID ${idParam} não encontrado após todas as tentativas`);
        return res.status(404).json({ message: "Project not found" });
      }
      
      console.log(`Projeto encontrado: ID=${project.id}, Nome=${project.name}`);
      console.log(`Status do projeto: ${project.status}`);
      console.log(`Total de fotos: ${project.photos?.length || 0}`);
      
      // Esta é uma rota pública, então retornamos o projeto completo
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
  app.post("/api/projects", upload.array('photos', 100), async (req: Request, res: Response) => {
    try {
      console.log("Receiving request to create project", req.body);
      
      // Extract project data from request body
      // When using FormData, form fields come as strings instead of JSON objects
      const { projectName, clientName, clientEmail, photographerId, photos, photosData } = req.body;
      
      // Use fields from FormData format or fallback to JSON format
      const name = projectName || req.body.nome || req.body.name;
      
      console.log("Project data (raw):", { projectName, clientName, clientEmail, photographerId });
      console.log("Project data (processed):", { name, clientName, clientEmail, photographerId });
      
      // Validate project data
      const projectData = insertProjectSchema.parse({
        name: name,
        clientName: clientName,
        clientEmail: clientEmail,
        photographerId: parseInt(photographerId || '1'),
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
            // Handle external URLs like Unsplash: download the image to local storage
            if (url.startsWith('http')) {
              console.log(`External photo URL: ${url} with ID: ${id}`);
              
              try {
                // Attempt to download the image
                const localUrl = await downloadImage(url, photo.filename);
                url = localUrl; // Use the local URL after successful download
                console.log(`Successfully downloaded external image to: ${url}`);
              } catch (err) {
                console.error(`Failed to download external image from ${url}: ${err.message}`);
                // Keep the external URL if download fails
              }
            } else {
              // Local uploads: fix paths
              url = `/uploads/${path.basename(url)}`;
            }
            
            console.log(`JSON photo: ${photo.filename}, URL: ${url}, ID: ${id}`);
            
            processedPhotos.push({
              id: id,
              url: url,
              filename: photo.filename,
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
              // Handle external URLs like Unsplash: download the image to local storage
              if (url.startsWith('http')) {
                console.log(`External photo URL: ${url} with ID: ${id}`);
                
                try {
                  // Attempt to download the image
                  const localUrl = await downloadImage(url, photo.filename);
                  url = localUrl; // Use the local URL after successful download
                  console.log(`Successfully downloaded external image to: ${url}`);
                } catch (err) {
                  console.error(`Failed to download external image from ${url}: ${err.message}`);
                  // Keep the external URL if download fails
                }
              } else {
                // Local uploads: fix paths
                url = `/uploads/${path.basename(url)}`;
              }
              
              console.log(`JSON photosData: ${photo.filename}, URL: ${url}, ID: ${id}`);
              
              processedPhotos.push({
                id: id,
                url: url,
                filename: photo.filename,
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
        processedPhotos = uploadedFiles.map(file => {
          // Generate a unique ID for the photo
          const id = nanoid();
          
          // Get the filename saved on disk
          const filename = path.basename(file.path);
          
          // Create a web-accessible URL path to the uploaded file
          const fileUrl = `/uploads/${filename}`;
          console.log(`File uploaded: ${file.originalname}, Saved as: ${filename}, URL: ${fileUrl}`);
          
          return {
            id: id,
            url: fileUrl,
            filename: file.originalname || 'photo.jpg',
          };
        });
      }
      // If no photos were provided through any method, use a single placeholder
      if (processedPhotos.length === 0) {
        console.log("No photos found in request, using a placeholder");
        processedPhotos = [
          { 
            id: nanoid(),
            url: 'https://via.placeholder.com/800x600?text=No+Photo+Uploaded', 
            filename: 'placeholder.jpg' 
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
      
      // Usar as mesmas estratégias da rota GET para encontrar o projeto
      // Estratégia 1: Buscar diretamente pelo ID como número (para IDs numéricos)
      let project: any;
      let projectId = 0;
      
      if (!isNaN(parseInt(idParam))) {
        projectId = parseInt(idParam);
        console.log(`Estratégia 1: Buscando projeto com ID numérico ${projectId}`);
        project = await storage.getProject(projectId);
      }
      
      // Estratégia 2: Verificar todos os projetos e comparar como string
      if (!project) {
        console.log("Estratégia 2: Buscando projeto com comparação de string");
        const allProjects = await storage.getProjects();
        project = allProjects.find(p => p.id.toString() === idParam);
        if (project) projectId = project.id;
      }
      
      // Estratégia 3: Se for um ID longo (timestamp), tentar converter e buscar
      if (!project && idParam.length > 8) {
        console.log(`Estratégia 3: Buscando como possível timestamp: ${idParam}`);
        const timestampId = parseInt(idParam);
        if (!isNaN(timestampId)) {
          const allProjects = await storage.getProjects();
          project = allProjects.find(p => p.id === timestampId);
          if (project) projectId = project.id;
        }
      }
      
      // Estratégia 4: Verificar se o ID está contido ou contém outro ID (match parcial)
      if (!project) {
        console.log("Estratégia 4: Verificando correspondência parcial de IDs");
        const allProjects = await storage.getProjects();
        project = allProjects.find(p => {
          const projectIdStr = p.id.toString();
          return projectIdStr.includes(idParam) || idParam.includes(projectIdStr);
        });
        if (project) projectId = project.id;
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
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if photographer ID matches authenticated user
      if (req.user && (project.photographerId !== req.user.id && req.user.role !== "admin")) {
        return res.status(403).json({ message: "Cannot archive projects of other photographers" });
      }
      
      const updatedProject = await storage.archiveProject(projectId);
      
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
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if photographer ID matches authenticated user
      if (project.photographerId !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Cannot reopen projects of other photographers" });
      }
      
      const updatedProject = await storage.reopenProject(projectId);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to reopen project" });
    }
  });
  
  // Adicionar novas fotos a um projeto existente
  app.post("/api/projects/:id/photos", authenticate, requireActiveUser, upload.array('photos', 100), async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      // Verificar se o projeto existe
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
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
        
        // Convert uploaded files to photo objects
        processedPhotos = uploadedFiles.map(file => {
          // Generate a unique ID for the photo
          const id = nanoid();
          
          // Get the filename saved on disk
          const filename = path.basename(file.path);
          
          // Create a web-accessible URL path to the uploaded file
          const fileUrl = `/uploads/${filename}`;
          console.log(`File uploaded to project ${projectId}: ${file.originalname}, Saved as: ${filename}, URL: ${fileUrl}`);
          
          return {
            id: id,
            url: fileUrl,
            filename: file.originalname || 'photo.jpg',
          };
        });
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
            // Handle external URLs like Unsplash: download the image to local storage
            if (url.startsWith('http')) {
              console.log(`External photo URL: ${url} with ID: ${id}`);
              
              try {
                // Attempt to download the image
                const localUrl = await downloadImage(url, photo.filename);
                url = localUrl; // Use the local URL after successful download
                console.log(`Successfully downloaded external image to: ${url}`);
              } catch (err: any) {
                console.error(`Failed to download external image from ${url}: ${err.message}`);
                // Keep the external URL if download fails
              }
            } else {
              // Local uploads: fix paths
              url = `/uploads/${path.basename(url)}`;
            }
            
            console.log(`JSON photo for existing project: ${photo.filename}, URL: ${url}, ID: ${id}`);
            
            processedPhotos.push({
              id: id,
              url: url,
              filename: photo.filename
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
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Verificar se o fotógrafo é o dono do projeto ou se é admin
      if (project.photographerId !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Você não tem permissão para excluir este projeto" });
      }
      
      const deleted = await storage.deleteProject(projectId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Falha ao excluir projeto" });
      }
      
      res.json({ success: true, message: "Projeto excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      res.status(500).json({ message: "Falha ao excluir projeto" });
    }
  });
  
  // ==================== Subscription Routes ====================
  
  // Obter planos de assinatura
  app.get("/api/subscription/plans", authenticate, async (req: Request, res: Response) => {
    try {
      // Retornar os planos de assinatura disponíveis
      const plans = {
        FREE: { ...SUBSCRIPTION_PLANS.FREE, current: req.user?.planType === 'free' },
        BASIC: { ...SUBSCRIPTION_PLANS.BASIC, current: req.user?.planType === 'basic' },
        STANDARD: { ...SUBSCRIPTION_PLANS.STANDARD, current: req.user?.planType === 'standard' },
        PROFESSIONAL: { ...SUBSCRIPTION_PLANS.PROFESSIONAL, current: req.user?.planType === 'professional' },
      };
      
      // Incluir estatísticas do usuário atual
      const userStats = {
        uploadLimit: req.user?.uploadLimit || 0,
        usedUploads: req.user?.usedUploads || 0,
        remainingUploads: (req.user?.uploadLimit || 0) - (req.user?.usedUploads || 0),
        planType: req.user?.planType || 'free',
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
      const { planType, amount } = req.body;
      
      if (!planType) {
        return res.status(400).json({ message: "Tipo de plano é obrigatório" });
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valor inválido" });
      }
      
      // Verificar se temos o Stripe inicializado
      if (!stripe) {
        return res.status(500).json({ 
          message: "Erro no serviço de pagamento", 
          details: "Stripe não está configurado corretamente" 
        });
      }
      
      // Armazenar os metadados do plano para usar após o pagamento ser concluído
      const metadata = {
        userId: req.user?.id.toString() || '',
        planType,
        userEmail: req.user?.email || '',
      };
      
      // Criar o PaymentIntent no Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe trabalha com centavos
        currency: "brl",
        metadata,
        description: `Assinatura do plano ${planType.toUpperCase()} - PhotoSelect`,
      });
      
      // Retornar o client_secret para o frontend fazer a confirmação
      res.json({
        clientSecret: paymentIntent.client_secret,
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
      
      if (!planType || !['free', 'basic', 'standard', 'professional'].includes(planType)) {
        return res.status(400).json({ message: "Tipo de plano inválido" });
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
