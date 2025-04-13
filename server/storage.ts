import { users, type User, type InsertUser, projects, type Project, type InsertProject, type WebhookPayload, type Photo } from "@shared/schema";
import { nanoid } from "nanoid";

// Memory storage implementation
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySubscriptionId(subscriptionId: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  handleWebhookEvent(payload: WebhookPayload): Promise<User | undefined>;
  
  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjects(photographerId?: number): Promise<Project[]>;
  createProject(project: InsertProject, photos: Photo[]): Promise<Project>;
  updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined>;
  finalizeProjectSelection(id: number, selectedPhotos: string[]): Promise<Project | undefined>;
  archiveProject(id: number): Promise<Project | undefined>;
  reopenProject(id: number): Promise<Project | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private userId: number;
  private projectId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.userId = 1;
    this.projectId = 1;
    
    // Add default admin user
    this.createUser({
      name: "Admin User",
      email: "admin@admin.com",
      password: "123456",
      role: "admin",
      status: "active",
    });
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
      (user) => user.subscription_id === subscriptionId
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
      subscription_id: userData.subscription_id || null,
      lastEvent: null,
    };
    
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
      
      // Se não temos projetos, vamos inicializar alguns dados de exemplo
      if (this.projects.size === 0) {
        console.log("MemStorage: Inicializando projetos de exemplo...");
        this.initializeExampleProjects();
        return this.projects.get(id);
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
}

export const storage = new MemStorage();
