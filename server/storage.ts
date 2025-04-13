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
    return this.projects.get(id);
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
