import { nanoid } from "nanoid";
import * as bcrypt from "bcrypt";
import { db, pool } from "./db";
import { 
  users, 
  projects, 
  photos, 
  photoComments, 
  portfolios,
  portfolioPhotos,
  type User, 
  type Project, 
  type Photo, 
  type PhotoComment,
  type InsertUser, 
  type InsertProject, 
  type InsertPhotoComment
} from "@shared/schema";
import { eq, desc, asc, lt, sql, and, ne, or, inArray } from "drizzle-orm";
import type { PgSession } from "drizzle-orm/pg-core";
import type { Pool } from "pg";
import ConnectPgSimple from 'connect-pg-simple';
import session from 'express-session';

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
  
  // Portfolio methods
  getUserPortfolios(userId: number): Promise<any[]>;
  createPortfolio(data: any): Promise<any>;
  getPortfolio(id: number): Promise<any | undefined>;
  getPortfolioBySlug(slug: string): Promise<any | undefined>;
  getPublicPortfolio(slug: string): Promise<any | undefined>;
  updatePortfolio(id: number, data: any): Promise<any | undefined>;
  deletePortfolio(id: number): Promise<boolean>;
  addPhotosToPortfolio(portfolioId: number, photoUrls: string[]): Promise<any[]>;
  removePhotosFromPortfolio(portfolioId: number, photoIds: number[]): Promise<void>;
  getUserProjects(userId: number): Promise<any[]>;
  reorderPortfolioPhotos(portfolioId: number, photoOrders: { photoId: number; order: number }[]): Promise<void>;
  updatePortfolioPhoto(photoId: number, data: { description?: string; order?: number }): Promise<any | undefined>;
  deletePortfolioPhoto(photoId: number): Promise<void>;
  getPortfolioPhotos(portfolioId: number): Promise<any[]>;
  
  // Session store
  sessionStore: any;
}

