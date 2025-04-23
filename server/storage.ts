import { 
  users, type User, type InsertUser, 
  projects, type Project, type InsertProject, 
  type WebhookPayload, type SubscriptionWebhookPayload, 
  type Photo, SUBSCRIPTION_PLANS 
} from "@shared/schema";
import { nanoid } from "nanoid";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

// Memory storage implementation
import session from "express-session";
import createMemoryStore from "memorystore";
// Import connect-pg-simple for PostgreSQL session store
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySubscriptionId(subscriptionId: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Subscription methods
  handleWebhookEvent(payload: WebhookPayload): Promise<User | undefined>;
  handleStripeWebhook(payload: SubscriptionWebhookPayload): Promise<User | undefined>;
  updateUserSubscription(userId: number, planType: string): Promise<User | undefined>;
  updateStripeInfo(userId: number, customerId: string, subscriptionId: string): Promise<User | undefined>;
  
  // Upload management methods
  checkUploadLimit(userId: number, count: number): Promise<boolean>;
  updateUploadUsage(userId: number, addCount: number): Promise<User | undefined>;
  
  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjects(photographerId?: number): Promise<Project[]>;
  createProject(project: InsertProject, photos: Photo[]): Promise<Project>;
  updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined>;
  finalizeProjectSelection(id: number, selectedPhotos: string[]): Promise<Project | undefined>;
  archiveProject(id: number): Promise<Project | undefined>;
  reopenProject(id: number): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private userId: number;
  private projectId: number;
  public sessionStore: any;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.userId = 1;
    this.projectId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours to clean expired sessions
      stale: false, // Do not delete stale sessions
      ttl: 7 * 24 * 60 * 60 // 7 days TTL (matches cookie maxAge)
    });
    
    // Create a default admin user for testing
    const adminUser: User = {
      id: this.userId++,
      name: "Admin",
      email: "admin@studio.com",
      password: "admin123", // Plain password for the admin account
      role: "admin",
      status: "active",
      createdAt: new Date(),
      planType: "professional",
      uploadLimit: -1, // unlimited uploads
      usedUploads: 0,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      subscriptionStatus: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscription_id: null,
      lastEvent: null
    };
    
    this.users.set(adminUser.id, adminUser);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log(`Buscando usuário com email: ${email}`);
    console.log(`Usuários disponíveis:`, Array.from(this.users.values()).map(u => ({ id: u.id, email: u.email, role: u.role })));
    
    const user = Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
    
    console.log(`Usuário encontrado:`, user ? { id: user.id, email: user.email, role: user.role } : 'nenhum');
    return user;
  }

  async getUserBySubscriptionId(subscriptionId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.subscription_id === subscriptionId || user.stripeSubscriptionId === subscriptionId
    );
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.stripeCustomerId === customerId
    );
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userId++;
    const now = new Date();
    
    // Garantir que role e status estejam definidos
    const user: User = {
      id,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role || "photographer",
      status: userData.status || "active",
      createdAt: now,
      
      // Campos de assinatura
      planType: userData.planType || "free",
      uploadLimit: 0, // Será definido com base no plano
      usedUploads: 0,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      subscriptionStatus: "inactive",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscription_id: userData.subscription_id || null,
      
      lastEvent: null,
    };
    
    // Configurar o limite de uploads com base no plano gratuito
    if (user.planType === "free") {
      user.uploadLimit = SUBSCRIPTION_PLANS.FREE.uploadLimit;
    }
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const deleted = this.users.delete(id);
    return deleted;
  }
  
  // Métodos de gerenciamento de assinatura
  async updateUserSubscription(userId: number, planType: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    // Obter informações do plano
    let plan;
    switch(planType) {
      case "basic":
        plan = SUBSCRIPTION_PLANS.BASIC;
        break;
      case "standard":
        plan = SUBSCRIPTION_PLANS.STANDARD;
        break;
      case "professional":
        plan = SUBSCRIPTION_PLANS.PROFESSIONAL;
        break;
      default:
        plan = SUBSCRIPTION_PLANS.FREE;
    }
    
    // Definir datas de início e fim da assinatura
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // Assinatura válida por 1 mês
    
    // Atualizar usuário com os dados do plano
    const updatedUser = await this.updateUser(userId, {
      planType,
      uploadLimit: plan.uploadLimit,
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
      subscriptionStatus: "active",
      status: "active", // Garantir que o usuário esteja ativo
    });
    
    return updatedUser;
  }
  
  async updateStripeInfo(userId: number, customerId: string, subscriptionId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = await this.updateUser(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    });
    
    return updatedUser;
  }
  
  async handleStripeWebhook(payload: SubscriptionWebhookPayload): Promise<User | undefined> {
    // Encontrar usuário pelo customerId ou pelo email
    let user = await this.getUserByStripeCustomerId(payload.data.customer.id);
    
    if (!user) {
      // Tentar buscar por email se disponível
      const email = payload.data.customer.email;
      if (email) {
        user = await this.getUserByEmail(email);
      }
    }
    
    if (!user) return undefined;
    
    // Atualizar status da assinatura com base no evento
    let subscriptionStatus = user.subscriptionStatus;
    let userStatus = user.status;
    
    switch(payload.type) {
      case "subscription.created":
      case "subscription.updated":
        if (payload.data.subscription.status === "active") {
          subscriptionStatus = "active";
          userStatus = "active";
        } else if (payload.data.subscription.status === "canceled") {
          subscriptionStatus = "inactive";
          // Não alteramos o status do usuário quando a assinatura é cancelada
        }
        break;
      case "subscription.cancelled":
        subscriptionStatus = "inactive";
        break;
    }
    
    // Calcular data de expiração se disponível
    let subscriptionEndDate = user.subscriptionEndDate;
    if (payload.data.subscription.current_period_end) {
      subscriptionEndDate = new Date(payload.data.subscription.current_period_end * 1000);
    }
    
    // Atualizar o usuário
    const updatedUser = await this.updateUser(user.id, {
      subscriptionStatus,
      status: userStatus,
      subscriptionEndDate,
      stripeSubscriptionId: payload.data.subscription.id,
      lastEvent: {
        type: payload.type,
        timestamp: new Date().toISOString(),
      },
    });
    
    return updatedUser;
  }
  
  // Métodos de gerenciamento de uploads
  async checkUploadLimit(userId: number, count: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    // Check if subscription is active
    if (user.subscriptionStatus !== "active" && user.planType !== "free") {
      return false;
    }
    
    // If user has unlimited plan (uploadLimit < 0), always return true
    if (user.uploadLimit !== null && user.uploadLimit < 0) {
      return true;
    }
    
    // Check if user has available upload quota
    const uploadLimit = user.uploadLimit || 0;
    const usedUploads = user.usedUploads || 0;
    const availableUploads = uploadLimit - usedUploads;
    return availableUploads >= count;
  }
  
  async updateUploadUsage(userId: number, addCount: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    // Calculate new value for used uploads
    const currentUsed = user.usedUploads || 0;
    let newUsedUploads = currentUsed + addCount;
    
    // Ensure it never goes below zero
    if (newUsedUploads < 0) {
      newUsedUploads = 0;
    }
    
    console.log(`Upload usage updated for user ${userId}: ${currentUsed} → ${newUsedUploads} (added ${addCount})`);
    
    // Update user
    const updatedUser = await this.updateUser(userId, {
      usedUploads: newUsedUploads,
    });
    
    return updatedUser;
  }

  async handleWebhookEvent(payload: WebhookPayload): Promise<User | undefined> {
    // Try to find user by email or subscription_id
    let user = await this.getUserByEmail(payload.email);
    
    if (!user && payload.subscription_id) {
      user = await this.getUserBySubscriptionId(payload.subscription_id);
    }
    
    if (!user) return undefined;
    
    // Update user status based on event type
    let status = user.status;
    
    switch (payload.type) {
      case "payment.approved":
        status = "active";
        break;
      case "payment.failed":
        status = "suspended";
        break;
      case "subscription.canceled":
        status = "canceled";
        break;
    }
    
    // Update the user with new status and event
    const updatedUser = await this.updateUser(user.id, {
      status,
      subscription_id: payload.subscription_id || user.subscription_id,
      lastEvent: {
        type: payload.type,
        timestamp: payload.timestamp,
      },
    });
    
    return updatedUser;
  }

  // Project methods
  async getProject(id: number | string): Promise<Project | undefined> {
    console.log(`MemStorage: Buscando projeto ID=${id}`);
    console.log(`MemStorage: Projetos disponíveis: ${Array.from(this.projects.keys()).join(", ")}`);
    
    let project: Project | undefined;
    
    // If we got a numeric ID, try to fetch directly
    if (typeof id === 'number') {
      project = this.projects.get(id);
    } else {
      // If we got a string, it might be a publicId
      // First check if it's a numeric string we can convert to a number
      const numericId = parseInt(id);
      if (!isNaN(numericId)) {
        project = this.projects.get(numericId);
      }
      
      // If not found, try to find by publicId
      if (!project) {
        const allProjects = Array.from(this.projects.values());
        project = allProjects.find(p => p.publicId === id);
        console.log(`MemStorage: Buscando por publicId="${id}", encontrado: ${!!project}`);
      }
    }
    
    if (project) {
      console.log(`MemStorage: Projeto encontrado: ${project.name}`);
    } else {
      console.log(`MemStorage: Projeto ID=${id} não encontrado`);
      
      // Não inicializamos mais projetos de exemplo automaticamente
      if (this.projects.size === 0) {
        console.log("MemStorage: Nenhum projeto encontrado e nenhum exemplo será criado.");
        return undefined;
      }
    }
    
    return project;
  }
  
  // Método auxiliar para inicializar dados de exemplo
  private initializeExampleProjects(): void {
    // No example projects will be initialized
    // Each user will start with an empty project list
    this.projectId = 1;
    console.log("MemStorage: No example projects will be created. Users will start with an empty list.");
  }

  async getProjects(photographerId?: number): Promise<Project[]> {
    if (photographerId) {
      return Array.from(this.projects.values()).filter(
        (project) => project.photographerId === photographerId
      );
    }
    return Array.from(this.projects.values());
  }

  async createProject(projectData: InsertProject, photos: Photo[]): Promise<Project> {
    const id = this.projectId++;
    const now = new Date();
    
    // Process photos if any
    const processedPhotos = photos.map(photo => ({
      ...photo,
      id: nanoid(),
    }));
    
    const project: Project = {
      id,
      publicId: projectData.publicId, // Use the provided publicId
      name: projectData.name,
      status: projectData.status || "pending",
      createdAt: now,
      clientName: projectData.clientName,
      clientEmail: projectData.clientEmail,
      photographerId: projectData.photographerId,
      photos: processedPhotos,
      selectedPhotos: []
    };
    
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject = { ...project, ...projectData };
    this.projects.set(id, updatedProject);
    
    return updatedProject;
  }

  async finalizeProjectSelection(id: number, selectedPhotos: string[]): Promise<Project | undefined> {
    console.log(`MemStorage: Finalizando seleção para projeto ID=${id}, fotos selecionadas: ${selectedPhotos.length}`);
    
    // Step 1: Find the project
    let projectToUpdate = this.projects.get(id);
    let projectId = id;
    
    // If project not found directly, try to find by ID as string
    if (!projectToUpdate) {
      console.log(`MemStorage: Projeto ID=${id} não encontrado diretamente, buscando de outra forma`);
      
      const allProjects = Array.from(this.projects.values());
      const foundProject = allProjects.find(p => p.id.toString() === id.toString());
      
      if (!foundProject) {
        console.log(`MemStorage: Projeto ID=${id} não encontrado em nenhum formato`);
        return undefined;
      }
      
      projectToUpdate = foundProject;
      projectId = foundProject.id;
      console.log(`MemStorage: Projeto encontrado com ID=${projectId}`);
    }
    
    // Step 2: Create a new object with updated properties
    const updatedProject = {
      ...projectToUpdate,
      selectedPhotos,
      status: "reviewed" // This is the critical change - using "reviewed" not "completed"
    };
    
    // Step 3: Update the photos to mark selected ones
    if (updatedProject.photos) {
      updatedProject.photos = updatedProject.photos.map(photo => ({
        ...photo,
        selected: selectedPhotos.includes(photo.id)
      }));
    }
    
    // Step 4: Save back to the collection
    this.projects.set(projectId, updatedProject);
    
    // Step 5: Verify the update was successful by reading it back
    const verifiedProject = this.projects.get(projectId);
    console.log(`MemStorage: Projeto ID=${projectId} atualizado para status="${verifiedProject?.status}"`);
    
    // Calculate how many photos were selected
    const selecionadas = selectedPhotos.length;
    console.log(`MemStorage: ${selecionadas} fotos foram selecionadas`);
    
    return updatedProject;
  }

  async archiveProject(id: number): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject = { ...project, status: "archived" };
    this.projects.set(id, updatedProject);
    
    return updatedProject;
  }

  async reopenProject(id: number): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject = { ...project, status: "reopened" };
    this.projects.set(id, updatedProject);
    
    return updatedProject;
  }
  
  // Método para deletar um projeto
  async deleteProject(id: number): Promise<boolean> {
    console.log(`MemStorage: Tentando deletar projeto ID=${id}`);
    const project = this.projects.get(id);
    
    if (!project) {
      console.log(`MemStorage: Projeto ID=${id} não encontrado para deleção`);
      return false;
    }
    
    // Get the photographer ID and photo count before deleting the project
    const photographerId = project.photographerId;
    const photoCount = project.photos ? project.photos.length : 0;
    
    // Delete the project from storage
    const deleted = this.projects.delete(id);
    console.log(`MemStorage: Projeto ID=${id} ${deleted ? 'deletado com sucesso' : 'falha ao deletar'}`);
    
    // If the project was successfully deleted and it had photos, update the photographer's upload usage
    if (deleted && photoCount > 0) {
      console.log(`MemStorage: Atualizando contador de uploads para o fotógrafo ID=${photographerId}, reduzindo ${photoCount} fotos`);
      // Use negative photoCount to reduce the usage
      await this.updateUploadUsage(photographerId, -photoCount);
    }
    
    return deleted;
  }
}

