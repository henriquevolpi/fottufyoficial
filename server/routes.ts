import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertProjectSchema, WebhookPayload, SUBSCRIPTION_PLANS } from "@shared/schema";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { setupAuth } from "./auth";
import Stripe from 'stripe';

// Basic authentication middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
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
        projects = await storage.getProjects(req.user.id);
      } else {
        // Usuário não autenticado
        return res.status(401).json({ message: "Não autorizado" });
      }
      
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
      
      // Primeiro tentamos buscar pelo ID numérico (formato backend)
      let projectId = parseInt(idParam);
      let project = !isNaN(projectId) ? await storage.getProject(projectId) : null;
      
      // Se não encontrar, tenta buscar nos projetos do localStorage (formato frontend)
      if (!project) {
        console.log(`Projeto com ID numérico ${projectId} não encontrado, verificando projetos do localStorage`);
        
        // Buscar todos os projetos e tentar encontrar um com o ID correspondente
        const allProjects = await storage.getProjects();
        project = allProjects.find(p => p.id.toString() === idParam);
        
        // Se ainda não encontrou, tentamos buscar como um timestamp
        if (!project) {
          const timestampId = parseInt(idParam);
          if (!isNaN(timestampId)) {
            console.log(`Tentando buscar como timestamp: ${timestampId}`);
            project = allProjects.find(p => p.id === timestampId);
          }
        }
      }
      
      if (!project) {
        console.log(`Projeto com ID ${idParam} não encontrado em nenhum formato`);
        return res.status(404).json({ message: "Project not found" });
      }
      
      console.log(`Projeto encontrado: ${project.name}`);
      
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
  app.post("/api/projects", authenticate, requireActiveUser, async (req: Request, res: Response) => {
    try {
      console.log("Recebendo solicitação para criar projeto", req.body);
      
      // No ambiente Replit, podemos não ter acesso a um FormData completo
      // então vamos processar o que for possível
      const { name, clientName, clientEmail, photographerId, photos } = req.body;
      
      console.log("Dados do projeto:", { name, clientName, clientEmail, photographerId });
      
      // Validate project data
      const projectData = insertProjectSchema.parse({
        name,
        clientName,
        clientEmail,
        photographerId: parseInt(photographerId),
      });
      
      // Check if photographer ID matches authenticated user
      if (req.user && (projectData.photographerId !== req.user.id && req.user.role !== "admin")) {
        return res.status(403).json({ message: "Cannot create projects for other photographers" });
      }
      
      // Processar fotos
      let processedPhotos = [];
      
      // Se recebemos um array de fotos do frontend (formato JSON)
      if (Array.isArray(photos)) {
        console.log(`Processando ${photos.length} fotos enviadas como JSON`);
        processedPhotos = photos.map(photo => ({
          id: '', // Será definido pelo storage
          url: photo.url,
          filename: photo.filename,
        }));
      }
      // Fotos de amostra como fallback (apenas se não houver fotos enviadas)
      else {
        console.log("Usando fotos de amostra como fallback");
        processedPhotos = [
          { 
            id: '', // Will be set by storage
            url: 'https://images.unsplash.com/photo-1529634597503-139d3726fed5', 
            filename: 'sample_photo_1.jpg' 
          },
          { 
            id: '', // Will be set by storage
            url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b', 
            filename: 'sample_photo_2.jpg' 
          },
          { 
            id: '', // Will be set by storage
            url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6', 
            filename: 'sample_photo_3.jpg' 
          },
          { 
            id: '', // Will be set by storage
            url: 'https://images.unsplash.com/photo-1519741497674-611481863552', 
            filename: 'sample_photo_4.jpg' 
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
            message: "Limite de uploads atingido", 
            error: "UPLOAD_LIMIT_REACHED",
            details: "Você atingiu o limite de uploads do seu plano atual. Faça upgrade para continuar enviando fotos."
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
      
      // Primeiro tentamos buscar pelo ID numérico (formato backend)
      let projectId = parseInt(idParam);
      let project = !isNaN(projectId) ? await storage.getProject(projectId) : null;
      
      // Se não encontrar, tenta buscar nos projetos do localStorage (formato frontend)
      if (!project) {
        console.log(`Projeto com ID numérico ${projectId} não encontrado, verificando projetos do localStorage`);
        
        // Buscar todos os projetos e tentar encontrar um com o ID correspondente
        const allProjects = await storage.getProjects();
        project = allProjects.find(p => p.id.toString() === idParam);
        
        // Se ainda não encontrou, tentamos buscar como um timestamp
        if (!project) {
          const timestampId = parseInt(idParam);
          if (!isNaN(timestampId)) {
            console.log(`Tentando buscar como timestamp: ${timestampId}`);
            project = allProjects.find(p => p.id === timestampId);
            
            if (project) {
              projectId = project.id;
            }
          }
        } else {
          projectId = project.id;
        }
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
  app.post("/api/projects/:id/photos", authenticate, requireActiveUser, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const { photos } = req.body;
      
      if (!Array.isArray(photos) || photos.length === 0) {
        return res.status(400).json({ message: "No photos provided" });
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
      
      // Verificar o limite de upload do usuário (se não for admin)
      if (req.user && req.user.role !== "admin") {
        const canUpload = await storage.checkUploadLimit(req.user.id, photos.length);
        if (!canUpload) {
          return res.status(403).json({ message: "Upload limit exceeded" });
        }
        
        // Atualizar o uso de upload
        await storage.updateUploadUsage(req.user.id, photos.length);
      }
      
      // Em um sistema real, aqui processaríamos os uploads para armazenamento em nuvem
      // Neste exemplo, apenas atualizamos o projeto com as novas fotos
      const formattedPhotos = photos.map((photo: any) => ({
        id: photo.id,
        url: photo.url,
        filename: photo.filename
      }));
      
      // Atualizar o projeto com as novas fotos
      const updatedProject = await storage.updateProject(projectId, {
        photos: [...(project.photos || []), ...formattedPhotos]
      });
      
      if (!updatedProject) {
        return res.status(400).json({ message: "Failed to add photos to project" });
      }
      
      res.status(200).json({ 
        message: "Photos added successfully", 
        count: photos.length 
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
