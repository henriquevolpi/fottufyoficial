import { 
  users, type User, type InsertUser, 
  projects, type Project, type InsertProject,
  photos, photoComments,
  type WebhookPayload, type SubscriptionWebhookPayload, 
  type Photo, type PhotoComment, type InsertPhotoComment, SUBSCRIPTION_PLANS 
} from "@shared/schema";
import { nanoid } from "nanoid";
import { db } from "./db";
import { eq, and, desc, asc, count, inArray, sql, lt, ne, gte, isNull, or } from "drizzle-orm";

// Memory storage implementation
import session from "express-session";
import createMemoryStore from "memorystore";
// Import connect-pg-simple for PostgreSQL session store
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

/**
 * Classe para gerenciar cache de dados em memória com expiração
 * Implementa limpeza inteligente para evitar vazamentos de memória
 */
class MemoryCacheManager<K, V> {
  // Map principal para armazenar os dados
  private cache: Map<K, V>;
  // Map para rastrear quando cada item foi acessado pela última vez
  private lastAccessed: Map<K, number>;
  // Map para rastrear quando cada item foi criado
  private createdAt: Map<K, number>;
  // Limite de tamanho do cache
  private maxSize: number;
  // Tempo de expiração em ms (padrão: 1 hora)
  private expirationTime: number;
  // ID do intervalo de limpeza
  private cleanupIntervalId: NodeJS.Timeout | null;
  // Frequência da limpeza em ms (padrão: 5 minutos)
  private cleanupFrequency: number;
  // Nome para identificação nos logs
  private name: string;
  // Contador de acessos para estatísticas
  private hitCount: number = 0;
  private missCount: number = 0;
  // Lista de IDs que nunca devem ser removidos do cache (ex: admin)
  private protectedKeys: Set<K>;

  constructor(name: string, options: {
    maxSize?: number,
    expirationTime?: number,
    cleanupFrequency?: number,
    protectedKeys?: K[]
  } = {}) {
    this.cache = new Map<K, V>();
    this.lastAccessed = new Map<K, number>();
    this.createdAt = new Map<K, number>();
    this.name = name;
    this.maxSize = options.maxSize || 1000; // Padrão: máximo de 1000 itens
    this.expirationTime = options.expirationTime || 60 * 60 * 1000; // Padrão: 1 hora
    this.cleanupFrequency = options.cleanupFrequency || 5 * 60 * 1000; // Padrão: 5 minutos
    this.cleanupIntervalId = null;
    this.protectedKeys = new Set(options.protectedKeys || []);
    
    // Iniciar o intervalo de limpeza automaticamente
    this.startCleanupInterval();
    
    console.log(`[MEMORY] Cache '${this.name}' iniciado. Limite: ${this.maxSize} itens, Expiração: ${this.expirationTime/60000} minutos`);
  }
  
  /**
   * Obtém um item do cache
   * Atualiza o timestamp de último acesso
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    
    if (item !== undefined) {
      // Atualizar o timestamp de último acesso
      this.lastAccessed.set(key, Date.now());
      this.hitCount++;
      return item;
    }
    
    this.missCount++;
    return undefined;
  }
  
  /**
   * Verifica se um item existe no cache
   * Não atualiza o timestamp de último acesso
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  /**
   * Adiciona ou atualiza um item no cache
   * Se o cache atingir o tamanho máximo, remove o item menos recentemente acessado
   */
  set(key: K, value: V): void {
    const now = Date.now();
    
    // Se o item já existe, apenas atualiza
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.lastAccessed.set(key, now);
      return;
    }
    
    // Verificar se precisa liberar espaço antes de adicionar um novo item
    if (this.cache.size >= this.maxSize) {
      this.removeOldestItem();
    }
    