// Implementação do armazenamento em PostgreSQL
export class DatabaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session',
      schemaName: 'public'
    });
    
    // Criar usuário admin inicial se não existir
    this.initializeAdminUser();
  }

  private async initializeAdminUser() {
    try {
      // Verificar se já existe um usuário admin
      const adminUser = await this.getUserByEmail("admin@studio.com");
      
      if (!adminUser) {
        console.log("Criando usuário admin padrão...");
        
        // Criar usuário admin padrão
        await this.createUser({
          name: "Admin",
          email: "admin@studio.com",
          password: "admin123",
          role: "admin",
          status: "active",
          planType: "professional",
        });
        
        console.log("Usuário admin criado com sucesso!");
      } else {
        console.log("Usuário admin já existe.");
      }
    } catch (error) {
      console.error("Erro ao inicializar usuário admin:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário por ID:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log(`Buscando usuário com email: ${email}`);
      const [user] = await db.select().from(users).where(eq(users.email, email));
      console.log(`Usuário encontrado:`, user ? { id: user.id, email: user.email, role: user.role } : 'nenhum');
      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário por email:", error);
      return undefined;
    }
  }

  async getUserBySubscriptionId(subscriptionId: string): Promise<User | undefined> {
    try {
      // Busca por subscription_id ou stripeSubscriptionId
      const [user] = await db
        .select()
        .from(users)
        .where(
          eq(users.stripeSubscriptionId, subscriptionId)
        );
      
      if (!user) {
        // Tenta com o campo antigo subscription_id se não encontrou pelo novo
        const [legacyUser] = await db
          .select()
          .from(users)
          .where(
            eq(users.subscription_id, subscriptionId)
          );
        return legacyUser;
      }
      
      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário por subscription ID:", error);
      return undefined;
    }
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId));
      
      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário por customer ID:", error);
      return undefined;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(desc(users.createdAt));
    } catch (error) {
      console.error("Erro ao buscar todos os usuários:", error);
      return [];
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      // Garantir que role e status estejam definidos
      const userToCreate: any = {
        ...userData,
        role: userData.role || "photographer",
        status: userData.status || "active",
        planType: userData.planType || "free",
        usedUploads: 0,
        lastEvent: null
      };
      
      // Configurar o limite de uploads com base no plano gratuito
      if (userToCreate.planType === "free") {
        userToCreate.uploadLimit = SUBSCRIPTION_PLANS.FREE.uploadLimit;
      }
      
      // Inserir o usuário no banco de dados
      const [createdUser] = await db.insert(users).values(userToCreate).returning();
      
      return createdUser;
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      return false;
    }
  }
  
  // Métodos de gerenciamento de assinatura
  async updateUserSubscription(userId: number, planType: string): Promise<User | undefined> {
    try {
      // Obter informações do plano
      let plan;
      switch(planType) {
        case "basic":
          plan = SUBSCRIPTION_PLANS.BASIC;
          break;
        case "standard":
          plan = SUBSCRIPTION_PLANS.STANDARD;
          break;
        case "professional":
          plan = SUBSCRIPTION_PLANS.PROFESSIONAL;
          break;
        default:
          plan = SUBSCRIPTION_PLANS.FREE;
      }
      
      // Definir datas de início e fim da assinatura
      const now = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // Assinatura válida por 1 mês
      
      // Atualizar usuário com os dados do plano
      const [updatedUser] = await db
        .update(users)
        .set({
          planType,
          uploadLimit: plan.uploadLimit,
          subscriptionStartDate: now,
          subscriptionEndDate: endDate,
          subscriptionStatus: "active",
          status: "active", // Garantir que o usuário esteja ativo
        })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Erro ao atualizar assinatura do usuário:", error);
      return undefined;
    }
  }
  
  async updateStripeInfo(userId: number, customerId: string, subscriptionId: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Erro ao atualizar informações do Stripe:", error);
      return undefined;
    }
  }
  
  async handleStripeWebhook(payload: SubscriptionWebhookPayload): Promise<User | undefined> {
    try {
      // Encontrar usuário pelo customerId ou pelo email
      let user = await this.getUserByStripeCustomerId(payload.data.customer.id);
      
      if (!user) {
        // Tentar buscar por email se disponível
        const email = payload.data.customer.email;
        if (email) {
          user = await this.getUserByEmail(email);
        }
      }
      
      if (!user) return undefined;
      
      // Atualizar status da assinatura com base no evento
      let subscriptionStatus = user.subscriptionStatus;
      let userStatus = user.status;
      
      switch(payload.type) {
        case "subscription.created":
        case "subscription.updated":
          if (payload.data.subscription.status === "active") {
            subscriptionStatus = "active";
            userStatus = "active";
          } else if (payload.data.subscription.status === "canceled") {
            subscriptionStatus = "inactive";
            // Não alteramos o status do usuário quando a assinatura é cancelada
          }
          break;
        case "subscription.cancelled":
          subscriptionStatus = "inactive";
          break;
      }
      
      // Calcular data de expiração se disponível
      let subscriptionEndDate = user.subscriptionEndDate;
      if (payload.data.subscription.current_period_end) {
        subscriptionEndDate = new Date(payload.data.subscription.current_period_end * 1000);
      }
      
      // Atualizar o usuário
      const [updatedUser] = await db
        .update(users)
        .set({
          subscriptionStatus,
          status: userStatus,
          subscriptionEndDate,
          stripeSubscriptionId: payload.data.subscription.id,
          lastEvent: {
            type: payload.type,
            timestamp: new Date().toISOString(),
          },
        })
        .where(eq(users.id, user.id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Erro ao processar webhook do Stripe:", error);
      return undefined;
    }
  }
  
  // Métodos de gerenciamento de uploads
  async checkUploadLimit(userId: number, count: number): Promise<boolean> {
    try {
      // Buscar usuário
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return false;
      
      // Check if subscription is active
      if (user.subscriptionStatus !== "active" && user.planType !== "free") {
        return false;
      }
      
      // If user has unlimited plan (uploadLimit < 0), always return true
      if (user.uploadLimit !== null && user.uploadLimit < 0) {
        return true;
      }
      
      // Check if user has available upload quota
      const uploadLimit = user.uploadLimit || 0;
      const usedUploads = user.usedUploads || 0;
      const availableUploads = uploadLimit - usedUploads;
      return availableUploads >= count;
    } catch (error) {
      console.error("Erro ao verificar limite de uploads:", error);
      return false;
    }
  }
  
  async updateUploadUsage(userId: number, addCount: number): Promise<User | undefined> {
    try {
      // Buscar usuário atual para calcular o novo valor
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return undefined;
      
      // Calculate new value for used uploads
      const currentUsed = user.usedUploads || 0;
      let newUsedUploads = currentUsed + addCount;
      
      // Ensure it never goes below zero
      if (newUsedUploads < 0) {
        newUsedUploads = 0;
      }
      
      console.log(`Upload usage updated for user ${userId}: ${currentUsed} → ${newUsedUploads} (added ${addCount})`);
      
      // Update user
      const [updatedUser] = await db
        .update(users)
        .set({ usedUploads: newUsedUploads })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Erro ao atualizar uso de uploads:", error);
      return undefined;
    }
  }

  async handleWebhookEvent(payload: WebhookPayload): Promise<User | undefined> {
    try {
      // Try to find user by email or subscription_id
      let user = await this.getUserByEmail(payload.email);
      
      if (!user && payload.subscription_id) {
        user = await this.getUserBySubscriptionId(payload.subscription_id);
      }
      
      if (!user) return undefined;
      
      // Update user status based on event type
      let status = user.status;
      
      switch (payload.type) {
        case "payment.approved":
          status = "active";
          break;
        case "payment.failed":
          status = "suspended";
          break;
        case "subscription.canceled":
          status = "canceled";
          break;
      }
      
      // Update the user with new status and event
      const [updatedUser] = await db
        .update(users)
        .set({
          status,
          subscription_id: payload.subscription_id || user.subscription_id,
          lastEvent: {
            type: payload.type,
            timestamp: payload.timestamp,
          },
        })
        .where(eq(users.id, user.id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Erro ao processar evento de webhook:", error);
      return undefined;
    }
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    try {
      console.log(`DatabaseStorage: Buscando projeto ID=${id}`);
      
      // Se id for number, busca direto pelo ID
      if (typeof id === 'number') {
        const [project] = await db.select().from(projects).where(eq(projects.id, id));
        return project;
      }
      
      // Se id for string e for numérico, converte para number e busca
      const numericId = parseInt(id.toString());
      if (!isNaN(numericId)) {
        const [project] = await db.select().from(projects).where(eq(projects.id, numericId));
        if (project) return project;
      }
      
      // Se não encontrou por ID numérico, tenta por publicId
      const [project] = await db.select().from(projects).where(eq(projects.publicId, id.toString()));
      
      if (project) {
        console.log(`DatabaseStorage: Projeto encontrado: ${project.name}`);
      } else {
        console.log(`DatabaseStorage: Projeto ID=${id} não encontrado`);
      }
      
      return project;
    } catch (error) {
      console.error("Erro ao buscar projeto:", error);
      return undefined;
    }
  }

  async getProjects(photographerId?: number): Promise<Project[]> {
    try {
      if (photographerId) {
        return await db
          .select()
          .from(projects)
          .where(eq(projects.photographerId, photographerId))
          .orderBy(desc(projects.createdAt));
      }
      
      return await db
        .select()
        .from(projects)
        .orderBy(desc(projects.createdAt));
    } catch (error) {
      console.error("Erro ao buscar projetos:", error);
      return [];
    }
  }

  async createProject(projectData: InsertProject, photos: Photo[]): Promise<Project> {
    try {
      // Process photos if any
      const processedPhotos = photos.map(photo => ({
        ...photo,
        id: nanoid(),
      }));
      
      // Inserir o projeto no banco
      const [createdProject] = await db
        .insert(projects)
        .values({
          ...projectData,
          photos: processedPhotos,
          selectedPhotos: [],
        })
        .returning();
      
      return createdProject;
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
      throw error;
    }
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined> {
    try {
      const [updatedProject] = await db
        .update(projects)
        .set(projectData)
        .where(eq(projects.id, id))
        .returning();
      
      return updatedProject;
    } catch (error) {
      console.error("Erro ao atualizar projeto:", error);
      return undefined;
    }
  }

  async finalizeProjectSelection(id: number, selectedPhotos: string[]): Promise<Project | undefined> {
    try {
      console.log(`DatabaseStorage: Finalizando seleção para projeto ID=${id}, fotos selecionadas: ${selectedPhotos.length}`);
      
      const [updatedProject] = await db
        .update(projects)
        .set({
          selectedPhotos,
          status: "reviewed", // Atualiza o status para revisado
        })
        .where(eq(projects.id, id))
        .returning();
      
      return updatedProject;
    } catch (error) {
      console.error("Erro ao finalizar seleção de fotos:", error);
      return undefined;
    }
  }

  async archiveProject(id: number): Promise<Project | undefined> {
    try {
      const [archivedProject] = await db
        .update(projects)
        .set({ status: "archived" })
        .where(eq(projects.id, id))
        .returning();
      
      return archivedProject;
    } catch (error) {
      console.error("Erro ao arquivar projeto:", error);
      return undefined;
    }
  }

  async reopenProject(id: number): Promise<Project | undefined> {
    try {
      const [reopenedProject] = await db
        .update(projects)
        .set({ status: "reopened" })
        .where(eq(projects.id, id))
        .returning();
      
      return reopenedProject;
    } catch (error) {
      console.error("Erro ao reabrir projeto:", error);
      return undefined;
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    try {
      await db.delete(projects).where(eq(projects.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      return false;
    }
  }
}

// Usar o armazenamento PostgreSQL em vez do armazenamento em memória
export const storage = new DatabaseStorage();

// Comentado para referência:
// export const storage = new MemStorage();
