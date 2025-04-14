import { 
  users, type User, type InsertUser, 
  projects, type Project, type InsertProject, 
  type WebhookPayload, type SubscriptionWebhookPayload, 
  type Photo, SUBSCRIPTION_PLANS 
} from "@shared/schema";
import { nanoid } from "nanoid";

// Memory storage implementation
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
      checkPeriod: 86400000 // limpar sessões expiradas a cada 24 horas
    });
    
    // Não criamos mais usuário admin por padrão
    // Usuários serão criados apenas via registro
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
    
    // Verificar se assinatura está ativa
    if (user.subscriptionStatus !== "active" && user.planType !== "free") {
      return false;
    }
    
    // Se o usuário tem plano ilimitado (uploadLimit < 0), sempre retorna true
    if (user.uploadLimit < 0) {
      return true;
    }
    
    // Verificar se o usuário tem limite disponível
    const uploadLimit = user.uploadLimit || 0;
    const usedUploads = user.usedUploads || 0;
    const availableUploads = uploadLimit - usedUploads;
    return availableUploads >= count;
  }
  
  async updateUploadUsage(userId: number, addCount: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    // Calcular novo valor de uploads usados
    const currentUsed = user.usedUploads || 0;
    let newUsedUploads = currentUsed + addCount;
    
    // Garantir que não fique negativo
    if (newUsedUploads < 0) {
      newUsedUploads = 0;
    }
    
    // Atualizar usuário
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
  async getProject(id: number): Promise<Project | undefined> {
    console.log(`MemStorage: Buscando projeto ID=${id}`);
    console.log(`MemStorage: Projetos disponíveis: ${Array.from(this.projects.keys()).join(", ")}`);
    
    const project = this.projects.get(id);
    
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
    const exampleProjects = [
      {
        id: 1,
        name: "Casamento Ana e Pedro",
        status: "pending",
        createdAt: new Date("2023-05-15"),
        clientName: "Ana Silva",
        clientEmail: "ana@example.com",
        photographerId: 1,
        photos: Array(5).fill(null).map((_, i) => ({
          id: `foto-casamento-${i+1}`,
          url: `https://source.unsplash.com/random/800x600?wedding&sig=${i}`,
          filename: `DSC_${1000 + i}.jpg`
        })),
        selectedPhotos: []
      },
      {
        id: 2,
        name: "Ensaio de 15 Anos - Júlia",
        status: "pending",
        createdAt: new Date("2023-06-20"),
        clientName: "Júlia Mendes",
        clientEmail: "julia@example.com",
        photographerId: 1,
        photos: Array(5).fill(null).map((_, i) => ({
          id: `foto-15anos-${i+1}`,
          url: `https://source.unsplash.com/random/800x600?portrait&sig=${i}`,
          filename: `IMG_${2000 + i}.jpg`
        })),
        selectedPhotos: []
      }
    ];
    
    exampleProjects.forEach(project => {
      this.projects.set(project.id, project);
    });
    
    this.projectId = Math.max(...exampleProjects.map(p => p.id)) + 1;
    console.log(`MemStorage: ${exampleProjects.length} projetos de exemplo criados. Próximo ID: ${this.projectId}`);
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
    const project = this.projects.get(id);
    if (!project) return undefined;

    // Update project with selected photos and set status to reviewed
    const updatedProject = {
      ...project,
      selectedPhotos,
      status: "reviewed",
    };
    
    this.projects.set(id, updatedProject);
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
    
    const deleted = this.projects.delete(id);
    console.log(`MemStorage: Projeto ID=${id} ${deleted ? 'deletado com sucesso' : 'falha ao deletar'}`);
    
    return deleted;
  }
}

export const storage = new MemStorage();