    // Adicionar o novo item
    this.cache.set(key, value);
    this.lastAccessed.set(key, now);
    this.createdAt.set(key, now);
  }
  
  /**
   * Remove um item do cache
   */
  delete(key: K): boolean {
    if (!this.cache.has(key)) return false;
    
    this.cache.delete(key);
    this.lastAccessed.delete(key);
    this.createdAt.delete(key);
    return true;
  }
  
  /**
   * Tamanho atual do cache
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Limpa todos os itens do cache, exceto os protegidos
   */
  clear(): void {
    // Preservar apenas itens protegidos
    for (const key of this.cache.keys()) {
      if (!this.protectedKeys.has(key)) {
        this.delete(key);
      }
    }
  }
  
  /**
   * Obtém todas as chaves do cache
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }
  
  /**
   * Obtém todos os valores do cache
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }
  
  /**
   * Obtém todos os itens do cache como array
   */
  entries(): Array<[K, V]> {
    return Array.from(this.cache.entries());
  }
  
  /**
   * Inicia o intervalo de limpeza automática
   */
  startCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.cleanupFrequency);
  }
  
  /**
   * Para o intervalo de limpeza
   */
  stopCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }
  
  /**
   * Limpa itens expirados do cache
   */
  cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, lastAccessed] of this.lastAccessed.entries()) {
      // Nunca remove itens protegidos
      if (this.protectedKeys.has(key)) {
        continue;
      }
      
      // Remover itens que não foram acessados recentemente
      if (now - lastAccessed > this.expirationTime) {
        this.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`[MEMORY] Cache '${this.name}': ${expiredCount} itens expirados removidos. Tamanho atual: ${this.cache.size}`);
    }
  }
  
  /**
   * Remove o item menos recentemente acessado
   * Não remove itens protegidos
   */
  private removeOldestItem(): void {
    let oldestKey: K | null = null;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.lastAccessed.entries()) {
      // Nunca remove itens protegidos
      if (this.protectedKeys.has(key)) {
        continue;
      }
      
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey !== null) {
      this.delete(oldestKey);
      console.log(`[MEMORY] Cache '${this.name}': Item mais antigo removido (ID=${oldestKey}). Último acesso há ${Math.round((Date.now() - oldestTime) / 60000)} minutos.`);
    }
  }
  
  /**
   * Retorna estatísticas do cache
   */
  getStats(): {
    size: number,
    maxSize: number,
    hits: number,
    misses: number,
    hitRatio: number,
    oldestItemAge: number
  } {
    let oldestTime = Infinity;
    const now = Date.now();
    
    for (const time of this.lastAccessed.values()) {
      if (time < oldestTime) {
        oldestTime = time;
      }
    }
    
    const oldestItemAge = oldestTime !== Infinity ? (now - oldestTime) / 1000 : 0;
    const totalRequests = this.hitCount + this.missCount;
    const hitRatio = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hitCount,
      misses: this.missCount,
      hitRatio: hitRatio,
      oldestItemAge: oldestItemAge
    };
  }
  
  /**
   * Adiciona uma chave à lista de protegidos
   */
  addProtectedKey(key: K): void {
    this.protectedKeys.add(key);
  }
  
  /**
   * Remove uma chave da lista de protegidos
   */
  removeProtectedKey(key: K): void {
    this.protectedKeys.delete(key);
  }
}

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
  
  // Automatic downgrade control methods
  schedulePendingDowngrade(userId: number, reason: string, originalPlan: string): Promise<User | undefined>;
  cancelPendingDowngrade(userId: number): Promise<User | undefined>;
  getUsersWithExpiredDowngrades(): Promise<User[]>;
  processExpiredDowngrades(): Promise<number>;
  
  // Upload management methods
  checkUploadLimit(userId: number, count: number): Promise<boolean>;
  updateUploadUsage(userId: number, addCount: number): Promise<User | undefined>;
  syncUsedUploads(userId: number): Promise<User | undefined>;
  
  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjects(photographerId?: number): Promise<Project[]>;
  createProject(project: InsertProject, photos: Photo[]): Promise<Project>;
  updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined>;
  updateProjectSelections(id: number, selectedPhotos: string[]): Promise<Project | undefined>;
  finalizeProjectSelection(id: number, selectedPhotos: string[]): Promise<Project | undefined>;
  archiveProject(id: number): Promise<Project | undefined>;
  reopenProject(id: number): Promise<Project | undefined>;
  updateProjectWatermark(id: number, showWatermark: boolean): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Photo comment methods
  createPhotoComment(comment: InsertPhotoComment): Promise<PhotoComment>;
  getPhotoComments(photoId: string): Promise<PhotoComment[]>;
  getProjectPhotoComments(projectId: string): Promise<PhotoComment[]>;
  markCommentsAsViewed(commentIds: string[]): Promise<void>;
  
  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: MemoryCacheManager<number, User>;
  private projects: MemoryCacheManager<number, Project>;
  private userId: number;
  private projectId: number;
  public sessionStore: any;

  constructor() {
    // Inicializar os gerenciadores de cache com configurações específicas
    this.users = new MemoryCacheManager<number, User>('users', {
      maxSize: 500,              // Máximo de 500 usuários em memória
      expirationTime: 2 * 60 * 60 * 1000, // 2 horas sem acesso para expirar
      cleanupFrequency: 10 * 60 * 1000,   // Limpar a cada 10 minutos
      protectedKeys: [1]         // Proteger o usuário admin (ID=1)
    });
    
    this.projects = new MemoryCacheManager<number, Project>('projects', {
      maxSize: 1000,             // Máximo de 1000 projetos em memória
      expirationTime: 60 * 60 * 1000, // 1 hora sem acesso para expirar
      cleanupFrequency: 5 * 60 * 1000 // Limpar a cada 5 minutos
    });
    
    this.userId = 1;
    this.projectId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours to clean expired sessions
      stale: false, // Do not delete stale sessions
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days TTL (matches cookie maxAge)
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
    
    // Adicionar o usuário admin como protegido (nunca será removido da memória)
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
    
    // Primeiro, normalizar o planType para UPPERCASE para facilitar a busca nos planos V2
    const planKey = planType.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS;
    
    // Verificar diretamente no esquema SUBSCRIPTION_PLANS
    let plan = SUBSCRIPTION_PLANS[planKey];
    
    // Se não encontrado, verifica os planos V2 ou planos legados
    if (!plan) {
      // Verificar se é um plano V2
      if (planType.includes('_v2')) {
        const upperPlanType = planType.toUpperCase();
        plan = SUBSCRIPTION_PLANS[upperPlanType as keyof typeof SUBSCRIPTION_PLANS];
      } else {
        // Usar o switch para planos legados
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
      }
    }
    
    console.log(`MemStorage: Atualizando assinatura: userId=${userId}, planType=${planType}, uploadLimit=${plan.uploadLimit}`);
    
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
    let planType = user.planType;
    let uploadLimit = user.uploadLimit;
    
    console.log(`MemStorage: Processando webhook Stripe: evento=${payload.type}, usuário=${user.id}, customer=${payload.data.customer.id}`);
    
    switch(payload.type) {
      case "subscription.created":
      case "subscription.updated":
        if (payload.data.subscription.status === "active") {
          subscriptionStatus = "active";
          userStatus = "active";
          
          // Verificar se há metadados com o tipo de plano
          const metadata = payload.data.subscription.metadata || {};
          if (metadata.planType) {
            planType = metadata.planType;
            
            // Obter o limite de upload correspondente ao plano
            const planKey = planType.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS;
            let plan = SUBSCRIPTION_PLANS[planKey];
            
            // Se não encontrado diretamente, verificar planos V2
            if (!plan && planType && planType.includes('_v2')) {
              const upperPlanType = planType.toUpperCase();
              plan = SUBSCRIPTION_PLANS[upperPlanType as keyof typeof SUBSCRIPTION_PLANS];
            }
            
            if (plan) {
              uploadLimit = plan.uploadLimit;
              console.log(`MemStorage: Atualizando plano via webhook: planType=${planType}, uploadLimit=${uploadLimit}`);
            }
          }
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
      planType,
      uploadLimit,
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
  
  async syncUsedUploads(userId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    // Get all projects for this user
    const userProjects = await this.getProjects(userId);
    
    // Count the total number of photos across all projects
    let totalPhotoCount = 0;
    for (const project of userProjects) {
      totalPhotoCount += project.photos ? project.photos.length : 0;
    }
    
    console.log(`Syncing usedUploads for user ${userId}: calculated ${totalPhotoCount} total photos`);
    
    // Update user with the accurate count
    const updatedUser = await this.updateUser(userId, {
      usedUploads: totalPhotoCount,
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
    console.log(`MemStorage: Projetos em cache: ${this.projects.size}`);
    
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
      
      // Se não encontrado no cache, e o ID é numérico, talvez precise ser carregado do banco de dados
      if (this.projects.size === 0) {
        console.log("MemStorage: Nenhum projeto em cache. Poderia buscar do banco de dados se necessário.");
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
  
  async updateProjectSelections(id: number, selectedPhotos: string[]): Promise<Project | undefined> {
    console.log(`MemStorage: Atualizando seleções temporárias para projeto ID=${id}, fotos selecionadas: ${selectedPhotos.length}`);
    
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
    
    // Step 2: Update the selected status of each photo
    const updatedPhotos = projectToUpdate.photos.map(photo => ({
      ...photo,
      selected: selectedPhotos.includes(photo.id)
    }));
    
    // Step 3: Create a new object with updated properties
    const updatedProject = {
      ...projectToUpdate,
      photos: updatedPhotos,
      // Don't update selectedPhotos array, which is only set when finalized
      status: projectToUpdate.status === "pending" && selectedPhotos.length > 0 ? "reviewed" : projectToUpdate.status
    };
    
    // Step 4: Save the updated project
    this.projects.set(projectId, updatedProject);
    
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
      status: "Completed" // Changed from "reviewed" to "Completed" for photographer dashboard
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

  async updateProjectWatermark(id: number, showWatermark: boolean): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject = { ...project, showWatermark };
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

  // ==================== Métodos de Controle Automático de Downgrade (MemStorage) ====================
  
  async schedulePendingDowngrade(userId: number, reason: string, originalPlan: string): Promise<User | undefined> {
    console.log(`MemStorage: schedulePendingDowngrade não implementado para usuário ID=${userId}`);
    return undefined;
  }

  async cancelPendingDowngrade(userId: number): Promise<User | undefined> {
    console.log(`MemStorage: cancelPendingDowngrade não implementado para usuário ID=${userId}`);
    return undefined;
  }

  async getUsersWithExpiredDowngrades(): Promise<User[]> {
    console.log(`MemStorage: getUsersWithExpiredDowngrades não implementado`);
    return [];
  }

  async processExpiredDowngrades(): Promise<number> {
    console.log(`MemStorage: processExpiredDowngrades não implementado`);
    return 0;
  }

  // Photo comment methods (placeholder implementations for MemStorage)
  async createPhotoComment(comment: InsertPhotoComment): Promise<PhotoComment> {
    // In memory storage - not implemented, return placeholder
    const newComment: PhotoComment = {
      id: `comment_${Date.now()}`,
      photoId: comment.photoId,
      clientName: comment.clientName,
      comment: comment.comment,
      createdAt: new Date(),
      isViewed: false
    };
    return newComment;
  }

  async getPhotoComments(photoId: string): Promise<PhotoComment[]> {
    // In memory storage - not implemented, return empty array
    return [];
  }

  async getProjectPhotoComments(projectId: string): Promise<PhotoComment[]> {
    // In memory storage - not implemented, return empty array
    return [];
  }

  async markCommentsAsViewed(commentIds: string[]): Promise<void> {
    // In memory storage - not implemented, no action needed
    return;
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
      schemaName: 'public',
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 dias em milissegundos (604800000 ms)
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
      // Normalize email to lowercase for case-insensitive comparison
      const normalizedEmail = email.toLowerCase();
      console.log(`Buscando usuário com email (normalizado): ${normalizedEmail}`);
      
      // Use SQL LOWER function to ensure case-insensitive comparison
      const [user] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = ${normalizedEmail}`);
      
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
      // Primeiro, normalizar o planType para UPPERCASE para facilitar a busca nos planos V2
      const planKey = planType.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS;
      
      // Verificar diretamente no esquema SUBSCRIPTION_PLANS
      let plan = SUBSCRIPTION_PLANS[planKey];
      
      // Se não encontrado, verifica os planos V2 ou planos legados
      if (!plan) {
        // Verificar se é um plano V2
        if (planType.includes('_v2')) {
          const upperPlanType = planType.toUpperCase();
          plan = SUBSCRIPTION_PLANS[upperPlanType as keyof typeof SUBSCRIPTION_PLANS];
        } else {
          // Usar o switch para planos legados
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
        }
      }
      
      // Log para debug
      console.log(`Atualizando assinatura: userId=${userId}, planType=${planType}, uploadLimit=${plan.uploadLimit}`);
      
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
      let planType = user.planType;
      let uploadLimit = user.uploadLimit;
      
      console.log(`Processando webhook Stripe: evento=${payload.type}, usuário=${user.id}, customer=${payload.data.customer.id}`);
      
      switch(payload.type) {
        case "subscription.created":
        case "subscription.updated":
          if (payload.data.subscription.status === "active") {
            subscriptionStatus = "active";
            userStatus = "active";
            
            // Verificar se há metadados com o tipo de plano
            const metadata = payload.data.subscription.metadata || {};
            if (metadata.planType) {
              planType = metadata.planType;
              
              // Obter o limite de upload correspondente ao plano
              const planKey = planType.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS;
              let plan = SUBSCRIPTION_PLANS[planKey];
              
              // Se não encontrado diretamente, verificar planos V2
              if (!plan && planType.includes('_v2')) {
                const upperPlanType = planType.toUpperCase();
                plan = SUBSCRIPTION_PLANS[upperPlanType as keyof typeof SUBSCRIPTION_PLANS];
              }
              
              if (plan) {
                uploadLimit = plan.uploadLimit;
                console.log(`Atualizando plano via webhook: planType=${planType}, uploadLimit=${uploadLimit}`);
              }
            }
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
          planType,
          uploadLimit,
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
  
  async syncUsedUploads(userId: number): Promise<User | undefined> {
    try {
      // Get the current user
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return undefined;
      
      // Get all projects for this user
      const userProjects = await this.getProjects(userId);
      
      // Prepare project IDs for query
      const projectIds = userProjects.map(p => p.id.toString());
      
      // If no projects, set counts to 0
      if (projectIds.length === 0) {
        const [updatedUser] = await db
          .update(users)
          .set({ usedUploads: 0 })
          .where(eq(users.id, userId))
          .returning();
        return updatedUser;
      }
      
      // Count all photos for this user's projects
      const photoCountQuery = await db
        .select({ count: count() })
        .from(photos)
        .where(inArray(photos.projectId, projectIds));
      
      const totalPhotoCount = photoCountQuery[0]?.count || 0;
      
      console.log(`Syncing usedUploads for user ${userId}: calculated ${totalPhotoCount} total photos`);
      
      // Update the user with accurate count
      const [updatedUser] = await db
        .update(users)
        .set({ usedUploads: totalPhotoCount })
        .where(eq(users.id, userId))
        .returning();
        
      return updatedUser;
    } catch (error) {
      console.error("Erro ao sincronizar contagem de uploads:", error);
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
  async getProject(id: number | string): Promise<Project | undefined> {
    try {
      console.log(`DatabaseStorage: Buscando projeto ID=${id}`);
      
      // Se id for number, busca direto pelo ID
      if (typeof id === 'number') {
        const [project] = await db.select().from(projects).where(eq(projects.id, id));
        if (project) {
          console.log(`DatabaseStorage: Projeto encontrado com ID numérico: ${project.name}`);
          return project;
        }
      }
      
      // Se id for string e for numérico, converte para number e busca
      const numericId = parseInt(id.toString());
      if (!isNaN(numericId)) {
        const [project] = await db.select().from(projects).where(eq(projects.id, numericId));
        if (project) {
          console.log(`DatabaseStorage: Projeto encontrado com ID string (convertido): ${project.name}`);
          return project;
        }
      }
      
      // Se não encontrou por ID numérico, tenta por publicId
      const [project] = await db.select().from(projects).where(eq(projects.publicId, id.toString()));
      
      if (project) {
        console.log(`DatabaseStorage: Projeto encontrado via publicId: ${project.name}`);
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
  
  async updateProjectSelections(id: number, selectedPhotoIds: string[]): Promise<Project | undefined> {
    try {
      console.log(`DatabaseStorage: Atualizando seleções para projeto ID=${id}, total de ${selectedPhotoIds.length} fotos selecionadas`);
      
      // Buscar o projeto existente
      const project = await this.getProject(id);
      if (!project) {
        console.log(`DatabaseStorage: Projeto ID=${id} não encontrado`);
        return undefined;
      }
      
      // Atualizar as seleções nas fotos do projeto
      if (project.photos && Array.isArray(project.photos)) {
        // Clonar o array de fotos
        const updatedPhotos = project.photos.map(photo => ({
          ...photo,
          selected: selectedPhotoIds.includes(photo.id)
        }));
        
        // Atualizar o projeto no banco de dados
        const [updatedProject] = await db
          .update(projects)
          .set({ 
            photos: updatedPhotos,
            // Não atualizar selectedPhotos, que será definido apenas na finalização
            status: project.status === "pending" && selectedPhotoIds.length > 0 ? "reviewed" : project.status
          })
          .where(eq(projects.id, id))
          .returning();
        
        console.log(`DatabaseStorage: Seleções atualizadas para projeto ID=${id}`);
        return updatedProject;
      } else {
        console.log(`DatabaseStorage: Projeto ID=${id} não tem fotos para atualizar`);
        return project;
      }
    } catch (error) {
      console.error(`Erro ao atualizar seleções do projeto ${id}:`, error);
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
          status: "Completed", // Atualiza o status para Completed
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

  async reopenProject(id: number | string): Promise<Project | undefined> {
    try {
      // Verificar se id é string e convertê-lo para número se possível
      let projectId = id;
      if (typeof id === 'string') {
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          projectId = numId;
        } else {
          // Se não for possível converter para número, buscar pelo publicId
          const project = await this.getProject(id);
          if (project) {
            projectId = project.id;
          } else {
            console.error(`Projeto não encontrado com ID=${id}`);
            return undefined;
          }
        }
      }
      
      const [reopenedProject] = await db
        .update(projects)
        .set({ status: "reopened" })
        .where(eq(projects.id, projectId as number))
        .returning();
      
      console.log(`Projeto ID=${projectId} reaberto com sucesso`);
      return reopenedProject;
    } catch (error) {
      console.error("Erro ao reabrir projeto:", error);
      return undefined;
    }
  }

  async updateProjectWatermark(id: number, showWatermark: boolean): Promise<Project | undefined> {
    try {
      const [updatedProject] = await db
        .update(projects)
        .set({ showWatermark })
        .where(eq(projects.id, id))
        .returning();
      
      console.log(`DatabaseStorage: Marca d'água do projeto ID=${id} atualizada para ${showWatermark}`);
      return updatedProject;
    } catch (error) {
      console.error("Erro ao atualizar marca d'água do projeto:", error);
      return undefined;
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    try {
      // First, get the project to know its photographerId and photo count
      const project = await this.getProject(id);
      
      if (!project) {
        console.log(`DatabaseStorage: Projeto ID=${id} não encontrado para deleção`);
        return false;
      }
      
      // Get the photographer ID and count the photos before deleting
      const photographerId = project.photographerId;
      const photoCount = project.photos ? project.photos.length : 0;
      
      console.log(`DatabaseStorage: Deletando projeto ID=${id} com ${photoCount} fotos do fotógrafo ID=${photographerId}`);
      
      // Delete the project
      await db.delete(projects).where(eq(projects.id, id));
      
      // If the project had photos, update the photographer's upload usage
      if (photoCount > 0) {
        console.log(`DatabaseStorage: Atualizando contador de uploads para o fotógrafo ID=${photographerId}, reduzindo ${photoCount} fotos`);
        // Use negative photoCount to reduce the usage
        await this.updateUploadUsage(photographerId, -photoCount);
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      return false;
    }
  }

  // ==================== Métodos de Controle Automático de Downgrade ====================
  
  /**
   * Agenda um downgrade pendente para um usuário com 3 dias de tolerância
   * @param userId ID do usuário
   * @param reason Motivo do downgrade (canceled, refunded, etc.)
   * @param originalPlan Plano original antes do downgrade
   */
  async schedulePendingDowngrade(userId: number, reason: string, originalPlan: string): Promise<User | undefined> {
    try {
      // Calcular data do downgrade (3 dias a partir de agora)
      const downgradeDate = new Date();
      downgradeDate.setDate(downgradeDate.getDate() + 3);
      
      console.log(`[DOWNGRADE] Agendando downgrade para usuário ID=${userId}, motivo=${reason}, data=${downgradeDate.toISOString()}`);
      
      const [updatedUser] = await db
        .update(users)
        .set({
          pendingDowngradeDate: downgradeDate,
          pendingDowngradeReason: reason,
          originalPlanBeforeDowngrade: originalPlan,
          lastEvent: {
            type: `pending_downgrade_${reason}`,
            timestamp: new Date().toISOString(),
          },
        })
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`[DOWNGRADE] Downgrade agendado com sucesso para usuário ID=${userId}`);
      return updatedUser;
    } catch (error) {
      console.error("Erro ao agendar downgrade:", error);
      return undefined;
    }
  }

  /**
   * Cancela um downgrade pendente (quando pagamento é regularizado)
   * @param userId ID do usuário
   */
  async cancelPendingDowngrade(userId: number): Promise<User | undefined> {
    try {
      console.log(`[DOWNGRADE] Cancelando downgrade pendente para usuário ID=${userId}`);
      
      const [updatedUser] = await db
        .update(users)
        .set({
          pendingDowngradeDate: null,
          pendingDowngradeReason: null,
          originalPlanBeforeDowngrade: null,
          lastEvent: {
            type: 'downgrade_cancelled',
            timestamp: new Date().toISOString(),
          },
        })
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`[DOWNGRADE] Downgrade cancelado com sucesso para usuário ID=${userId}`);
      return updatedUser;
    } catch (error) {
      console.error("Erro ao cancelar downgrade:", error);
      return undefined;
    }
  }

  /**
   * Busca usuários com downgrades que já venceram
   */
  async getUsersWithExpiredDowngrades(): Promise<User[]> {
    try {
      const now = new Date();
      
      const expiredUsers = await db
        .select()
        .from(users)
        .where(
          and(
            sql`pending_downgrade_date IS NOT NULL`,
            sql`pending_downgrade_date <= ${now}`
          )
        );
      
      console.log(`[DOWNGRADE] Encontrados ${expiredUsers.length} usuários com downgrades expirados`);
      return expiredUsers;
    } catch (error) {
      console.error("Erro ao buscar usuários com downgrades expirados:", error);
      return [];
    }
  }

  /**
   * Processa todos os downgrades que venceram, convertendo para plano gratuito
   * @returns Número de usuários processados
   */
  // ==================== CONTROLE MANUAL DE PLANOS (ADM) ====================
  
  // Método para redefinir senha de usuário pelo ADM
  async resetUserPasswordByAdmin(userId: number, newPassword: string, adminEmail: string): Promise<void> {
    // Hash da nova senha usando a mesma função do auth.ts
    const { hashPassword } = await import('./auth');
    const hashedPassword = await hashPassword(newPassword);
    
    await db.update(users)
      .set({
        password: hashedPassword,
        lastEvent: {
          type: 'password_reset_by_admin',
          timestamp: new Date().toISOString()
        }
      })
      .where(eq(users.id, userId));
      
    console.log(`[ADM] Senha redefinida para usuário ID=${userId} por ${adminEmail}`);
  }
  
  // Método para ativar plano manualmente pelo ADM (expira em 34 dias)
  async activateManualPlan(userId: number, planType: string, adminEmail: string): Promise<void> {
    const activationDate = new Date();
    
    await db.update(users)
      .set({
        planType,
        subscriptionStatus: 'active',
        subscriptionStartDate: activationDate,
        manualActivationDate: activationDate,
        manualActivationBy: adminEmail,
        isManualActivation: true,
        // Limpar campos de downgrade se existirem
        pendingDowngradeDate: null,
        pendingDowngradeReason: null,
        originalPlanBeforeDowngrade: null,
        // Configurar limites do plano
        uploadLimit: SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS]?.uploadLimit || 1000,
        lastEvent: {
          type: 'manual_activation',
          timestamp: activationDate.toISOString()
        }
      })
      .where(eq(users.id, userId));
      
    console.log(`[ADM] Plano ${planType} ativado manualmente para usuário ${userId} por ${adminEmail} - expira em 34 dias`);
  }
  
  // Método para processar planos manuais expirados (executa automaticamente a cada hora)
  async processExpiredManualActivations(): Promise<number> {
    const now = new Date();
    const thirtyFourDaysAgo = new Date(now.getTime() - (34 * 24 * 60 * 60 * 1000));
    
    // Buscar usuários com ativação manual expirada (34 dias)
    const expiredUsers = await db.select()
      .from(users)
      .where(
        and(
          eq(users.isManualActivation, true),
          lt(users.manualActivationDate, thirtyFourDaysAgo),
          ne(users.planType, 'free')
        )
      );
    
    let processedCount = 0;
    
    for (const user of expiredUsers) {
      // Verificar se não houve pagamento via Hotmart nos últimos 34 dias
      // Se subscription_id existe, significa que houve pagamento e o plano deve continuar
      if (!user.subscription_id) {
        await db.update(users)
          .set({
            planType: 'free',
            subscriptionStatus: 'cancelled',
            uploadLimit: 1000,
            isManualActivation: false,
            manualActivationDate: null,
            manualActivationBy: null,
            lastEvent: {
              type: 'manual_activation_expired',
              timestamp: now.toISOString()
            }
          })
          .where(eq(users.id, user.id));
          
        console.log(`[ADM] Usuário ${user.email} convertido para plano gratuito - ativação manual expirada após 34 dias`);
        processedCount++;
      } else {
        // Se tem subscription_id, significa que pagou via Hotmart - remover flags manuais
        await db.update(users)
          .set({
            isManualActivation: false,
            manualActivationDate: null,
            manualActivationBy: null,
            lastEvent: {
              type: 'manual_activation_converted_to_paid',
              timestamp: now.toISOString()
            }
          })
          .where(eq(users.id, user.id));
          
        console.log(`[ADM] Usuário ${user.email} convertido para plano pago via Hotmart - removendo controle manual`);
      }
    }
    
    return processedCount;
  }

  // ==================== SISTEMA DE DOWNGRADE AUTOMÁTICO ====================

  async processExpiredDowngrades(): Promise<number> {
    try {
      const expiredUsers = await this.getUsersWithExpiredDowngrades();
      let processedCount = 0;
      
      for (const user of expiredUsers) {
        console.log(`[DOWNGRADE] Processando downgrade para usuário ID=${user.id}, email=${user.email}`);
        
        // Converter para plano gratuito
        const [updatedUser] = await db
          .update(users)
          .set({
            planType: "free",
            uploadLimit: SUBSCRIPTION_PLANS.FREE.uploadLimit,
            subscriptionStatus: "inactive",
            subscriptionEndDate: new Date(),
            pendingDowngradeDate: null,
            pendingDowngradeReason: null,
            originalPlanBeforeDowngrade: null,
            lastEvent: {
              type: 'downgrade_executed',
              timestamp: new Date().toISOString(),
            },
          })
          .where(eq(users.id, user.id))
          .returning();
        
        if (updatedUser) {
          console.log(`[DOWNGRADE] Usuário ID=${user.id} convertido para plano gratuito por motivo: ${user.pendingDowngradeReason}`);
          processedCount++;
        }
      }
      
      console.log(`[DOWNGRADE] Processamento concluído: ${processedCount} usuários convertidos para plano gratuito`);
      return processedCount;
    } catch (error) {
      console.error("Erro ao processar downgrades expirados:", error);
      return 0;
    }
  }

  // ==================== Photo Comment Methods ====================
  
  async createPhotoComment(comment: InsertPhotoComment): Promise<PhotoComment> {
    try {
      const [newComment] = await db
        .insert(photoComments)
        .values(comment)
        .returning();
      
      console.log(`DatabaseStorage: Comentário criado para foto ID=${comment.photoId}`);
      return newComment;
    } catch (error) {
      console.error("Erro ao criar comentário da foto:", error);
      throw error;
    }
  }

  async getPhotoComments(photoId: string): Promise<PhotoComment[]> {
    try {
      const comments = await db
        .select()
        .from(photoComments)
        .where(eq(photoComments.photoId, photoId))
        .orderBy(desc(photoComments.createdAt));
      
      return comments;
    } catch (error) {
      console.error("Erro ao buscar comentários da foto:", error);
      return [];
    }
  }

  async getProjectPhotoComments(projectId: string): Promise<any[]> {
    try {
      // First get the project to find its photos
      const project = await this.getProject(parseInt(projectId));
      if (!project || !project.photos) {
        console.log(`DatabaseStorage: Projeto ${projectId} não encontrado ou sem fotos`);
        return [];
      }

      // Get photo IDs from the project
      const photoIds = project.photos.map(photo => photo.id);
      if (photoIds.length === 0) {
        console.log(`DatabaseStorage: Nenhuma foto encontrada para projeto ID=${projectId}`);
        return [];
      }

      // Get comments for these specific photos and enrich with photo data
      const comments = await db
        .select()
        .from(photoComments)
        .where(inArray(photoComments.photoId, photoIds))
        .orderBy(desc(photoComments.createdAt));
      
      // Enrich comments with photo information
      const enrichedComments = comments.map(comment => {
        const photo = project.photos?.find(p => p.id === comment.photoId);
        return {
          ...comment,
          photoUrl: photo?.url,
          photoFilename: photo?.filename,
          photoOriginalName: photo?.originalName
        };
      });
      
      console.log(`DatabaseStorage: Encontrados ${comments.length} comentários para projeto ID=${projectId} (${photoIds.length} fotos)`);
      return enrichedComments;
    } catch (error) {
      console.error("Erro ao buscar comentários do projeto:", error);
      return [];
    }
  }

  async markCommentsAsViewed(commentIds: string[]): Promise<void> {
    try {
      if (commentIds.length === 0) return;
      
      await db
        .update(photoComments)
        .set({ isViewed: true })
        .where(inArray(photoComments.id, commentIds));
      
      console.log(`DatabaseStorage: ${commentIds.length} comentários marcados como visualizados`);
    } catch (error) {
      console.error("Erro ao marcar comentários como visualizados:", error);
      throw error;
    }
  }
}

// Usar o armazenamento PostgreSQL em vez do armazenamento em memória
export const storage = new DatabaseStorage();

// Comentado para referência:
// export const storage = new MemStorage();