// Implementação do armazenamento em PostgreSQL
export class DatabaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    const PgSession = ConnectPgSimple(session);
    this.sessionStore = new PgSession({
      pool: pool,
      createTableIfMissing: true,
      tableName: 'session',
      ttl: 24 * 60 * 60 * 1000, // 24 horas
      schemaName: 'public'
    });
  }

  // ==================== User Methods ====================
  
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      return user || undefined;
    } catch (error) {
      console.error("Erro ao buscar usuário por email:", error);
      return undefined;
    }
  }

  async getUserBySubscriptionId(subscriptionId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.subscription_id, subscriptionId));
      return user || undefined;
    } catch (error) {
      console.error("Erro ao buscar usuário por subscription_id:", error);
      return undefined;
    }
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
      return user || undefined;
    } catch (error) {
      console.error("Erro ao buscar usuário por Stripe Customer ID:", error);
      return undefined;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const usersList = await db.select().from(users).orderBy(desc(users.createdAt));
      return usersList;
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      return [];
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const [newUser] = await db
        .insert(users)
        .values({
          ...user,
          password: hashedPassword,
          phone: user.phone || '',
        })
        .returning();
      
      console.log(`DatabaseStorage: Usuário criado ID=${newUser.id}`);
      return newUser;
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
      
      console.log(`DatabaseStorage: Usuário ID=${id} atualizado`);
      return updatedUser;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      console.log(`DatabaseStorage: Usuário ID=${id} excluído`);
      return true;
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      return false;
    }
  }

  // ==================== Project Methods ====================
  
  async getProject(id: number): Promise<Project | undefined> {
    try {
      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      if (!project) return undefined;

      const projectPhotos = await db.select().from(photos).where(eq(photos.projectId, project.publicId));
      
      return {
        ...project,
        photos: projectPhotos
      };
    } catch (error) {
      console.error("Erro ao buscar projeto:", error);
      return undefined;
    }
  }

  async getProjects(photographerId?: number): Promise<Project[]> {
    try {
      let projectsList;
      
      if (photographerId) {
        console.log(`Filtrando projetos para o fotógrafo ID=${photographerId}`);
        projectsList = await db
          .select()
          .from(projects)
          .where(eq(projects.photographerId, photographerId))
          .orderBy(desc(projects.createdAt));
      } else {
        projectsList = await db
          .select()
          .from(projects)
          .orderBy(desc(projects.createdAt));
      }

      const projectsWithPhotos = await Promise.all(
        projectsList.map(async (project) => {
          const projectPhotos = await db
            .select()
            .from(photos)
            .where(eq(photos.projectId, project.publicId))
            .orderBy(asc(photos.createdAt));
          
          return {
            ...project,
            photos: projectPhotos
          };
        })
      );

      console.log(`Retornando ${projectsWithPhotos.length} projetos para o usuário ID=${photographerId}`);
      return projectsWithPhotos;
    } catch (error) {
      console.error("Erro ao buscar projetos:", error);
      return [];
    }
  }

  async createProject(project: InsertProject, photos: Photo[]): Promise<Project> {
    try {
      const projectPublicId = nanoid();
      
      const [newProject] = await db
        .insert(projects)
        .values({
          ...project,
          publicId: projectPublicId,
          clientName: project.clientName || '',
        })
        .returning();

      if (photos && photos.length > 0) {
        await db.insert(photos).values(
          photos.map(photo => ({
            ...photo,
            projectId: projectPublicId,
            selected: false,
            createdAt: new Date(),
          }))
        );
      }

      const finalProject = await this.getProject(newProject.id);
      if (!finalProject) {
        throw new Error("Falha ao recuperar projeto criado");
      }

      console.log(`DatabaseStorage: Projeto criado ID=${newProject.id} com ${photos.length} fotos`);
      return finalProject;
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
      
      if (!updatedProject) return undefined;

      const projectPhotos = await db.select().from(photos).where(eq(photos.projectId, updatedProject.publicId));
      
      console.log(`DatabaseStorage: Projeto ID=${id} atualizado`);
      return {
        ...updatedProject,
        photos: projectPhotos
      };
    } catch (error) {
      console.error("Erro ao atualizar projeto:", error);
      return undefined;
    }
  }

  async updateProjectSelections(id: number, selectedPhotos: string[]): Promise<Project | undefined> {
    try {
      const project = await this.getProject(id);
      if (!project) return undefined;

      await db
        .update(photos)
        .set({ selected: false })
        .where(eq(photos.projectId, project.publicId));

      if (selectedPhotos.length > 0) {
        await db
          .update(photos)
          .set({ selected: true })
          .where(and(
            eq(photos.projectId, project.publicId),
            inArray(photos.id, selectedPhotos)
          ));
      }

      const updatedProject = await this.getProject(id);
      console.log(`DatabaseStorage: Seleções do projeto ID=${id} atualizadas`);
      return updatedProject;
    } catch (error) {
      console.error("Erro ao atualizar seleções do projeto:", error);
      return undefined;
    }
  }

  async finalizeProjectSelection(id: number, selectedPhotos: string[]): Promise<Project | undefined> {
    try {
      const project = await this.getProject(id);
      if (!project) return undefined;

      await db
        .update(photos)
        .set({ selected: false })
        .where(eq(photos.projectId, project.publicId));

      if (selectedPhotos.length > 0) {
        await db
          .update(photos)
          .set({ selected: true })
          .where(and(
            eq(photos.projectId, project.publicId),
            inArray(photos.id, selectedPhotos)
          ));
      }

      const [updatedProject] = await db
        .update(projects)
        .set({ status: "Completed" })
        .where(eq(projects.id, id))
        .returning();

      const finalProject = await this.getProject(id);
      console.log(`DatabaseStorage: Projeto ID=${id} finalizado com ${selectedPhotos.length} fotos selecionadas`);
      return finalProject;
    } catch (error) {
      console.error("Erro ao finalizar projeto:", error);
      return undefined;
    }
  }

  async archiveProject(id: number): Promise<Project | undefined> {
    try {
      const [archivedProject] = await db
        .update(projects)
        .set({ status: "arquivado" })
        .where(eq(projects.id, id))
        .returning();
      
      console.log(`DatabaseStorage: Projeto ID=${id} arquivado`);
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
        .set({ status: "Em andamento" })
        .where(eq(projects.id, id))
        .returning();
      
      console.log(`DatabaseStorage: Projeto ID=${id} reaberto`);
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
      console.error("Erro ao atualizar marca d'água:", error);
      return undefined;
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    try {
      const project = await this.getProject(id);
      if (!project) return false;

      const photoCount = project.photos ? project.photos.length : 0;
      const photographerId = project.photographerId;
      
      await db.delete(photos).where(eq(photos.projectId, project.publicId));
      await db.delete(projects).where(eq(projects.id, id));
      
      if (photoCount > 0) {
        await this.updateUploadUsage(photographerId, -photoCount);
      }
      
      console.log(`DatabaseStorage: Projeto ID=${id} excluído`);
      return true;
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      return false;
    }
  }

  // ==================== Upload Management Methods ====================
  
  async checkUploadLimit(userId: number, count: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;

      const newTotal = (user.usedUploads || 0) + count;
      const limit = user.uploadLimit || 1000;
      
      return newTotal <= limit;
    } catch (error) {
      console.error("Erro ao verificar limite de upload:", error);
      return false;
    }
  }

  async updateUploadUsage(userId: number, addCount: number): Promise<User | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;

      const newUsedUploads = Math.max(0, (user.usedUploads || 0) + addCount);
      
      const [updatedUser] = await db
        .update(users)
        .set({ usedUploads: newUsedUploads })
        .where(eq(users.id, userId))
        .returning();

      console.log(`DatabaseStorage: Upload usage atualizado para usuário ID=${userId}: ${newUsedUploads}`);
      return updatedUser;
    } catch (error) {
      console.error("Erro ao atualizar usage de upload:", error);
      return undefined;
    }
  }

  async syncUsedUploads(userId: number): Promise<User | undefined> {
    try {
      const userProjects = await this.getProjects(userId);
      const totalPhotos = userProjects.reduce((sum, project) => sum + (project.photos?.length || 0), 0);
      
      const [updatedUser] = await db
        .update(users)
        .set({ usedUploads: totalPhotos })
        .where(eq(users.id, userId))
        .returning();

      console.log(`DatabaseStorage: Sincronização de uploads para usuário ID=${userId}: ${totalPhotos} fotos`);
      return updatedUser;
    } catch (error) {
      console.error("Erro ao sincronizar uploads:", error);
      return undefined;
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
      const project = await this.getProject(parseInt(projectId));
      if (!project || !project.photos) {
        return [];
      }

      const photoIds = project.photos.map(photo => photo.id);
      if (photoIds.length === 0) {
        return [];
      }

      const comments = await db
        .select()
        .from(photoComments)
        .where(inArray(photoComments.photoId, photoIds))
        .orderBy(desc(photoComments.createdAt));
      
      const enrichedComments = comments.map(comment => {
        const photo = project.photos?.find(p => p.id === comment.photoId);
        return {
          ...comment,
          photoUrl: photo?.url,
          photoFilename: photo?.filename,
          photoOriginalName: photo?.originalName
        };
      });
      
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

  // ==================== Portfolio Methods ====================
  
  async getUserPortfolios(userId: number): Promise<any[]> {
    try {
      const portfoliosList = await db
        .select()
        .from(portfolios)
        .where(eq(portfolios.userId, userId))
        .orderBy(desc(portfolios.createdAt));

      const portfoliosWithPhotos = await Promise.all(
        portfoliosList.map(async (portfolio) => {
          const photos = await db
            .select()
            .from(portfolioPhotos)
            .where(eq(portfolioPhotos.portfolioId, portfolio.id))
            .orderBy(asc(portfolioPhotos.order));
          
          return {
            ...portfolio,
            photos: photos
          };
        })
      );

      console.log(`DatabaseStorage: Encontrados ${portfoliosList.length} portfólios para usuário ID=${userId}`);
      return portfoliosWithPhotos;
    } catch (error) {
      console.error("Erro ao buscar portfólios do usuário:", error);
      return [];
    }
  }

  async createPortfolio(data: any): Promise<any> {
    try {
      const slug = data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .trim();

      const [portfolio] = await db
        .insert(portfolios)
        .values({
          name: data.name,
          slug: slug,
          description: data.description || "",
          isPublic: data.isPublic !== false,
          userId: data.userId
        })
        .returning();
      
      console.log(`DatabaseStorage: Portfólio criado ID=${portfolio.id} para usuário ID=${data.userId}`);
      return {
        ...portfolio,
        photos: []
      };
    } catch (error) {
      console.error("Erro ao criar portfólio:", error);
      throw error;
    }
  }

  async getPortfolio(id: number): Promise<any | undefined> {
    try {
      const [portfolio] = await db
        .select()
        .from(portfolios)
        .where(eq(portfolios.id, id));
      
      if (!portfolio) {
        return undefined;
      }

      const photos = await db
        .select()
        .from(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, id))
        .orderBy(asc(portfolioPhotos.order));

      return {
        ...portfolio,
        photos: photos
      };
    } catch (error) {
      console.error("Erro ao buscar portfólio:", error);
      return undefined;
    }
  }

  async getPortfolioBySlug(slug: string): Promise<any | undefined> {
    try {
      const [portfolio] = await db
        .select()
        .from(portfolios)
        .where(eq(portfolios.slug, slug));
      
      if (!portfolio) {
        return undefined;
      }

      const photos = await db
        .select()
        .from(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, portfolio.id))
        .orderBy(asc(portfolioPhotos.order));

      return {
        ...portfolio,
        photos: photos
      };
    } catch (error) {
      console.error("Erro ao buscar portfólio público:", error);
      return undefined;
    }
  }

  async getPublicPortfolio(slug: string): Promise<any | undefined> {
    try {
      const [portfolio] = await db
        .select()
        .from(portfolios)
        .where(and(
          eq(portfolios.slug, slug),
          eq(portfolios.isPublic, true)
        ));
      
      if (!portfolio) {
        return undefined;
      }

      const photos = await db
        .select()
        .from(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, portfolio.id))
        .orderBy(asc(portfolioPhotos.order));

      return {
        ...portfolio,
        photos: photos
      };
    } catch (error) {
      console.error("Erro ao buscar portfólio público:", error);
      return undefined;
    }
  }

  async updatePortfolio(id: number, data: any): Promise<any | undefined> {
    try {
      const updateData: any = {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        updatedAt: new Date()
      };

      if (data.name) {
        updateData.slug = data.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\s+/g, "-")
          .trim();
      }

      const [updatedPortfolio] = await db
        .update(portfolios)
        .set(updateData)
        .where(eq(portfolios.id, id))
        .returning();
      
      if (!updatedPortfolio) {
        return undefined;
      }

      const photos = await db
        .select()
        .from(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, id))
        .orderBy(asc(portfolioPhotos.order));

      console.log(`DatabaseStorage: Portfólio ID=${id} atualizado`);
      return {
        ...updatedPortfolio,
        photos: photos
      };
    } catch (error) {
      console.error("Erro ao atualizar portfólio:", error);
      throw error;
    }
  }

  async deletePortfolio(id: number): Promise<boolean> {
    try {
      await db
        .delete(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, id));

      await db
        .delete(portfolios)
        .where(eq(portfolios.id, id));

      console.log(`DatabaseStorage: Portfólio ID=${id} excluído`);
      return true;
    } catch (error) {
      console.error("Erro ao excluir portfólio:", error);
      return false;
    }
  }

  async addPhotosToPortfolio(portfolioId: number, photoUrls: string[]): Promise<any[]> {
    try {
      const [maxOrderResult] = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${portfolioPhotos.order}), -1)` })
        .from(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, portfolioId));

      const startOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

      const newPhotos = photoUrls.map((photoUrl, index) => ({
        portfolioId,
        photoUrl,
        order: startOrder + index,
        originalName: photoUrl.split('/').pop() || 'photo.jpg',
        description: null
      }));

      const insertedPhotos = await db
        .insert(portfolioPhotos)
        .values(newPhotos)
        .returning();

      console.log(`DatabaseStorage: ${insertedPhotos.length} fotos adicionadas ao portfólio ID=${portfolioId}`);
      return insertedPhotos;
    } catch (error) {
      console.error("Erro ao adicionar fotos ao portfólio:", error);
      throw error;
    }
  }

  async removePhotosFromPortfolio(portfolioId: number, photoIds: number[]): Promise<void> {
    try {
      await db
        .delete(portfolioPhotos)
        .where(and(
          eq(portfolioPhotos.portfolioId, portfolioId),
          inArray(portfolioPhotos.id, photoIds)
        ));

      console.log(`DatabaseStorage: ${photoIds.length} fotos removidas do portfólio ID=${portfolioId}`);
    } catch (error) {
      console.error("Erro ao remover fotos do portfólio:", error);
      throw error;
    }
  }

  async getUserProjects(userId: number): Promise<any[]> {
    try {
      const userProjects = await this.getProjects(userId);
      
      const formattedProjects = userProjects.map(project => ({
        id: project.id,
        name: project.name,
        photos: project.photos?.map(photo => ({
          id: photo.id,
          url: photo.url,
          filename: photo.filename || '',
          originalName: photo.originalName
        })) || []
      }));

      return formattedProjects;
    } catch (error) {
      console.error("Erro ao buscar projetos do usuário:", error);
      return [];
    }
  }

  async reorderPortfolioPhotos(portfolioId: number, photoOrders: { photoId: number; order: number }[]): Promise<void> {
    try {
      for (const { photoId, order } of photoOrders) {
        await db
          .update(portfolioPhotos)
          .set({ order })
          .where(and(
            eq(portfolioPhotos.portfolioId, portfolioId),
            eq(portfolioPhotos.id, photoId)
          ));
      }

      console.log(`DatabaseStorage: Ordem das fotos atualizada no portfólio ID=${portfolioId}`);
    } catch (error) {
      console.error("Erro ao reordenar fotos do portfólio:", error);
      throw error;
    }
  }

  async updatePortfolioPhoto(photoId: number, data: { description?: string; order?: number }): Promise<any | undefined> {
    try {
      const [updatedPhoto] = await db
        .update(portfolioPhotos)
        .set({
          description: data.description,
          order: data.order
        })
        .where(eq(portfolioPhotos.id, photoId))
        .returning();

      console.log(`DatabaseStorage: Foto do portfólio ID=${photoId} atualizada`);
      return updatedPhoto;
    } catch (error) {
      console.error("Erro ao atualizar foto do portfólio:", error);
      throw error;
    }
  }

  async deletePortfolioPhoto(photoId: number): Promise<void> {
    try {
      await db
        .delete(portfolioPhotos)
        .where(eq(portfolioPhotos.id, photoId));

      console.log(`DatabaseStorage: Foto do portfólio ID=${photoId} excluída`);
    } catch (error) {
      console.error("Erro ao excluir foto do portfólio:", error);
      throw error;
    }
  }

  async getPortfolioPhotos(portfolioId: number): Promise<any[]> {
    try {
      const photos = await db
        .select()
        .from(portfolioPhotos)
        .where(eq(portfolioPhotos.portfolioId, portfolioId))
        .orderBy(asc(portfolioPhotos.order));

      return photos;
    } catch (error) {
      console.error("Erro ao buscar fotos do portfólio:", error);
      return [];
    }
  }

  // ==================== Placeholder Methods (not implemented) ====================
  
  async handleWebhookEvent(payload: any): Promise<User | undefined> {
    console.log("DatabaseStorage: handleWebhookEvent não implementado");
    return undefined;
  }

  async handleStripeWebhook(payload: any): Promise<User | undefined> {
    console.log("DatabaseStorage: handleStripeWebhook não implementado");
    return undefined;
  }

  async updateUserSubscription(userId: number, planType: string): Promise<User | undefined> {
    console.log("DatabaseStorage: updateUserSubscription não implementado");
    return undefined;
  }

  async updateStripeInfo(userId: number, customerId: string, subscriptionId: string): Promise<User | undefined> {
    console.log("DatabaseStorage: updateStripeInfo não implementado");
    return undefined;
  }

  async schedulePendingDowngrade(userId: number, reason: string, originalPlan: string): Promise<User | undefined> {
    console.log("DatabaseStorage: schedulePendingDowngrade não implementado");
    return undefined;
  }

  async cancelPendingDowngrade(userId: number): Promise<User | undefined> {
    console.log("DatabaseStorage: cancelPendingDowngrade não implementado");
    return undefined;
  }

  async getUsersWithExpiredDowngrades(): Promise<User[]> {
    console.log("DatabaseStorage: getUsersWithExpiredDowngrades não implementado");
    return [];
  }

  async processExpiredDowngrades(): Promise<number> {
    console.log("DatabaseStorage: processExpiredDowngrades não implementado");
    return 0;
  }
}

// Usar o armazenamento PostgreSQL
export const storage = new DatabaseStorage();

// Interface types (missing from imports)
interface WebhookPayload {
  [key: string]: any;
}

interface SubscriptionWebhookPayload {
  [key: string]: any;
}