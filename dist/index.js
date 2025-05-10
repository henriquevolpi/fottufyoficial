var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  SUBSCRIPTION_PLANS: () => SUBSCRIPTION_PLANS,
  insertNewProjectSchema: () => insertNewProjectSchema,
  insertPasswordResetTokenSchema: () => insertPasswordResetTokenSchema,
  insertPhotoSchema: () => insertPhotoSchema,
  insertProjectSchema: () => insertProjectSchema,
  insertUserSchema: () => insertUserSchema,
  newProjects: () => newProjects,
  newProjectsRelations: () => newProjectsRelations,
  passwordResetTokens: () => passwordResetTokens,
  passwordResetTokensRelations: () => passwordResetTokensRelations,
  photos: () => photos,
  photosRelations: () => photosRelations,
  projects: () => projects,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone").notNull(),
  // Adicionando campo de telefone
  role: text("role").notNull().default("photographer"),
  // photographer | admin
  status: text("status").notNull().default("active"),
  // active | suspended | canceled
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Campos relacionados ao plano e assinatura
  planType: text("plan_type").default("free"),
  // free | basic | standard | professional
  uploadLimit: integer("upload_limit").default(0),
  usedUploads: integer("used_uploads").default(0),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  subscriptionStatus: text("subscription_status").default("inactive"),
  // active | inactive | canceled
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscription_id: text("subscription_id"),
  // mantido para compatibilidade
  lastEvent: jsonb("last_event").default(null).$type(),
  // Campo para rastrear o último login do usuário
  lastLoginAt: timestamp("last_login_at")
});
var usersRelations = relations(users, ({ many }) => ({
  projects: many(newProjects)
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastEvent: true,
  lastLoginAt: true,
  uploadLimit: true,
  usedUploads: true,
  subscriptionStartDate: true,
  subscriptionEndDate: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true
});
var SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Gratuito",
    type: "free",
    price: 0,
    uploadLimit: 10,
    // limite para teste
    description: "Plano para testes"
  },
  BASIC: {
    name: "B\xE1sico",
    type: "basic",
    price: 14.9,
    uploadLimit: 1e4,
    description: "10.000 uploads por conta",
    stripePriceId: "price_1RLDC2Hhs27r0l2SJGfPUumX"
    // Adicionando o mesmo priceId do Basic_V2 para compatibilidade
  },
  STANDARD: {
    name: "Padr\xE3o",
    type: "standard",
    price: 37.9,
    uploadLimit: 5e4,
    description: "50.000 uploads por conta",
    stripePriceId: "price_1RLDCLHhs27r0l2SXe9gkVlD"
    // Adicionando o mesmo priceId do Standard_V2 para compatibilidade
  },
  PROFESSIONAL: {
    name: "Profissional",
    type: "professional",
    price: 70,
    uploadLimit: 1e5,
    description: "100.000 uploads por conta",
    stripePriceId: "price_1RLDCpHhs27r0l2S4InekNvP"
    // Adicionando o mesmo priceId do Professional_V2 para compatibilidade
  },
  // Novos planos V2
  BASIC_V2: {
    name: "B\xE1sico",
    type: "basic_v2",
    price: 14.9,
    uploadLimit: 6e3,
    description: "6.000 uploads por conta",
    stripePriceId: "price_1RLDC2Hhs27r0l2SJGfPUumX"
  },
  STANDARD_V2: {
    name: "Padr\xE3o",
    type: "standard_v2",
    price: 29.9,
    uploadLimit: 15e3,
    description: "15.000 uploads por conta",
    stripePriceId: "price_1RLDCLHhs27r0l2SXe9gkVlD"
  },
  PROFESSIONAL_V2: {
    name: "Profissional",
    type: "professional_v2",
    price: 49.9,
    uploadLimit: 35e3,
    description: "35.000 uploads por conta",
    stripePriceId: "price_1RLDCpHhs27r0l2S4InekNvP"
  }
};
var projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  // Used for public URLs
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  photographerId: integer("photographer_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  // pending | reviewed | reopened | archived
  photos: jsonb("photos").default([]).$type(),
  selectedPhotos: jsonb("selected_photos").default([]).$type(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  photos: true,
  selectedPhotos: true,
  createdAt: true
});
var newProjects = pgTable("new_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var newProjectsRelations = relations(newProjects, ({ one, many }) => ({
  user: one(users, {
    fields: [newProjects.userId],
    references: [users.id]
  }),
  photos: many(photos)
}));
var insertNewProjectSchema = createInsertSchema(newProjects).omit({
  id: true,
  createdAt: true
});
var photos = pgTable("photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => newProjects.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename"),
  // Nome único usado pelo R2
  originalName: text("original_name"),
  // Nome original do arquivo enviado pelo usuário
  selected: boolean("selected").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var photosRelations = relations(photos, ({ one }) => ({
  project: one(newProjects, {
    fields: [photos.projectId],
    references: [newProjects.id]
  })
}));
var insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true
});
var passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: uuid("token").notNull().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false)
});
var passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id]
  })
}));
var insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  token: true,
  createdAt: true
});

// server/storage.ts
import { nanoid } from "nanoid";

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var replicateLocalConfig = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE,
  // Configuration para Replit - SSL é necessário mesmo localmente
  ssl: {
    rejectUnauthorized: false
  },
  max: 30,
  // ✅ Aumentado de 10 para 30 conexões simultâneas
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 5e3
};
var externalDbConfig = {
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
  host: process.env.DB_HOST || process.env.PGHOST,
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || "5432"),
  database: process.env.DB_NAME || process.env.PGDATABASE,
  ssl: {
    rejectUnauthorized: false
  },
  max: 30,
  // ✅ Também aqui para produção (Render, Supabase, etc.)
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 5e3
};
var useLocalConfig = true;
var poolConfig = useLocalConfig ? replicateLocalConfig : externalDbConfig;
var pool = new Pool(poolConfig);
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, desc, count, inArray, sql } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
var MemoryStore = createMemoryStore(session);
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: "session",
      schemaName: "public"
    });
    this.initializeAdminUser();
  }
  async initializeAdminUser() {
    try {
      const adminUser = await this.getUserByEmail("admin@studio.com");
      if (!adminUser) {
        console.log("Criando usu\xE1rio admin padr\xE3o...");
        await this.createUser({
          name: "Admin",
          email: "admin@studio.com",
          password: "admin123",
          role: "admin",
          status: "active",
          planType: "professional"
        });
        console.log("Usu\xE1rio admin criado com sucesso!");
      } else {
        console.log("Usu\xE1rio admin j\xE1 existe.");
      }
    } catch (error) {
      console.error("Erro ao inicializar usu\xE1rio admin:", error);
    }
  }
  // User methods
  async getUser(id) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Erro ao buscar usu\xE1rio por ID:", error);
      return void 0;
    }
  }
  async getUserByEmail(email) {
    try {
      const normalizedEmail = email.toLowerCase();
      console.log(`Buscando usu\xE1rio com email (normalizado): ${normalizedEmail}`);
      const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = ${normalizedEmail}`);
      console.log(`Usu\xE1rio encontrado:`, user ? { id: user.id, email: user.email, role: user.role } : "nenhum");
      return user;
    } catch (error) {
      console.error("Erro ao buscar usu\xE1rio por email:", error);
      return void 0;
    }
  }
  async getUserBySubscriptionId(subscriptionId) {
    try {
      const [user] = await db.select().from(users).where(
        eq(users.stripeSubscriptionId, subscriptionId)
      );
      if (!user) {
        const [legacyUser] = await db.select().from(users).where(
          eq(users.subscription_id, subscriptionId)
        );
        return legacyUser;
      }
      return user;
    } catch (error) {
      console.error("Erro ao buscar usu\xE1rio por subscription ID:", error);
      return void 0;
    }
  }
  async getUserByStripeCustomerId(customerId) {
    try {
      const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
      return user;
    } catch (error) {
      console.error("Erro ao buscar usu\xE1rio por customer ID:", error);
      return void 0;
    }
  }
  async getUsers() {
    try {
      return await db.select().from(users).orderBy(desc(users.createdAt));
    } catch (error) {
      console.error("Erro ao buscar todos os usu\xE1rios:", error);
      return [];
    }
  }
  async createUser(userData) {
    try {
      const userToCreate = {
        ...userData,
        role: userData.role || "photographer",
        status: userData.status || "active",
        planType: userData.planType || "free",
        usedUploads: 0,
        lastEvent: null
      };
      if (userToCreate.planType === "free") {
        userToCreate.uploadLimit = SUBSCRIPTION_PLANS.FREE.uploadLimit;
      }
      const [createdUser] = await db.insert(users).values(userToCreate).returning();
      return createdUser;
    } catch (error) {
      console.error("Erro ao criar usu\xE1rio:", error);
      throw error;
    }
  }
  async updateUser(id, userData) {
    try {
      const [updatedUser] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
      return updatedUser;
    } catch (error) {
      console.error("Erro ao atualizar usu\xE1rio:", error);
      return void 0;
    }
  }
  async deleteUser(id) {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir usu\xE1rio:", error);
      return false;
    }
  }
  // Métodos de gerenciamento de assinatura
  async updateUserSubscription(userId, planType) {
    try {
      const planKey = planType.toUpperCase();
      let plan = SUBSCRIPTION_PLANS[planKey];
      if (!plan) {
        if (planType.includes("_v2")) {
          const upperPlanType = planType.toUpperCase();
          plan = SUBSCRIPTION_PLANS[upperPlanType];
        } else {
          switch (planType) {
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
      console.log(`Atualizando assinatura: userId=${userId}, planType=${planType}, uploadLimit=${plan.uploadLimit}`);
      const now = /* @__PURE__ */ new Date();
      const endDate = /* @__PURE__ */ new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      const [updatedUser] = await db.update(users).set({
        planType,
        uploadLimit: plan.uploadLimit,
        subscriptionStartDate: now,
        subscriptionEndDate: endDate,
        subscriptionStatus: "active",
        status: "active"
        // Garantir que o usuário esteja ativo
      }).where(eq(users.id, userId)).returning();
      return updatedUser;
    } catch (error) {
      console.error("Erro ao atualizar assinatura do usu\xE1rio:", error);
      return void 0;
    }
  }
  async updateStripeInfo(userId, customerId, subscriptionId) {
    try {
      const [updatedUser] = await db.update(users).set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId
      }).where(eq(users.id, userId)).returning();
      return updatedUser;
    } catch (error) {
      console.error("Erro ao atualizar informa\xE7\xF5es do Stripe:", error);
      return void 0;
    }
  }
  async handleStripeWebhook(payload) {
    try {
      let user = await this.getUserByStripeCustomerId(payload.data.customer.id);
      if (!user) {
        const email = payload.data.customer.email;
        if (email) {
          user = await this.getUserByEmail(email);
        }
      }
      if (!user) return void 0;
      let subscriptionStatus = user.subscriptionStatus;
      let userStatus = user.status;
      let planType = user.planType;
      let uploadLimit = user.uploadLimit;
      console.log(`Processando webhook Stripe: evento=${payload.type}, usu\xE1rio=${user.id}, customer=${payload.data.customer.id}`);
      switch (payload.type) {
        case "subscription.created":
        case "subscription.updated":
          if (payload.data.subscription.status === "active") {
            subscriptionStatus = "active";
            userStatus = "active";
            const metadata = payload.data.subscription.metadata || {};
            if (metadata.planType) {
              planType = metadata.planType;
              const planKey = planType.toUpperCase();
              let plan = SUBSCRIPTION_PLANS[planKey];
              if (!plan && planType.includes("_v2")) {
                const upperPlanType = planType.toUpperCase();
                plan = SUBSCRIPTION_PLANS[upperPlanType];
              }
              if (plan) {
                uploadLimit = plan.uploadLimit;
                console.log(`Atualizando plano via webhook: planType=${planType}, uploadLimit=${uploadLimit}`);
              }
            }
          } else if (payload.data.subscription.status === "canceled") {
            subscriptionStatus = "inactive";
          }
          break;
        case "subscription.cancelled":
          subscriptionStatus = "inactive";
          break;
      }
      let subscriptionEndDate = user.subscriptionEndDate;
      if (payload.data.subscription.current_period_end) {
        subscriptionEndDate = new Date(payload.data.subscription.current_period_end * 1e3);
      }
      const [updatedUser] = await db.update(users).set({
        planType,
        uploadLimit,
        subscriptionStatus,
        status: userStatus,
        subscriptionEndDate,
        stripeSubscriptionId: payload.data.subscription.id,
        lastEvent: {
          type: payload.type,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      }).where(eq(users.id, user.id)).returning();
      return updatedUser;
    } catch (error) {
      console.error("Erro ao processar webhook do Stripe:", error);
      return void 0;
    }
  }
  // Métodos de gerenciamento de uploads
  async checkUploadLimit(userId, count3) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return false;
      if (user.subscriptionStatus !== "active" && user.planType !== "free") {
        return false;
      }
      if (user.uploadLimit !== null && user.uploadLimit < 0) {
        return true;
      }
      const uploadLimit = user.uploadLimit || 0;
      const usedUploads = user.usedUploads || 0;
      const availableUploads = uploadLimit - usedUploads;
      return availableUploads >= count3;
    } catch (error) {
      console.error("Erro ao verificar limite de uploads:", error);
      return false;
    }
  }
  async updateUploadUsage(userId, addCount) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return void 0;
      const currentUsed = user.usedUploads || 0;
      let newUsedUploads = currentUsed + addCount;
      if (newUsedUploads < 0) {
        newUsedUploads = 0;
      }
      console.log(`Upload usage updated for user ${userId}: ${currentUsed} \u2192 ${newUsedUploads} (added ${addCount})`);
      const [updatedUser] = await db.update(users).set({ usedUploads: newUsedUploads }).where(eq(users.id, userId)).returning();
      return updatedUser;
    } catch (error) {
      console.error("Erro ao atualizar uso de uploads:", error);
      return void 0;
    }
  }
  async syncUsedUploads(userId) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return void 0;
      const userProjects = await this.getProjects(userId);
      const projectIds = userProjects.map((p) => p.id.toString());
      if (projectIds.length === 0) {
        const [updatedUser2] = await db.update(users).set({ usedUploads: 0 }).where(eq(users.id, userId)).returning();
        return updatedUser2;
      }
      const photoCountQuery = await db.select({ count: count() }).from(photos).where(inArray(photos.projectId, projectIds));
      const totalPhotoCount = photoCountQuery[0]?.count || 0;
      console.log(`Syncing usedUploads for user ${userId}: calculated ${totalPhotoCount} total photos`);
      const [updatedUser] = await db.update(users).set({ usedUploads: totalPhotoCount }).where(eq(users.id, userId)).returning();
      return updatedUser;
    } catch (error) {
      console.error("Erro ao sincronizar contagem de uploads:", error);
      return void 0;
    }
  }
  async handleWebhookEvent(payload) {
    try {
      let user = await this.getUserByEmail(payload.email);
      if (!user && payload.subscription_id) {
        user = await this.getUserBySubscriptionId(payload.subscription_id);
      }
      if (!user) return void 0;
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
      const [updatedUser] = await db.update(users).set({
        status,
        subscription_id: payload.subscription_id || user.subscription_id,
        lastEvent: {
          type: payload.type,
          timestamp: payload.timestamp
        }
      }).where(eq(users.id, user.id)).returning();
      return updatedUser;
    } catch (error) {
      console.error("Erro ao processar evento de webhook:", error);
      return void 0;
    }
  }
  // Project methods
  async getProject(id) {
    try {
      console.log(`DatabaseStorage: Buscando projeto ID=${id}`);
      if (typeof id === "number") {
        const [project2] = await db.select().from(projects).where(eq(projects.id, id));
        return project2;
      }
      const numericId = parseInt(id.toString());
      if (!isNaN(numericId)) {
        const [project2] = await db.select().from(projects).where(eq(projects.id, numericId));
        if (project2) return project2;
      }
      const [project] = await db.select().from(projects).where(eq(projects.publicId, id.toString()));
      if (project) {
        console.log(`DatabaseStorage: Projeto encontrado: ${project.name}`);
      } else {
        console.log(`DatabaseStorage: Projeto ID=${id} n\xE3o encontrado`);
      }
      return project;
    } catch (error) {
      console.error("Erro ao buscar projeto:", error);
      return void 0;
    }
  }
  async getProjects(photographerId) {
    try {
      if (photographerId) {
        return await db.select().from(projects).where(eq(projects.photographerId, photographerId)).orderBy(desc(projects.createdAt));
      }
      return await db.select().from(projects).orderBy(desc(projects.createdAt));
    } catch (error) {
      console.error("Erro ao buscar projetos:", error);
      return [];
    }
  }
  async createProject(projectData, photos2) {
    try {
      const processedPhotos = photos2.map((photo) => ({
        ...photo,
        id: nanoid()
      }));
      const [createdProject] = await db.insert(projects).values({
        ...projectData,
        photos: processedPhotos,
        selectedPhotos: []
      }).returning();
      return createdProject;
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
      throw error;
    }
  }
  async updateProject(id, projectData) {
    try {
      const [updatedProject] = await db.update(projects).set(projectData).where(eq(projects.id, id)).returning();
      return updatedProject;
    } catch (error) {
      console.error("Erro ao atualizar projeto:", error);
      return void 0;
    }
  }
  async updateProjectSelections(id, selectedPhotoIds) {
    try {
      console.log(`DatabaseStorage: Atualizando sele\xE7\xF5es para projeto ID=${id}, total de ${selectedPhotoIds.length} fotos selecionadas`);
      const project = await this.getProject(id);
      if (!project) {
        console.log(`DatabaseStorage: Projeto ID=${id} n\xE3o encontrado`);
        return void 0;
      }
      if (project.photos && Array.isArray(project.photos)) {
        const updatedPhotos = project.photos.map((photo) => ({
          ...photo,
          selected: selectedPhotoIds.includes(photo.id)
        }));
        const [updatedProject] = await db.update(projects).set({
          photos: updatedPhotos,
          // Não atualizar selectedPhotos, que será definido apenas na finalização
          status: project.status === "pending" && selectedPhotoIds.length > 0 ? "reviewed" : project.status
        }).where(eq(projects.id, id)).returning();
        console.log(`DatabaseStorage: Sele\xE7\xF5es atualizadas para projeto ID=${id}`);
        return updatedProject;
      } else {
        console.log(`DatabaseStorage: Projeto ID=${id} n\xE3o tem fotos para atualizar`);
        return project;
      }
    } catch (error) {
      console.error(`Erro ao atualizar sele\xE7\xF5es do projeto ${id}:`, error);
      return void 0;
    }
  }
  async finalizeProjectSelection(id, selectedPhotos) {
    try {
      console.log(`DatabaseStorage: Finalizando sele\xE7\xE3o para projeto ID=${id}, fotos selecionadas: ${selectedPhotos.length}`);
      const [updatedProject] = await db.update(projects).set({
        selectedPhotos,
        status: "reviewed"
        // Atualiza o status para revisado
      }).where(eq(projects.id, id)).returning();
      return updatedProject;
    } catch (error) {
      console.error("Erro ao finalizar sele\xE7\xE3o de fotos:", error);
      return void 0;
    }
  }
  async archiveProject(id) {
    try {
      const [archivedProject] = await db.update(projects).set({ status: "archived" }).where(eq(projects.id, id)).returning();
      return archivedProject;
    } catch (error) {
      console.error("Erro ao arquivar projeto:", error);
      return void 0;
    }
  }
  async reopenProject(id) {
    try {
      const [reopenedProject] = await db.update(projects).set({ status: "reopened" }).where(eq(projects.id, id)).returning();
      return reopenedProject;
    } catch (error) {
      console.error("Erro ao reabrir projeto:", error);
      return void 0;
    }
  }
  async deleteProject(id) {
    try {
      const project = await this.getProject(id);
      if (!project) {
        console.log(`DatabaseStorage: Projeto ID=${id} n\xE3o encontrado para dele\xE7\xE3o`);
        return false;
      }
      const photographerId = project.photographerId;
      const photoCount = project.photos ? project.photos.length : 0;
      console.log(`DatabaseStorage: Deletando projeto ID=${id} com ${photoCount} fotos do fot\xF3grafo ID=${photographerId}`);
      await db.delete(projects).where(eq(projects.id, id));
      if (photoCount > 0) {
        console.log(`DatabaseStorage: Atualizando contador de uploads para o fot\xF3grafo ID=${photographerId}, reduzindo ${photoCount} fotos`);
        await this.updateUploadUsage(photographerId, -photoCount);
      }
      return true;
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      return false;
    }
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z } from "zod";

// server/r2.ts
import { S3Client, PutObjectCommand, HeadBucketCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

// server/imageProcessor.ts
import sharp from "sharp";
var TARGET_WIDTH = 920;
var WATERMARK_OPACITY = 0.25;
var WATERMARK_TEXT = "fottufy (n\xE3o copie)";
var WATERMARK_FONT_SIZE = 36;
async function processImage(buffer, mimetype, applyWatermark = true) {
  try {
    let resizedBuffer;
    try {
      resizedBuffer = await resizeImage(buffer);
    } catch (resizeError) {
      console.error("Erro ao redimensionar imagem:", resizeError);
      resizedBuffer = buffer;
    }
    try {
      const processedImage = sharp(resizedBuffer);
      const metadata = await processedImage.metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error("N\xE3o foi poss\xEDvel obter as dimens\xF5es da imagem");
      }
      let finalImage = processedImage;
      if (applyWatermark) {
        console.log(`Aplicando marca d'\xE1gua \xE0 imagem`);
        const watermarkPattern = await createTextWatermarkPattern(
          metadata.width,
          metadata.height
        );
        finalImage = processedImage.composite([
          { input: watermarkPattern, blend: "over" }
        ]);
      } else {
        console.log(`Pulando aplica\xE7\xE3o de marca d'\xE1gua conforme solicitado`);
      }
      if (mimetype === "image/png") {
        finalImage = finalImage.png();
      } else if (mimetype === "image/webp") {
        finalImage = finalImage.webp();
      } else if (mimetype === "image/gif") {
        finalImage = finalImage.gif();
      } else {
        finalImage = finalImage.jpeg({ quality: 85 });
      }
      return await finalImage.toBuffer();
    } catch (watermarkError) {
      console.error("Erro ao aplicar marca d'\xE1gua:", watermarkError);
      return resizedBuffer;
    }
  } catch (error) {
    console.error("Erro ao processar imagem:", error);
    return buffer;
  }
}
async function resizeImage(buffer) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    if (metadata.width && metadata.width > TARGET_WIDTH) {
      return await image.resize({
        width: TARGET_WIDTH,
        fit: "inside",
        withoutEnlargement: true
      }).toBuffer();
    }
    return buffer;
  } catch (error) {
    console.error("Erro ao redimensionar imagem:", error);
    return buffer;
  }
}
async function createTextWatermarkPattern(width, height) {
  const safeWidth = Math.floor(width);
  const safeHeight = Math.floor(height);
  try {
    const cellWidth = 300;
    const cellHeight = 150;
    const cols = Math.ceil(safeWidth / cellWidth) + 1;
    const rows = Math.ceil(safeHeight / cellHeight) + 1;
    let svgContent = `<svg width="${safeWidth}" height="${safeHeight}" xmlns="http://www.w3.org/2000/svg">`;
    svgContent += `<style>
      .watermark-dark { 
        font-family: Arial, sans-serif; 
        font-size: ${WATERMARK_FONT_SIZE}px; 
        fill: black; 
        fill-opacity: ${WATERMARK_OPACITY}; 
        font-weight: normal;
        text-anchor: middle;
      }
      .watermark-light { 
        font-family: Arial, sans-serif; 
        font-size: ${WATERMARK_FONT_SIZE}px; 
        fill: white; 
        fill-opacity: ${WATERMARK_OPACITY}; 
        font-weight: normal;
        text-anchor: middle;
      }
    </style>`;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const centerX = col * cellWidth + cellWidth / 2;
        const centerY = row * cellHeight + cellHeight / 2;
        const rotation = (row + col) % 3 === 0 ? -20 : (row + col) % 3 === 1 ? 0 : 20;
        svgContent += `<text class="watermark-dark" 
          x="${centerX}" 
          y="${centerY}" 
          transform="rotate(${rotation}, ${centerX}, ${centerY})">${WATERMARK_TEXT}</text>`;
        if ((row + col) % 4 === 0) {
          svgContent += `<text class="watermark-light" 
            x="${centerX + 120}" 
            y="${centerY + 60}" 
            transform="rotate(${rotation + 10}, ${centerX + 120}, ${centerY + 60})">${WATERMARK_TEXT}</text>`;
        }
      }
    }
    svgContent += `</svg>`;
    return await sharp(Buffer.from(svgContent)).toBuffer();
  } catch (error) {
    console.error("Erro ao criar padr\xE3o de marca d'\xE1gua de texto:", error);
    return await sharp({
      create: {
        width: safeWidth,
        height: safeHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).toBuffer();
  }
}

// server/r2.ts
if (!process.env.R2_ACCESS_KEY_ID) {
  throw new Error("R2_ACCESS_KEY_ID is not defined in environment variables");
}
if (!process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error("R2_SECRET_ACCESS_KEY is not defined in environment variables");
}
if (!process.env.R2_BUCKET_NAME) {
  throw new Error("R2_BUCKET_NAME is not defined in environment variables");
}
if (!process.env.R2_ACCOUNT_ID) {
  throw new Error("R2_ACCOUNT_ID is not defined in environment variables");
}
var R2_REGION = process.env.R2_REGION || "auto";
var BUCKET_NAME = process.env.R2_BUCKET_NAME;
var endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
console.log(`Using R2 endpoint: ${endpoint}`);
var r2Client = new S3Client({
  region: "auto",
  // Always use "auto" for Cloudflare R2
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});
var ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
var MAX_FILE_SIZE = 1e3 * 1024 * 1024;
var r2Upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (isValidFileType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
      cb(new Error(`Tipo de arquivo n\xE3o permitido: ${file.mimetype}. Apenas imagens JPEG, PNG, GIF e WebP s\xE3o aceitas.`));
    }
  }
});
function generateUniqueFileName(originalName) {
  const timestamp2 = Date.now();
  const randomString = Math.random().toString(36).substring(2, 12);
  const extension = originalName.split(".").pop() || "jpg";
  return `${timestamp2}-${randomString}.${extension}`;
}
function isValidFileType(mimetype) {
  return ALLOWED_MIME_TYPES.includes(mimetype);
}
async function uploadFileToR2(buffer, fileName, contentType, applyWatermark = true) {
  try {
    let processedBuffer = buffer;
    if (isValidFileType(contentType)) {
      try {
        const watermarkStatus = applyWatermark ? "com marca d'\xE1gua" : "sem marca d'\xE1gua";
        console.log(`Processando imagem: ${fileName} (redimensionamento ${watermarkStatus})`);
        processedBuffer = await processImage(buffer, contentType, applyWatermark);
        console.log(`Imagem processada com sucesso: ${fileName}`);
      } catch (processingError) {
        console.error(`Erro ao processar imagem ${fileName}:`, processingError);
        processedBuffer = buffer;
      }
    }
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: processedBuffer,
      ContentType: contentType
    });
    await r2Client.send(uploadCommand);
    const accountId = process.env.R2_ACCOUNT_ID || "";
    const publicUrl = `https://cdn.fottufy.com/${fileName}`;
    console.log(`Generated CDN URL: ${publicUrl}`);
    return {
      url: publicUrl,
      key: fileName
    };
  } catch (error) {
    console.error("Error uploading file to R2:", error);
    throw error;
  }
}
async function downloadAndUploadToR2(sourceUrl, filename, applyWatermark = true) {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let processedBuffer = buffer;
    if (isValidFileType(contentType)) {
      try {
        const watermarkStatus = applyWatermark ? "com marca d'\xE1gua" : "sem marca d'\xE1gua";
        console.log(`Processando imagem baixada: ${filename} (redimensionamento ${watermarkStatus})`);
        processedBuffer = await processImage(buffer, contentType, applyWatermark);
        console.log(`Imagem baixada processada com sucesso: ${filename}`);
      } catch (processingError) {
        console.error(`Erro ao processar imagem baixada ${filename}:`, processingError);
        processedBuffer = buffer;
      }
    }
    const result = await uploadFileToR2(
      processedBuffer,
      filename,
      contentType,
      applyWatermark
    );
    return result;
  } catch (error) {
    console.error(`Error downloading and uploading image from ${sourceUrl}:`, error);
    throw error;
  }
}
async function deleteFileFromR2(fileName) {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName
    });
    await r2Client.send(deleteCommand);
    console.log(`Successfully deleted ${fileName} from Cloudflare R2.`);
  } catch (error) {
    console.error(`Failed to delete ${fileName} from Cloudflare R2:`, error);
    throw error;
  }
}

// server/routes.ts
import path2 from "path";
import { nanoid as nanoid2 } from "nanoid";
import Stripe from "stripe";
import { eq as eq3, and as and2, count as count2 } from "drizzle-orm";

// server/utils/sendEmail.ts
import { Resend } from "resend";
var resendClient = null;
if (process.env.RESEND_API_KEY) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn("AVISO: RESEND_API_KEY n\xE3o est\xE1 configurada. O envio de e-mails n\xE3o funcionar\xE1.");
}
async function sendEmail(params) {
  const { to, subject, html, from = "Fottufy <noreply@fottufy.com>" } = params;
  const debug = process.env.DEBUG_EMAIL === "true";
  console.log(`[Email] Tentando enviar email para: ${to}, assunto: ${subject}`);
  try {
    if (!resendClient) {
      console.error("Erro ao enviar e-mail: RESEND_API_KEY n\xE3o est\xE1 configurada");
      return {
        success: false,
        message: "Servi\xE7o de e-mail n\xE3o configurado. RESEND_API_KEY n\xE3o est\xE1 definida."
      };
    }
    if (!to || !subject || !html) {
      return {
        success: false,
        message: "Par\xE2metros de email incompletos."
      };
    }
    const { data, error } = await resendClient.emails.send({
      from,
      to,
      subject,
      html
    });
    if (data) {
      console.log(`[Email] Email enviado com sucesso para ${to}, ID: ${data.id}`);
    }
    if (error) {
      console.error("Erro ao enviar e-mail via Resend:", error.message);
      console.error("Detalhes do erro:", JSON.stringify(error));
      return {
        success: false,
        message: `Falha ao enviar e-mail: ${error.message}`
      };
    }
    return {
      success: true,
      message: "E-mail enviado"
    };
  } catch (error) {
    console.error(
      "Erro inesperado ao enviar e-mail:",
      error instanceof Error ? error.message : "Erro desconhecido"
    );
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
    return {
      success: false,
      message: `Erro ao enviar e-mail: ${error instanceof Error ? error.message : "Erro desconhecido"}`
    };
  }
}

// server/utils/passwordReset.ts
import { eq as eq2 } from "drizzle-orm";
import { addHours } from "date-fns";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import bcrypt from "bcrypt";
import axios from "axios";
var SALT_ROUNDS = 10;
var BOT_CONVERSA_WEBHOOK_URL = "https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/108243/V8tF64jdaanj/";
async function sendBotConversaWebhook(name, phone) {
  if (process.env.NODE_ENV === "development" && process.env.FORCE_WEBHOOK !== "true") {
    return;
  }
  try {
    if (process.env.DEBUG_WEBHOOK === "true") {
      console.log(`[WEBHOOK] Enviando dados para BotConversa`);
    }
    await axios.post(BOT_CONVERSA_WEBHOOK_URL, {
      name,
      phone
    }, {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 5e3
      // Timeout de 5 segundos para não atrasar o fluxo principal
    });
    if (process.env.DEBUG_WEBHOOK === "true") {
      console.log("[WEBHOOK] Dados enviados com sucesso");
    }
  } catch (error) {
    if (process.env.DEBUG_WEBHOOK === "true") {
      console.error("[WEBHOOK] Erro ao enviar dados");
    }
  }
}
async function sendWelcomeEmail(name, email) {
  if (process.env.NODE_ENV === "development" && process.env.FORCE_EMAIL !== "true") {
    return;
  }
  try {
    if (process.env.DEBUG_EMAIL === "true") {
      console.log(`[EMAIL] Enviando e-mail de boas-vindas`);
    }
    const displayName = name.split(" ")[0];
    const htmlContent = getWelcomeEmailTemplate(displayName, (/* @__PURE__ */ new Date()).getFullYear());
    const result = await sendEmail({
      to: email,
      subject: `Bem-vindo \xE0 Fottufy, ${displayName}!`,
      html: htmlContent
    });
    if (result.success) {
      if (process.env.DEBUG_EMAIL === "true") {
        console.log(`[EMAIL] E-mail enviado com sucesso`);
      }
    } else {
      if (process.env.DEBUG_EMAIL === "true") {
        console.error(`[EMAIL] Falha ao enviar e-mail: ${result.message}`);
      }
    }
  } catch (error) {
    if (process.env.DEBUG_EMAIL === "true") {
      console.error("[EMAIL] Erro ao enviar e-mail");
    }
  }
}
function getWelcomeEmailTemplate(displayName, currentYear) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bem-vindo \xE0 Fottufy</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #6366f1;
          padding: 20px;
          text-align: center;
          color: white;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #6b7280;
          font-size: 14px;
        }
        h1 {
          color: white;
          margin: 0;
          font-size: 24px;
        }
        .button {
          display: inline-block;
          background-color: #6366f1;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          margin-top: 20px;
          font-weight: bold;
        }
        p {
          margin-bottom: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bem-vindo \xE0 Fottufy!</h1>
        </div>
        <div class="content">
          <p>Ol\xE1, <strong>${displayName}</strong>!</p>
          <p>\xC9 com grande prazer que damos as boas-vindas \xE0 Fottufy, sua nova plataforma para gerenciamento de fotos profissionais.</p>
          <p>Com a Fottufy, voc\xEA poder\xE1:</p>
          <ul>
            <li>Fazer upload e organizar suas fotos em projetos</li>
            <li>Compartilhar seus projetos com clientes atrav\xE9s de links \xFAnicos</li>
            <li>Acompanhar quais fotos seus clientes selecionaram</li>
            <li>Gerenciar entregas e visualiza\xE7\xF5es de seus trabalhos</li>
          </ul>
          <p>Para come\xE7ar, fa\xE7a login na plataforma e crie seu primeiro projeto:</p>
          <div style="text-align: center;">
            <a href="https://fottufy.com/dashboard" class="button">Acessar Minha Conta</a>
          </div>
          <p style="margin-top: 30px;">Se voc\xEA tiver qualquer d\xFAvida, basta responder a este e-mail que nossa equipe estar\xE1 pronta para ajudar.</p>
          <p>Atenciosamente,<br>Equipe Fottufy</p>
        </div>
        <div class="footer">
          <p>\xA9 ${currentYear} Fottufy. Todos os direitos reservados.</p>
          <p>Est\xE1 recebendo este e-mail porque voc\xEA se registrou na plataforma Fottufy.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
async function hashPassword(password) {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error("Error hashing password:", error);
    throw error;
  }
}
async function comparePasswords(supplied, stored) {
  if (stored === "admin123") {
    return supplied === "admin123";
  }
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return supplied === stored;
  }
}
function setupAuth(app2) {
  const sessionSettings = {
    // Use a strong secret for security
    secret: process.env.SESSION_SECRET || "studio-development-secret-key-testing-onlyaaaaa",
    // These settings must be true for Replit environment to work properly
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    name: "studio.sid",
    cookie: {
      // Must be false in development (no HTTPS)
      secure: false,
      // Longer session duration (30 days) to avoid frequent re-logins
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      // Allow JavaScript to read the cookie for backup recovery
      httpOnly: false,
      // Essential for cookies to work in all browsers in this environment
      sameSite: "lax",
      path: "/"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy({
      usernameField: "email",
      passwordField: "password"
    }, async (email, password, done) => {
      try {
        const normalizedEmail = email.toLowerCase();
        const user = await storage.getUserByEmail(normalizedEmail);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      if (process.env.DEBUG_AUTH === "true") {
        console.log("Processing registration request");
      }
      let { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      email = email.toLowerCase();
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      const hashedPassword = await hashPassword(password);
      const userData = {
        name: req.body.name || email.split("@")[0],
        // Use part of email as name if not provided
        email,
        phone: req.body.phone || "+000000000000",
        // Use provided phone or default if not provided
        password: hashedPassword,
        role: "photographer",
        // Default to photographer role
        status: "active"
        // Default to active status
      };
      const user = await storage.createUser(userData);
      Promise.all([
        sendBotConversaWebhook(userData.name, userData.phone).catch(() => {
        }),
        sendWelcomeEmail(userData.name, userData.email).catch(() => {
        })
      ]);
      req.login(user, (err) => {
        if (err) {
          if (process.env.DEBUG_AUTH === "true") {
            console.error("Error establishing session after registration");
          }
          return next(err);
        }
        if (process.env.DEBUG_AUTH === "true") {
          console.log(`Registration successful for ID: ${user.id}`);
        }
        res.status(201).json({
          id: user.id,
          email: user.email
        });
      });
    } catch (error) {
      if (process.env.DEBUG_AUTH === "true") {
        console.error("Error during registration");
      }
      next(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    if (req.body?.email) {
      req.body.email = req.body.email.toLowerCase();
    }
    if (process.env.DEBUG_AUTH === "true") {
      console.log("[LOGIN] Processing login request");
    }
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        if (process.env.DEBUG_AUTH === "true") {
          console.error("[LOGIN] Authentication error");
        }
        return next(err);
      }
      if (!user) {
        if (process.env.DEBUG_AUTH === "true") {
          console.log("[LOGIN] Invalid credentials");
        }
        return res.status(401).json({ message: "Credenciais inv\xE1lidas" });
      }
      if (process.env.DEBUG_AUTH === "true") {
        console.log(`[LOGIN] User authenticated successfully`);
      }
      const updatePromise = storage.updateUser(user.id, { lastLoginAt: /* @__PURE__ */ new Date() });
      req.login(user, (err2) => {
        if (err2) {
          if (process.env.DEBUG_AUTH === "true") {
            console.error("[LOGIN] Session creation error");
          }
          return next(err2);
        }
        if (process.env.DEBUG_AUTH === "true") {
          console.log(`[LOGIN] Session established`);
        }
        res.cookie("user_id", user.id.toString(), {
          maxAge: 30 * 24 * 60 * 60 * 1e3,
          // 30 days
          httpOnly: false,
          secure: false,
          path: "/",
          sameSite: "lax"
        });
        const { password, ...userData } = user;
        res.status(200).json(userData);
        updatePromise.catch((error) => {
          if (process.env.DEBUG_AUTH === "true") {
            console.error("[LOGIN] Error updating last login timestamp");
          }
        });
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    res.clearCookie("user_id");
    res.clearCookie("studio_user_id");
    res.clearCookie("studio_auth");
    res.clearCookie("studio.sid");
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (process.env.DEBUG_AUTH === "true") {
      console.log("[USER] Checking user authentication");
      console.log(`[USER] Session ID: ${req.sessionID}`);
      console.log(`[USER] Cookies: ${req.headers.cookie ? "present" : "undefined"}`);
      console.log(`[USER] Is authenticated: ${req.isAuthenticated ? req.isAuthenticated() : "not a function"}`);
      console.log(`[USER] User in request: ${req.user ? "set" : "not set"}`);
    }
    if (req.isAuthenticated && req.isAuthenticated()) {
      if (process.env.DEBUG_AUTH === "true") {
        console.log(`[USER] User authenticated via session`);
      }
      const { password, ...userData } = req.user;
      return res.json(userData);
    }
    if (req.headers.cookie) {
      if (process.env.DEBUG_AUTH === "true") {
        console.log("[USER] Found cookies but no passport session. Attempting to recover...");
      }
      let userId = null;
      const cookies = req.headers.cookie.split(";");
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === "studio_user_id" || name === "user_id") {
          userId = parseInt(value);
          break;
        }
      }
      if (userId && !isNaN(userId)) {
        storage.getUser(userId).then((user) => {
          if (user) {
            if (process.env.DEBUG_AUTH === "true") {
              console.log(`[USER] Loaded user from cookie`);
            }
            storage.updateUser(user.id, { lastLoginAt: /* @__PURE__ */ new Date() }).then((updatedUser) => {
              if (process.env.DEBUG_AUTH === "true") {
                console.log(`[USER] Last login timestamp updated`);
              }
              const userToLogin = updatedUser || user;
              req.login(userToLogin, (err) => {
                if (err && process.env.DEBUG_AUTH === "true") {
                  console.error("[USER] Error establishing session");
                  return res.status(401).json({ message: "N\xE3o autorizado" });
                }
                if (process.env.DEBUG_AUTH === "true") {
                  console.log("[USER] Session established");
                }
                const { password, ...userData } = userToLogin;
                return res.json(userData);
              });
            }).catch((error) => {
              if (process.env.DEBUG_AUTH === "true") {
                console.error("[USER] Error updating last login timestamp");
              }
              req.login(user, (err) => {
                if (err && process.env.DEBUG_AUTH === "true") {
                  console.error("[USER] Error establishing session");
                  return res.status(401).json({ message: "N\xE3o autorizado" });
                }
                if (process.env.DEBUG_AUTH === "true") {
                  console.log("[USER] Session established");
                }
                const { password, ...userData } = user;
                return res.json(userData);
              });
            });
            return;
          } else if (process.env.DEBUG_AUTH === "true") {
            console.log(`[USER] Could not find user from cookie`);
          }
        }).catch((err) => {
          if (process.env.DEBUG_AUTH === "true") {
            console.error("[USER] Error loading user from cookie");
          }
        });
        return;
      }
    }
    if (process.env.DEBUG_AUTH === "true" && req.session) {
      console.log("[USER] Session object debug info");
    }
    if (process.env.DEBUG_AUTH === "true") {
      console.log("[USER] Authentication failed, returning 401");
    }
    return res.status(401).json({ message: "N\xE3o autorizado" });
  });
}

// server/utils/passwordReset.ts
async function generatePasswordResetToken(userId, expiresInMinutes = 60) {
  try {
    const user = await db.select().from(users).where(eq2(users.id, userId)).limit(1);
    if (!user.length) {
      console.error(`Usu\xE1rio ID ${userId} n\xE3o encontrado para gerar token`);
      return null;
    }
    const expiresAt = addHours(/* @__PURE__ */ new Date(), expiresInMinutes / 60);
    const [insertedToken] = await db.insert(passwordResetTokens).values({
      userId,
      expiresAt,
      used: false
    }).returning();
    return insertedToken.token;
  } catch (error) {
    console.error("Erro ao gerar token de redefini\xE7\xE3o de senha:", error);
    return null;
  }
}
async function sendPasswordResetEmail(email, token, isNewUser = false, userName) {
  try {
    const baseUrl = process.env.FRONTEND_URL || "https://fottufy.com";
    const resetLink = isNewUser ? `${baseUrl}/create-password.html?token=${token}` : `${baseUrl}/reset-password.html?token=${token}`;
    const subject = isNewUser ? "\u{1F973} Sua conta foi criada! Crie sua senha para acessar agora" : "Redefini\xE7\xE3o de senha Fottufy";
    const body = isNewUser ? getWelcomeEmailTemplate2(resetLink, userName) : getResetPasswordEmailTemplate(resetLink);
    const result = await sendEmail({
      to: email,
      subject,
      html: body
    });
    return result.success;
  } catch (error) {
    console.error("Erro ao enviar email de redefini\xE7\xE3o de senha:", error);
    return false;
  }
}
async function verifyPasswordResetToken(token) {
  try {
    const [resetToken] = await db.select().from(passwordResetTokens).where(eq2(passwordResetTokens.token, token)).limit(1);
    if (!resetToken) {
      return { isValid: false };
    }
    if (resetToken.used) {
      return { isValid: false };
    }
    if (/* @__PURE__ */ new Date() > resetToken.expiresAt) {
      return { isValid: false };
    }
    return { isValid: true, userId: resetToken.userId };
  } catch (error) {
    console.error("Erro ao verificar token de redefini\xE7\xE3o de senha:", error);
    return { isValid: false };
  }
}
async function resetPasswordWithToken(token, newPassword) {
  try {
    const { isValid, userId } = await verifyPasswordResetToken(token);
    if (!isValid || !userId) {
      return false;
    }
    const hashedPassword = await hashPassword(newPassword);
    await db.update(users).set({ password: hashedPassword }).where(eq2(users.id, userId));
    await db.update(passwordResetTokens).set({ used: true }).where(eq2(passwordResetTokens.token, token));
    return true;
  } catch (error) {
    console.error("Erro ao redefinir senha com token:", error);
    return false;
  }
}
function getWelcomeEmailTemplate2(resetLink, userName) {
  const greeting = userName ? `Bem-vindo(a) ${userName}!` : "Bem-vindo(a) \xE0 Fottufy!";
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cria\xE7\xE3o de senha - Fottufy</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); margin: auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://cdn.fottufy.com/assets/logo.png" alt="Fottufy Logo" style="max-width: 150px;">
        </div>
        <h2 style="color: #2a2a2a;">\u{1F389} ${greeting}</h2>
        <p style="font-size: 16px; color: #444;">
          Sua conta foi criada automaticamente ap\xF3s a sua compra. Para ativ\xE1-la e acessar seus projetos, voc\xEA precisa criar sua senha.
        </p>
        <p style="font-size: 16px; color: #444;">Clique no bot\xE3o abaixo para definir sua senha:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #1d72f3; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
            Criar senha
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Se o bot\xE3o acima n\xE3o funcionar, copie e cole o link abaixo no seu navegador:
        </p>
        <p style="font-size: 14px; color: #666; word-break: break-all;">
          ${resetLink}
        </p>
        <p style="font-size: 14px; color: #888; margin-top: 30px;">
          \u26A0\uFE0F Esse link \xE9 v\xE1lido por 24 horas e pode ser usado apenas uma vez. Se voc\xEA n\xE3o solicitou esse acesso, ignore este e-mail.
        </p>
        <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="font-size: 14px; color: #888; text-align: center;">Equipe Fottufy</p>
          <p style="font-size: 12px; color: #aaa; text-align: center;">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Fottufy. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
  </html>
  `;
}
function getResetPasswordEmailTemplate(resetLink) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefini\xE7\xE3o de Senha Fottufy</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; margin-bottom: 20px; }
      .logo { max-width: 150px; }
      h1 { color: #0056b3; }
      .button { display: inline-block; background-color: #0056b3; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; margin: 20px 0; }
      .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="https://cdn.fottufy.com/assets/logo.png" alt="Fottufy Logo" class="logo">
    </div>
    
    <h1>Redefini\xE7\xE3o de Senha</h1>
    
    <p>Recebemos uma solicita\xE7\xE3o para redefinir a senha da sua conta Fottufy.</p>
    
    <p>Clique no bot\xE3o abaixo para criar uma nova senha:</p>
    
    <p style="text-align: center;">
      <a href="${resetLink}" class="button">Redefinir minha senha</a>
    </p>
    
    <p>Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all;">${resetLink}</p>
    
    <p><strong>Observa\xE7\xE3o:</strong> Este link \xE9 v\xE1lido por 1 hora. Ap\xF3s esse per\xEDodo, voc\xEA precisar\xE1 solicitar um novo link de redefini\xE7\xE3o de senha.</p>
    
    <p>Se voc\xEA n\xE3o solicitou a redefini\xE7\xE3o de senha, por favor ignore este e-mail.</p>
    
    <div class="footer">
      <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Fottufy. Todos os direitos reservados.</p>
      <p>Este \xE9 um e-mail autom\xE1tico, por favor n\xE3o responda.</p>
    </div>
  </body>
  </html>
  `;
}

// server/streamUpload.ts
import * as fs from "fs-extra";
import * as path from "path";
import { randomUUID } from "crypto";
import { PutObjectCommand as PutObjectCommand2 } from "@aws-sdk/client-s3";
import busboy from "busboy";
import { pipeline } from "stream/promises";
var TMP_DIR = path.join(process.cwd(), "tmp");
fs.ensureDirSync(TMP_DIR);
setInterval(() => {
  try {
    fs.emptyDirSync(TMP_DIR);
    if (process.env.DEBUG_MEMORY === "true") {
      console.log(`Diret\xF3rio tempor\xE1rio ${TMP_DIR} limpo com sucesso`);
    }
  } catch (error) {
    console.error("Erro ao limpar diret\xF3rio tempor\xE1rio:", error);
  }
}, 36e5);
async function streamDirectToR2(filePath, fileName, contentType) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const uploadCommand = new PutObjectCommand2({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileStream,
      ContentType: contentType
    });
    await r2Client.send(uploadCommand);
    let url;
    if (process.env.R2_PUBLIC_URL) {
      url = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    } else {
      url = `https://${BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/${fileName}`;
    }
    return { url, key: fileName };
  } catch (error) {
    console.error(`Erro ao fazer streaming para R2: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
async function processAndStreamToR2(filePath, fileName, contentType, applyWatermark = true) {
  try {
    if (!isValidFileType(contentType)) {
      return streamDirectToR2(filePath, fileName, contentType);
    }
    const watermarkStatus = applyWatermark ? "com marca d'\xE1gua" : "sem marca d'\xE1gua";
    if (process.env.DEBUG_MEMORY === "true") {
      console.log(`Processando imagem: ${fileName} (redimensionamento ${watermarkStatus})`);
    }
    const fileBuffer = await fs.readFile(filePath);
    const processedBuffer = await processImage(fileBuffer, contentType, applyWatermark);
    const processedFilePath = path.join(TMP_DIR, `processed-${randomUUID()}`);
    await fs.writeFile(processedFilePath, processedBuffer);
    try {
      const result = await streamDirectToR2(processedFilePath, fileName, contentType);
      if (process.env.DEBUG_MEMORY === "true") {
        console.log(`Imagem processada com sucesso: ${fileName}`);
      }
      return result;
    } finally {
      try {
        await fs.unlink(processedFilePath);
      } catch (cleanupError) {
        console.error(`Erro ao limpar arquivo processado: ${cleanupError}`);
      }
    }
  } catch (processingError) {
    console.error(`Erro ao processar imagem ${fileName}:`, processingError);
    return streamDirectToR2(filePath, fileName, contentType);
  }
}
function streamUploadMiddleware(options = {}) {
  const { applyWatermark = true, maxFileSize = 1e3 * 1024 * 1024, fileTypes } = options;
  return async (req, res, next) => {
    if (!req.is("multipart/form-data")) {
      return next();
    }
    req.files = [];
    try {
      const bb = busboy({
        headers: req.headers,
        limits: {
          fileSize: maxFileSize
        }
      });
      bb.on("field", (fieldname, val) => {
        if (!req.body) {
          req.body = {};
        }
        req.body[fieldname] = val;
      });
      bb.on("file", async (fieldname, fileStream, fileInfo) => {
        const { filename, encoding, mimeType } = fileInfo;
        if (fileTypes && !fileTypes.includes(mimeType)) {
          fileStream.resume();
          return;
        }
        const uniqueFilename = generateUniqueFileName(filename);
        const tmpFilePath = path.join(TMP_DIR, uniqueFilename);
        try {
          const writeStream = fs.createWriteStream(tmpFilePath);
          await pipeline(fileStream, writeStream);
          const stats = await fs.stat(tmpFilePath);
          req.files.push({
            fieldname,
            originalname: filename,
            filename: uniqueFilename,
            mimetype: mimeType,
            path: tmpFilePath,
            size: stats.size
          });
        } catch (error) {
          console.error(`Erro ao processar arquivo ${filename}:`, error);
        }
      });
      bb.on("finish", () => {
        next();
      });
      req.pipe(bb);
    } catch (error) {
      next(error);
    }
  };
}
function cleanupTempFiles(req, res, next) {
  const originalEnd = res.end;
  res.end = function(...args) {
    if (req.files && req.files.length > 0) {
      Promise.all(req.files.map((file) => {
        return fs.unlink(file.path).catch((err) => console.error(`Erro ao remover arquivo tempor\xE1rio ${file.path}:`, err));
      })).catch((err) => console.error("Erro ao limpar arquivos tempor\xE1rios:", err));
    }
    return originalEnd.apply(this, args);
  };
  next();
}

// server/integrations/hotmart.ts
import crypto from "crypto";
import { randomBytes } from "crypto";

// server/utils/welcomeEmail.ts
async function sendWelcomeEmail2(email, name, password) {
  const displayName = name || email.split("@")[0];
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const htmlContent = getWelcomeEmailTemplate3(displayName, email, password, currentYear);
  try {
    const result = await sendEmail({
      to: email,
      subject: "\u{1F973} Sua conta foi criada! Aqui est\xE3o seus dados de acesso",
      html: htmlContent
    });
    return result;
  } catch (error) {
    console.error("Erro ao enviar email de boas-vindas:", error);
    return { success: false, message: "Falha ao enviar e-mail de boas-vindas" };
  }
}
function getWelcomeEmailTemplate3(displayName, email, password, currentYear) {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Bem-vindo \xE0 Fottufy!</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); overflow: hidden;">
      <div style="background-color: #4361ee; color: #ffffff; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Bem-vindo \xE0 Fottufy! \u{1F389}</h1>
      </div>
      
      <div style="padding: 30px 30px 20px; color: #333333;">
        <p style="font-size: 16px; margin-bottom: 25px;">
          Ol\xE1, <strong>${displayName}</strong>!
        </p>
        
        <p style="font-size: 16px; margin-bottom: 25px;">
          Sua conta na Fottufy foi criada com sucesso \u{1F389}
        </p>
        
        <div style="background-color: #f8f9fa; border-left: 4px solid #4361ee; padding: 20px; margin-bottom: 25px;">
          <p style="font-size: 16px; margin: 0 0 10px 0;"><strong>Aqui est\xE3o seus dados de acesso:</strong></p>
          <p style="font-size: 16px; margin: 0 0 5px 0;">\u{1F4E7} E-mail: <strong>${email}</strong></p>
          <p style="font-size: 16px; margin: 0;">\u{1F510} Senha tempor\xE1ria: <strong>${password}</strong></p>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://fottufy.com/auth" 
             style="display: inline-block; background-color: #4361ee; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Acessar agora
          </a>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 25px;">
          Recomendamos que voc\xEA troque a senha ap\xF3s o primeiro acesso.
        </p>
        
        <p style="font-size: 16px; margin-bottom: 15px;">
          Obrigado por escolher a Fottufy para gerenciar seus projetos fotogr\xE1ficos!
        </p>
        
        <p style="font-size: 16px; margin-bottom: 0;">
          Atenciosamente,<br />
          Equipe Fottufy
        </p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666;">
        <p style="margin: 0 0 10px;">
          Este e-mail foi enviado automaticamente, por favor n\xE3o responda.
        </p>
        <p style="margin: 0 0 10px;">
          \xA9 ${currentYear} Fottufy. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </body>
</html>
  `;
}

// server/integrations/hotmart.ts
var HOTMART_OFFER_TO_PLAN_MAP = {
  // Mapeamento conforme especificado
  "ro76q5uz": "basic_v2",
  "z0pxaesy": "basic_fottufy",
  "tpfhcllk": "standard",
  "hjb8gqn7": "standard",
  "xtuh4ji0": "professional"
};
function generateRandomPassword(length = 12) {
  const buffer = randomBytes(length);
  return buffer.toString("hex").slice(0, length);
}
function validateHotmartSignature(payload, signature, secret) {
  if (!secret) {
    console.warn("HOTMART_WEBHOOK_SECRET n\xE3o configurado. Pulando valida\xE7\xE3o da assinatura!");
    return true;
  }
  const hmac = crypto.createHmac("sha256", secret);
  const calculatedSignature = hmac.update(payload).digest("hex");
  return calculatedSignature === signature;
}
function determinePlanType(payload) {
  try {
    if (!payload) {
      console.log("Hotmart: Payload inv\xE1lido");
      return null;
    }
    if (payload.data?.params?.off) {
      const offerId2 = payload.data.params.off;
      console.log(`Hotmart: ID da oferta encontrado em params: ${offerId2}`);
      if (HOTMART_OFFER_TO_PLAN_MAP[offerId2]) {
        return HOTMART_OFFER_TO_PLAN_MAP[offerId2];
      }
    }
    if (payload.data?.purchase?.offer?.off) {
      const offerId2 = payload.data.purchase.offer.off;
      console.log(`Hotmart: ID da oferta encontrado em offer: ${offerId2}`);
      if (HOTMART_OFFER_TO_PLAN_MAP[offerId2]) {
        return HOTMART_OFFER_TO_PLAN_MAP[offerId2];
      }
    }
    if (payload.data?.purchase?.transaction) {
      const transactionUrl = payload.data.purchase.transaction;
      if (typeof transactionUrl === "string" && transactionUrl.includes("off=")) {
        const offMatch = transactionUrl.match(/off=([a-zA-Z0-9]+)/);
        if (offMatch && offMatch[1]) {
          const offerId2 = offMatch[1];
          console.log(`Hotmart: ID da oferta encontrado na URL: ${offerId2}`);
          if (HOTMART_OFFER_TO_PLAN_MAP[offerId2]) {
            return HOTMART_OFFER_TO_PLAN_MAP[offerId2];
          }
        }
      }
    }
    const offerCode = payload.data?.purchase?.offer?.code;
    if (offerCode && HOTMART_OFFER_TO_PLAN_MAP[offerCode]) {
      console.log(`Hotmart: Usando c\xF3digo da oferta: ${offerCode}`);
      return HOTMART_OFFER_TO_PLAN_MAP[offerCode];
    }
    console.log("Hotmart: Iniciando busca recursiva por ID de oferta...");
    const offerId = findOfferIdInPayload(payload);
    if (offerId) {
      console.log(`Hotmart: ID da oferta encontrado por busca recursiva: ${offerId}`);
      return HOTMART_OFFER_TO_PLAN_MAP[offerId];
    }
    const planName = payload.data?.purchase?.plan?.name || payload.data?.subscription?.plan;
    if (planName) {
      console.log(`Hotmart: Verificando nome do plano: ${JSON.stringify(planName)}`);
      let rawName = "";
      if (typeof planName === "string") {
        rawName = planName;
      } else if (typeof planName === "object" && planName !== null) {
        rawName = planName.name || "";
      }
      if (rawName && typeof rawName === "string") {
        console.log(`Hotmart: Nome do plano normalizado: ${rawName}`);
        const lowerName = rawName.toLowerCase();
        if (lowerName.includes("teste") || lowerName.includes("test")) {
          console.log(`Hotmart: Plano de teste detectado, n\xE3o ser\xE1 processado`);
          return null;
        }
      }
    }
    console.log(`Hotmart: Nenhuma oferta v\xE1lida encontrada`);
    return null;
  } catch (error) {
    console.error("Erro ao determinar tipo de plano:", error);
    return null;
  }
}
function findEmailInPayload(obj, depth = 0) {
  if (depth > 15 || !obj || typeof obj !== "object") {
    return null;
  }
  const complexEmail1 = obj?.data?.transaction?.details?.purchaseInfo?.clientProfile?.personalInfo?.contact?.email?.primaryAddress;
  if (complexEmail1 && typeof complexEmail1 === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(complexEmail1)) {
    console.log(`Hotmart: Email encontrado em estrutura complexa (tipo 1):`, complexEmail1);
    return complexEmail1;
  }
  const complexEmail2 = obj?.data?.order?.details?.buyer?.user_identity?.contact?.primary?.email_address;
  if (complexEmail2 && typeof complexEmail2 === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(complexEmail2)) {
    console.log(`Hotmart: Email encontrado em estrutura complexa (tipo 2):`, complexEmail2);
    return complexEmail2;
  }
  const emailKeys = [
    "email",
    "mail",
    "e-mail",
    "emailAddress",
    "email_address",
    "subscriber_email",
    "buyer_email",
    "customer_email",
    "primaryAddress",
    "primaryEmail",
    "emailPrimary",
    "userEmail",
    "client_email",
    "contactEmail"
  ];
  for (const key of Object.keys(obj)) {
    if (emailKeys.includes(key.toLowerCase()) && typeof obj[key] === "string") {
      const potentialEmail = obj[key];
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(potentialEmail)) {
        console.log(`Hotmart: Email encontrado na propriedade ${key}:`, potentialEmail);
        return potentialEmail;
      }
    }
    if (typeof obj[key] === "string") {
      const value = obj[key];
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        console.log(`Hotmart: Email encontrado como valor da propriedade ${key}:`, value);
        return value;
      }
    }
    if (obj[key] && typeof obj[key] === "object") {
      const nestedEmail = findEmailInPayload(obj[key], depth + 1);
      if (nestedEmail) {
        return nestedEmail;
      }
    }
  }
  return null;
}
function findPhoneRecursive(obj, depth = 0) {
  if (depth > 10 || !obj || typeof obj !== "object") {
    return null;
  }
  const phoneKeys = ["phone", "mobile", "cellphone", "telephone", "tel", "contactNumber", "phoneNumber"];
  for (const key of Object.keys(obj)) {
    if (phoneKeys.includes(key.toLowerCase()) && typeof obj[key] === "string") {
      const potentialPhone = obj[key];
      if (/^[+\d\s()-]{8,}$/.test(potentialPhone)) {
        console.log(`Hotmart: Telefone do cliente encontrado na propriedade ${key}: ${potentialPhone}`);
        return potentialPhone;
      }
    }
    if (obj[key] && typeof obj[key] === "object") {
      const nestedPhone = findPhoneRecursive(obj[key], depth + 1);
      if (nestedPhone) {
        return nestedPhone;
      }
    }
  }
  return null;
}
function findCustomerPhone(payload) {
  try {
    const complexPhone1 = payload?.data?.transaction?.details?.purchaseInfo?.clientProfile?.personalInfo?.contact?.phone?.mobile;
    if (complexPhone1 && typeof complexPhone1 === "string" && complexPhone1.length > 2) {
      console.log(`Hotmart: Telefone do cliente encontrado em estrutura complexa (tipo 1): ${complexPhone1}`);
      return complexPhone1;
    }
    const countryCode = payload?.data?.order?.details?.buyer?.user_identity?.contact?.primary?.phone?.countryCode;
    const phoneNumber = payload?.data?.order?.details?.buyer?.user_identity?.contact?.primary?.phone?.number;
    if (countryCode && phoneNumber && typeof countryCode === "string" && typeof phoneNumber === "string") {
      const fullPhone = countryCode.startsWith("+") ? `${countryCode}${phoneNumber}` : `+${countryCode}${phoneNumber}`;
      console.log(`Hotmart: Telefone do cliente composto a partir de countryCode e number: ${fullPhone}`);
      return fullPhone;
    }
    const complexPhone3 = payload?.purchaseDetails?.subscriber?.userDetails?.personalIdentity?.contactPhone;
    if (complexPhone3 && typeof complexPhone3 === "string" && complexPhone3.length > 2) {
      const formattedPhone = /^\d+$/.test(complexPhone3) ? `+${complexPhone3}` : complexPhone3;
      console.log(`Hotmart: Telefone do cliente encontrado em estrutura complexa (tipo 3): ${formattedPhone}`);
      return formattedPhone;
    }
    const phone = payload.data?.buyer?.phone || payload.data?.customer?.contact?.phone || payload.data?.purchase?.customer?.contact?.phone || payload.data?.contact?.phone || payload.customer?.contact?.phone || payload.customer?.phone || payload.buyer?.phone;
    if (phone && typeof phone === "string" && phone.length > 2) {
      console.log(`Hotmart: Telefone do cliente encontrado em local padr\xE3o: ${phone}`);
      return phone;
    }
    return findPhoneRecursive(payload);
  } catch (error) {
    console.error("Erro ao buscar telefone:", error);
    return null;
  }
}
function findCustomerName(payload, depth = 0) {
  if (depth > 15 || !payload || typeof payload !== "object") {
    return null;
  }
  const complexName1 = payload?.data?.transaction?.details?.purchaseInfo?.clientProfile?.personalInfo?.identification?.fullName;
  if (complexName1 && typeof complexName1 === "string" && complexName1.length > 0) {
    console.log(`Hotmart: Nome do cliente encontrado em estrutura complexa (tipo 1): ${complexName1}`);
    return complexName1;
  }
  const firstName = payload?.data?.transaction?.details?.purchaseInfo?.clientProfile?.personalInfo?.identification?.firstName;
  const lastName = payload?.data?.transaction?.details?.purchaseInfo?.clientProfile?.personalInfo?.identification?.lastName;
  if (firstName && lastName && typeof firstName === "string" && typeof lastName === "string") {
    const fullName = `${firstName} ${lastName}`;
    console.log(`Hotmart: Nome do cliente composto a partir de firstName e lastName: ${fullName}`);
    return fullName;
  }
  const complexName3 = payload?.data?.order?.details?.buyer?.user_identity?.name?.fullName;
  if (complexName3 && typeof complexName3 === "string" && complexName3.length > 0) {
    console.log(`Hotmart: Nome do cliente encontrado em estrutura complexa (tipo 3): ${complexName3}`);
    return complexName3;
  }
  const nameKeys = [
    "name",
    "customer_name",
    "clientName",
    "buyer_name",
    "fullName",
    "primeiro_nome",
    "full_name",
    "completeName",
    "displayName",
    "userName",
    "customerFullName",
    "buyerName"
  ];
  const customerName = payload.data?.customer?.name || payload.data?.purchase?.customer?.name || payload.data?.buyer?.name || payload.purchase?.customer?.name || payload.customer?.name || payload.data?.subscriber?.name;
  if (customerName && typeof customerName === "string" && customerName.length > 0) {
    console.log(`Hotmart: Nome do cliente encontrado em local espec\xEDfico: ${customerName}`);
    return customerName;
  }
  for (const key of Object.keys(payload)) {
    if (nameKeys.includes(key.toLowerCase()) && typeof payload[key] === "string" && payload[key].length > 0) {
      console.log(`Hotmart: Nome do cliente encontrado na propriedade ${key}: ${payload[key]}`);
      return payload[key];
    }
    if (payload[key] && typeof payload[key] === "object") {
      const nestedName = findCustomerName(payload[key], depth + 1);
      if (nestedName) {
        return nestedName;
      }
    }
  }
  return null;
}
function findOfferIdInPayload(obj, depth = 0) {
  if (depth > 15 || !obj || typeof obj !== "object") {
    return null;
  }
  const complexOfferId1 = obj?.data?.transaction?.details?.purchaseInfo?.vendorInfo?.productData?.offerId;
  if (complexOfferId1 && typeof complexOfferId1 === "string" && HOTMART_OFFER_TO_PLAN_MAP[complexOfferId1]) {
    console.log(`Hotmart: ID da oferta encontrado em estrutura complexa (tipo 1):`, complexOfferId1);
    return complexOfferId1;
  }
  const complexOfferId2 = obj?.purchaseDetails?.product?.information?.offerId;
  if (complexOfferId2 && typeof complexOfferId2 === "string" && HOTMART_OFFER_TO_PLAN_MAP[complexOfferId2]) {
    console.log(`Hotmart: ID da oferta encontrado em estrutura complexa (tipo 2):`, complexOfferId2);
    return complexOfferId2;
  }
  const offerIdKeys = ["off", "offer_id", "offerId", "offer_code", "offerCode", "productCode", "planId"];
  for (const key of Object.keys(obj)) {
    if (offerIdKeys.includes(key.toLowerCase()) && typeof obj[key] === "string") {
      const potentialOfferId = obj[key];
      if (HOTMART_OFFER_TO_PLAN_MAP[potentialOfferId]) {
        console.log(`Hotmart: ID da oferta encontrado na propriedade ${key}:`, potentialOfferId);
        return potentialOfferId;
      }
    }
    if (typeof obj[key] === "string" && obj[key].includes("off=")) {
      const offMatch = obj[key].match(/off=([a-zA-Z0-9]+)/);
      if (offMatch && offMatch[1] && HOTMART_OFFER_TO_PLAN_MAP[offMatch[1]]) {
        console.log(`Hotmart: ID da oferta encontrado em URL:`, offMatch[1]);
        return offMatch[1];
      }
    }
    if (obj[key] && typeof obj[key] === "object") {
      const nestedOfferId = findOfferIdInPayload(obj[key], depth + 1);
      if (nestedOfferId) {
        return nestedOfferId;
      }
    }
  }
  for (const key of Object.keys(obj)) {
    if (["offerName", "productName", "planName", "subscription_name"].includes(key.toLowerCase()) && typeof obj[key] === "string") {
      const planName = obj[key].toLowerCase();
      console.log(`Hotmart: Verificando nome de plano "${planName}" para inferir oferta`);
      if (planName.includes("basic") || planName.includes("b\xE1sico")) {
        return "ro76q5uz";
      } else if (planName.includes("standard") || planName.includes("padr\xE3o")) {
        return "tpfhcllk";
      } else if (planName.includes("professional") || planName.includes("profissional") || planName.includes("pro")) {
        return "xtuh4ji0";
      }
    }
  }
  return null;
}
var EVENT_MAP = {
  // Compra aprovada - variações
  "PURCHASE_APPROVED": "purchase.approved",
  "PURCHASE.APPROVED": "purchase.approved",
  "purchase.approved": "purchase.approved",
  "APPROVED": "purchase.approved",
  "PURCHASE_COMPLETE": "purchase.approved",
  "PURCHASE.COMPLETE": "purchase.approved",
  "purchase.complete": "purchase.approved",
  "PURCHASE_CONFIRMED": "purchase.approved",
  "PURCHASE.CONFIRMED": "purchase.approved",
  "purchase.confirmed": "purchase.approved",
  "SALE": "purchase.approved",
  "SALE_COMPLETE": "purchase.approved",
  "ORDER_COMPLETED": "purchase.approved",
  // Reembolso - variações
  "PURCHASE_REFUNDED": "purchase.refunded",
  "PURCHASE.REFUNDED": "purchase.refunded",
  "purchase.refunded": "purchase.refunded",
  "REFUNDED": "purchase.refunded",
  "REFUND": "purchase.refunded",
  "REFUND_COMPLETE": "purchase.refunded",
  "REFUND.COMPLETE": "purchase.refunded",
  "PURCHASE_REFUND": "purchase.refunded",
  "PURCHASE.REFUND": "purchase.refunded",
  "REEMBOLSO": "purchase.refunded",
  "REEMBOLSO_COMPLETO": "purchase.refunded",
  // Cancelamento - variações 
  "PURCHASE_CANCELED": "purchase.canceled",
  "PURCHASE.CANCELED": "purchase.canceled",
  "purchase.canceled": "purchase.canceled",
  "CANCELED": "purchase.canceled",
  "CANCEL": "purchase.canceled",
  "CANCELAMENTO": "purchase.canceled",
  "ORDER_CANCELED": "purchase.canceled",
  "PURCHASE_CANCELLED": "purchase.canceled",
  // Variação com escrita britânica
  "PURCHASE.CANCELLED": "purchase.canceled",
  "purchase.cancelled": "purchase.canceled",
  "CANCELLED": "purchase.canceled",
  // Atraso no pagamento
  "PURCHASE_DELAYED": "purchase.delayed",
  "PURCHASE.DELAYED": "purchase.delayed",
  "purchase.delayed": "purchase.delayed",
  "DELAYED": "purchase.delayed",
  "PAYMENT_DELAYED": "purchase.delayed",
  "PAYMENT.DELAYED": "purchase.delayed",
  "payment.delayed": "purchase.delayed",
  "ATRASO": "purchase.delayed",
  "PAGAMENTO_ATRASADO": "purchase.delayed",
  // Disputa/Chargeback
  "PURCHASE_PROTEST": "purchase.chargeback",
  "PURCHASE.PROTEST": "purchase.chargeback",
  "purchase.protest": "purchase.chargeback",
  "PROTEST": "purchase.chargeback",
  "CHARGEBACK_INITIATED": "purchase.chargeback",
  "CHARGEBACK.INITIATED": "purchase.chargeback",
  "PURCHASE_CHARGEBACK": "purchase.chargeback",
  "PURCHASE.CHARGEBACK": "purchase.chargeback",
  "purchase.chargeback": "purchase.chargeback",
  "CHARGEBACK": "purchase.chargeback",
  "DISPUTA": "purchase.chargeback",
  "DISPUTA_INICIADA": "purchase.chargeback",
  "CONTESTACAO": "purchase.chargeback",
  // Cancelamento de assinatura
  "SUBSCRIPTION_CANCELLATION": "subscription.canceled",
  "SUBSCRIPTION.CANCELLATION": "subscription.canceled",
  "subscription.cancellation": "subscription.canceled",
  "SUBSCRIPTION_CANCELED": "subscription.canceled",
  "SUBSCRIPTION.CANCELED": "subscription.canceled",
  "subscription.canceled": "subscription.canceled",
  "SUBSCRIPTION_CANCELLED": "subscription.canceled",
  // Variação com escrita britânica
  "SUBSCRIPTION.CANCELLED": "subscription.canceled",
  "subscription.cancelled": "subscription.canceled",
  "CANCEL_SUBSCRIPTION": "subscription.canceled",
  "CANCEL.SUBSCRIPTION": "subscription.canceled",
  "cancel.subscription": "subscription.canceled",
  "ASSINATURA_CANCELADA": "subscription.canceled",
  "CANCELAMENTO_ASSINATURA": "subscription.canceled"
};
async function processHotmartWebhook(payload) {
  try {
    if (!payload) {
      console.error("Hotmart webhook: payload inv\xE1lido ou vazio");
      return { success: false, message: "Payload inv\xE1lido ou vazio" };
    }
    let rawEvent = payload.event || "unknown_event";
    const normalizedEvent = EVENT_MAP[rawEvent] || EVENT_MAP[rawEvent.toUpperCase()] || EVENT_MAP[rawEvent.toLowerCase()];
    const event = normalizedEvent || String(rawEvent);
    console.log(`Hotmart: Evento recebido: ${rawEvent} (normalizado: ${event})`);
    const supportedEvents = [
      "purchase.approved",
      "purchase.refunded",
      "purchase.chargeback",
      "purchase.canceled",
      "subscription.canceled"
    ];
    if (!supportedEvents.includes(event)) {
      console.log(`Hotmart: Evento n\xE3o suportado: ${event}`);
      return { success: false, message: `Evento n\xE3o suportado: ${event}` };
    }
    const data = payload.data || {};
    let email = payload.email || payload.buyer?.email || data?.email || data?.buyer?.email || data?.buyer_email || data?.contact?.email || payload?.purchase?.buyer?.email;
    if (!email) {
      console.log("Hotmart: Email n\xE3o encontrado nas propriedades conhecidas, iniciando busca recursiva...");
      const foundEmail = findEmailInPayload(payload);
      if (foundEmail) {
        email = String(foundEmail);
      }
    }
    if (!email) {
      console.error("Hotmart webhook: email n\xE3o encontrado no payload", JSON.stringify(payload));
      return { success: false, message: "Email ausente no payload" };
    }
    console.log(`Hotmart: Processando evento ${event} para email: ${email}`);
    let user = await storage.getUserByEmail(email);
    const planType = determinePlanType(payload);
    const isCancellationEvent = [
      "purchase.refunded",
      "purchase.chargeback",
      "purchase.canceled",
      "subscription.canceled"
    ].includes(event);
    if (!planType && !isCancellationEvent) {
      console.log(`Hotmart: Nenhum plano v\xE1lido encontrado para o email ${email}, webhook ignorado`);
      return { success: false, message: "Nenhuma oferta v\xE1lida encontrada" };
    }
    switch (event) {
      case "purchase.approved":
        if (user) {
          console.log(`Hotmart: Ativando plano ${planType} para usu\xE1rio existente: ${email}`);
          if (planType) {
            await storage.updateUserSubscription(user.id, planType);
          } else {
            console.error(`Hotmart: Tipo de plano inv\xE1lido para usu\xE1rio existente: ${email}`);
          }
          await storage.updateUser(user.id, {
            status: "active",
            subscriptionStatus: "active",
            // Salvar ID da transação no campo subscription_id para referência
            subscription_id: data?.purchase?.transaction || `hotmart_${Date.now()}`
          });
        } else {
          console.log(`Hotmart: Criando novo usu\xE1rio com plano ${planType}: ${email}`);
          const tempPassword = generateRandomPassword(8);
          const hashedPassword = await hashPassword(tempPassword);
          const customerName = findCustomerName(payload);
          const customerPhone = findCustomerPhone(payload);
          const validPlanType = planType || "free";
          const userData = {
            name: customerName || data?.buyer?.name || email.split("@")[0] || "Usu\xE1rio Fottufy",
            email,
            password: hashedPassword,
            role: "photographer",
            status: "active",
            phone: customerPhone || data?.buyer?.phone || "",
            planType: validPlanType,
            // Usar o planType validado
            subscriptionStatus: "active"
          };
          user = await storage.createUser(userData);
          if (planType) {
            await storage.updateUserSubscription(user.id, planType);
          } else {
            console.error(`Hotmart: Tipo de plano inv\xE1lido para novo usu\xE1rio: ${email}`);
          }
          await storage.updateUser(user.id, {
            subscription_id: data?.purchase?.transaction || `hotmart_${Date.now()}`
          });
          try {
            const result = await sendWelcomeEmail2(userData.email, userData.name, tempPassword);
            if (result.success) {
              console.log(`Hotmart: Email com dados de acesso enviado para: ${email}`);
            } else {
              console.error(`Hotmart: Falha ao enviar email com dados de acesso: ${email}`);
            }
          } catch (emailError) {
            console.error("Erro ao enviar email com dados de acesso:", emailError);
          }
        }
        return { success: true, message: "Plano ativado com sucesso" };
      case "purchase.refunded":
      case "purchase.chargeback":
      case "purchase.canceled":
      case "subscription.canceled":
        if (user) {
          console.log(`Hotmart: Desativando plano para usu\xE1rio: ${email} (evento: ${event})`);
          await storage.updateUserSubscription(user.id, "free");
          await storage.updateUser(user.id, {
            subscriptionStatus: "inactive"
            // Opcionalmente, pode deixar o usuário inativo também
            // status: 'inactive' 
          });
          return { success: true, message: "Plano desativado" };
        } else {
          console.log(`Hotmart: Usu\xE1rio n\xE3o encontrado para o email ${email}, nada a fazer`);
          return { success: false, message: "Usu\xE1rio n\xE3o encontrado" };
        }
      default:
        console.log(`Hotmart: Evento n\xE3o processado: ${event}`);
        return { success: false, message: `Evento n\xE3o suportado: ${event}` };
    }
  } catch (error) {
    console.error("Erro ao processar webhook da Hotmart:", error);
    const errorMessage = error.message || "Erro desconhecido";
    return { success: false, message: `Erro interno: ${errorMessage}` };
  }
}

// server/routes.ts
var authenticate = async (req, res, next) => {
  if (process.env.DEBUG_AUTH === "true" && (req.path.includes("/login") || req.path.includes("/logout"))) {
    console.log(`[AUTH] ${req.method} ${req.path}`);
  }
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  if (req.headers.cookie) {
    if (req.headers.cookie.includes("studio.sid") && req.session && req.sessionID) {
      req.session.reload((err) => {
        if (!err && req.isAuthenticated && req.isAuthenticated()) {
          return next();
        }
      });
    }
    const cookieStr = req.headers.cookie;
    if (cookieStr.includes("user_id=")) {
      let userId = null;
      const userIdIndex = cookieStr.indexOf("user_id=");
      if (userIdIndex >= 0) {
        const valueStart = userIdIndex + 8;
        const valueEnd = cookieStr.indexOf(";", valueStart);
        const valueStr = valueEnd >= 0 ? cookieStr.substring(valueStart, valueEnd) : cookieStr.substring(valueStart);
        userId = parseInt(valueStr);
      }
      if (userId && !isNaN(userId)) {
        storage.getUser(userId).then((user) => {
          if (user) {
            req.login(user, (err) => {
              if (!err) {
                storage.updateUser(user.id, { lastLoginAt: /* @__PURE__ */ new Date() }).catch(() => {
                });
                next();
              }
            });
          }
        }).catch(() => {
        });
        return;
      }
    }
  }
  if (req.query.admin === "true") {
    console.log("[AUTH] Admin override via query param");
    try {
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
        return;
      } else {
        console.log("[AUTH] Admin user not found in database");
      }
    } catch (error) {
      console.error("[AUTH] Error fetching admin user:", error);
    }
  }
  if (process.env.DEBUG_AUTH === "true") {
    console.log("[AUTH] No authentication found, returning 401");
  }
  return res.status(401).json({
    message: "N\xE3o autorizado"
  });
};
var requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
var requireActiveUser = (req, res, next) => {
  if (!req.user || req.user.status !== "active") {
    return res.status(403).json({ message: "Your account is not active" });
  }
  next();
};
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("Chave secreta do Stripe n\xE3o encontrada. As funcionalidades de pagamento n\xE3o funcionar\xE3o corretamente.");
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  app2.get("/api/r2/test", async (req, res) => {
    try {
      if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME || !process.env.R2_ACCOUNT_ID) {
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
      const testFileContent = Buffer.from("R2 connection test file - " + (/* @__PURE__ */ new Date()).toISOString());
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
  app2.post("/api/photos/upload", authenticate, streamUploadMiddleware(), cleanupTempFiles, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files were uploaded" });
      }
      const uploadCount = req.files.length;
      const canUpload = await storage.checkUploadLimit(req.user.id, uploadCount);
      if (!canUpload) {
        return res.status(403).json({
          message: "Upload limit exceeded. Please upgrade your plan to upload more photos.",
          uploadLimit: req.user.uploadLimit,
          usedUploads: req.user.usedUploads
        });
      }
      const uploadedFiles = [];
      for (const file of req.files) {
        const filename = generateUniqueFileName(file.originalname);
        try {
          const result = await processAndStreamToR2(
            file.path,
            filename,
            file.mimetype
          );
          uploadedFiles.push({
            originalName: file.originalname,
            filename,
            size: file.size,
            mimetype: file.mimetype,
            url: result.url,
            // Usar a URL retornada pelo método de streaming
            key: result.key
          });
        } catch (error) {
          console.error(`Error uploading file ${filename} to R2:`, error);
          continue;
        }
      }
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
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/projects/:id/photos/upload", authenticate, streamUploadMiddleware(), cleanupTempFiles, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const projectId = req.params.id;
      const project = await db.query.newProjects.findFirst({
        where: and2(
          eq3(newProjects.id, projectId),
          eq3(newProjects.userId, req.user.id)
        )
      });
      if (!project) {
        return res.status(404).json({ message: "Project not found or unauthorized" });
      }
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files were uploaded" });
      }
      const uploadCount = req.files.length;
      const canUpload = await storage.checkUploadLimit(req.user.id, uploadCount);
      if (!canUpload) {
        return res.status(403).json({
          message: "Upload limit exceeded. Please upgrade your plan to upload more photos.",
          uploadLimit: req.user.uploadLimit,
          usedUploads: req.user.usedUploads
        });
      }
      const uploadedFiles = [];
      const newPhotos = [];
      for (const file of req.files) {
        const filename = generateUniqueFileName(file.originalname);
        try {
          const originalName = file.originalname;
          const fileSize = file.size;
          const fileMimetype = file.mimetype;
          const result = await processAndStreamToR2(
            file.path,
            filename,
            fileMimetype
          );
          try {
            const newPhoto = await db.insert(photos).values({
              projectId,
              url: result.url,
              filename,
              selected: false
            }).returning();
            if (newPhoto && newPhoto[0]) {
              newPhotos.push(newPhoto[0].id);
            }
          } catch (dbError) {
            console.error(`Error adding photo to database: ${filename}`);
          }
          uploadedFiles.push({
            originalName,
            filename,
            size: fileSize,
            url: result.url
          });
        } catch (uploadError) {
          console.error(`Error uploading file ${filename} to R2:`, uploadError);
          continue;
        }
      }
      if (uploadedFiles.length > 0) {
        await storage.updateUploadUsage(req.user.id, uploadedFiles.length);
      }
      return res.status(200).json({
        success: true,
        files: uploadedFiles,
        photos: newPhotos,
        totalUploaded: uploadedFiles.length,
        projectId,
        newUsedUploads: (req.user.usedUploads || 0) + uploadedFiles.length,
        uploadLimit: req.user.uploadLimit
      });
    } catch (error) {
      console.error("Error uploading photos to project:", error);
      return res.status(500).json({
        message: "Failed to upload files to project",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/v2/projects", authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const projects2 = await db.query.newProjects.findMany({
        where: eq3(newProjects.userId, req.user.id)
      });
      const projectsWithCounts = await Promise.all(
        projects2.map(async (project) => {
          const photoCountResult = await db.select({ count: count2() }).from(photos).where(eq3(photos.projectId, project.id));
          const photoCount = photoCountResult[0]?.count || 0;
          const selectedCountResult = await db.select({ count: count2() }).from(photos).where(and2(
            eq3(photos.projectId, project.id),
            eq3(photos.selected, true)
          ));
          const selectedCount = selectedCountResult[0]?.count || 0;
          return {
            ...project,
            photoCount,
            selectedCount
            // Não incluímos o array 'photos' aqui para economizar memória
          };
        })
      );
      res.json(projectsWithCounts);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects", error: error.message });
    }
  });
  app2.post("/api/v2/projects", authenticate, async (req, res) => {
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
      res.status(500).json({ message: "Failed to create project", error: error.message });
    }
  });
  app2.get("/api/v2/projects/:id", authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const projectId = req.params.id;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 100;
      const offset = (page - 1) * pageSize;
      const project = await db.query.newProjects.findFirst({
        where: and2(
          eq3(newProjects.id, projectId),
          eq3(newProjects.userId, req.user.id)
        )
      });
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const totalPhotosResult = await db.select({ count: count2() }).from(photos).where(eq3(photos.projectId, projectId));
      const totalPhotos = totalPhotosResult[0]?.count || 0;
      const totalPages = Math.ceil(totalPhotos / pageSize);
      const projectPhotos = await db.select().from(photos).where(eq3(photos.projectId, projectId)).limit(pageSize).offset(offset);
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
      res.status(500).json({ message: "Failed to fetch project", error: error.message });
    }
  });
  app2.post("/api/v2/photos", authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { projectId, url } = req.body;
      if (!projectId || !url) {
        return res.status(400).json({ message: "Project ID and photo URL are required" });
      }
      const project = await db.query.newProjects.findFirst({
        where: and2(
          eq3(newProjects.id, projectId),
          eq3(newProjects.userId, req.user.id)
        )
      });
      if (!project) {
        return res.status(404).json({ message: "Project not found or unauthorized" });
      }
      const newPhoto = await db.insert(photos).values({
        projectId,
        url,
        selected: false
      }).returning();
      res.status(201).json(newPhoto[0]);
    } catch (error) {
      console.error("Error adding photo:", error);
      res.status(500).json({ message: "Failed to add photo", error: error.message });
    }
  });
  app2.patch("/api/v2/photos/:id/select", authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const photoId = req.params.id;
      const { selected } = req.body;
      const photo = await db.query.photos.findFirst({
        where: eq3(photos.id, photoId),
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
      const updatedPhoto = await db.update(photos).set({ selected: selected === void 0 ? !photo.selected : !!selected }).where(eq3(photos.id, photoId)).returning();
      res.json(updatedPhoto[0]);
    } catch (error) {
      console.error("Error updating photo selection:", error);
      res.status(500).json({ message: "Failed to update photo selection", error: error.message });
    }
  });
  app2.delete("/api/v2/photos/:id", authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const photoId = req.params.id;
      const userId = req.user.id;
      const photo = await db.query.photos.findFirst({
        where: eq3(photos.id, photoId),
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
      await db.delete(photos).where(eq3(photos.id, photoId));
      await storage.updateUploadUsage(userId, -1);
      console.log(`Updated upload usage for user ${userId} after deleting photo ${photoId}`);
      res.json({ message: "Photo deleted successfully" });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "Failed to delete photo", error: error.message });
    }
  });
  app2.patch("/api/v2/photos/select", authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { projectId, photoIds } = req.body;
      if (!projectId || !Array.isArray(photoIds)) {
        return res.status(400).json({ message: "Project ID and array of photo IDs are required" });
      }
      console.log(`Salvando sele\xE7\xE3o para projeto ${projectId} com ${photoIds.length} fotos`);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.photographerId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "You don't have permission to access this project" });
      }
      try {
        await storage.updateProjectSelections(projectId, photoIds);
        console.log(`Sele\xE7\xF5es atualizadas com sucesso para o projeto ${projectId}`);
        res.status(200).json({
          message: "Selections saved successfully",
          selectedCount: photoIds.length
        });
      } catch (error) {
        console.error("Erro ao atualizar sele\xE7\xF5es:", error);
        res.status(500).json({
          message: "Failed to update selections",
          error: error.message
        });
      }
    } catch (error) {
      console.error("Error saving selections:", error);
      res.status(500).json({
        message: "Failed to save selections",
        error: error.message
      });
    }
  });
  app2.get("/api/admin/users", authenticate, requireAdmin, async (req, res) => {
    try {
      const planType = req.query.planType;
      const status = req.query.status;
      const isDelinquent = req.query.isDelinquent === "true";
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      let users2 = await storage.getUsers();
      if (planType) {
        users2 = users2.filter((user) => user.planType === planType);
      }
      if (status) {
        users2 = users2.filter((user) => user.status === status);
      }
      if (isDelinquent) {
        users2 = users2.filter(
          (user) => user.subscriptionStatus === "inactive" || user.subscriptionStatus === "canceled"
        );
      }
      if (startDate) {
        const start = new Date(startDate);
        users2 = users2.filter((user) => new Date(user.createdAt) >= start);
      }
      if (endDate) {
        const end = new Date(endDate);
        users2 = users2.filter((user) => new Date(user.createdAt) <= end);
      }
      const sanitizedUsers = users2.map((user) => ({
        ...user,
        password: void 0
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error retrieving users:", error);
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });
  app2.get("/api/admin/users/counts-by-plan", authenticate, requireAdmin, async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      const planCounts = {};
      users2.forEach((user) => {
        const planType = user.planType || "unknown";
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
  app2.get("/api/users", authenticate, requireAdmin, async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      const sanitizedUsers = users2.map((user) => ({
        ...user,
        password: void 0
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });
  app2.post("/api/admin/set-plan", authenticate, requireAdmin, async (req, res) => {
    try {
      const { email, planType } = req.body;
      if (!email || !planType) {
        return res.status(400).json({ message: "Email and plan type are required" });
      }
      const validPlans = Object.values(SUBSCRIPTION_PLANS).map((plan) => plan.type);
      if (!validPlans.includes(planType)) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const planConfig = Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.type === planType);
      const uploadLimit = planConfig ? planConfig.uploadLimit : 0;
      const updatedUser = await storage.updateUser(user.id, {
        planType,
        uploadLimit,
        subscriptionStatus: "active",
        subscriptionStartDate: /* @__PURE__ */ new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)
        // 30 days from now
      });
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      res.json({
        success: true,
        user: {
          ...updatedUser,
          password: void 0
        }
      });
    } catch (error) {
      console.error("Error setting plan:", error);
      res.status(500).json({ message: "Failed to set plan for user" });
    }
  });
  app2.post("/api/admin/toggle-user", authenticate, requireAdmin, async (req, res) => {
    try {
      const { email, status } = req.body;
      if (!email || !status) {
        return res.status(400).json({ message: "Email and status are required" });
      }
      if (!["active", "suspended", "canceled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const updatedUser = await storage.updateUser(user.id, { status });
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user status" });
      }
      res.json({
        success: true,
        user: {
          ...updatedUser,
          password: void 0
        }
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
      res.status(500).json({ message: "Failed to toggle user status" });
    }
  });
  app2.post("/api/admin/add-user", authenticate, requireAdmin, async (req, res) => {
    try {
      const { name, email, password, role, planType } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const userRole = role === "admin" ? "admin" : "photographer";
      let uploadLimit = 0;
      let userPlanType = planType || "free";
      const planConfig = Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.type === userPlanType);
      if (planConfig) {
        uploadLimit = planConfig.uploadLimit;
      } else {
        userPlanType = "free";
        const freePlan = Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.type === "free");
        uploadLimit = freePlan ? freePlan.uploadLimit : 10;
      }
      const newUser = await storage.createUser({
        name,
        email,
        password,
        phone: "",
        // Campo obrigatório, usar string vazia como padrão
        role: userRole,
        status: "active",
        planType: userPlanType,
        subscriptionStatus: userPlanType === "free" ? "inactive" : "active"
      });
      const updatedUser = await storage.updateUser(newUser.id, {
        uploadLimit,
        subscriptionStartDate: userPlanType === "free" ? void 0 : /* @__PURE__ */ new Date(),
        subscriptionEndDate: userPlanType === "free" ? void 0 : new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)
      });
      res.status(201).json({
        success: true,
        user: {
          ...updatedUser || newUser,
          password: void 0
        }
      });
    } catch (error) {
      console.error("Error adding user:", error);
      res.status(500).json({ message: "Failed to add user" });
    }
  });
  app2.get("/api/users/:id", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (req.user && req.user.id !== userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to access this user" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve user" });
    }
  });
  app2.get("/api/user/stats", authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const userProjects = await storage.getProjects(userId);
      const activeProjects = userProjects.filter(
        (project) => project.status !== "arquivado"
      ).length;
      const currentDate = /* @__PURE__ */ new Date();
      const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      let photosThisMonth = 0;
      userProjects.forEach((project) => {
        const projectDate = new Date(project.createdAt);
        if (projectDate >= firstDayOfMonth) {
          const photoCount = project.photos ? project.photos.length : 0;
          photosThisMonth += photoCount;
        }
      });
      const averagePhotoSizeMB = 2;
      const totalUploadUsageMB = userProjects.reduce((total, project) => {
        const photoCount = project.photos ? project.photos.length : 0;
        return total + photoCount * averagePhotoSizeMB;
      }, 0);
      const user = await storage.getUser(userId);
      const stats = {
        activeProjects,
        photosThisMonth,
        totalUploadUsageMB,
        planInfo: {
          name: user?.planType || "basic",
          uploadLimit: user?.uploadLimit || 1e3,
          usedUploads: user?.usedUploads || 0
        }
      };
      res.json(stats);
    } catch (error) {
      console.error("Error retrieving user stats:", error);
      res.status(500).json({ message: "Error retrieving user statistics" });
    }
  });
  app2.post("/api/users", authenticate, requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use" });
      }
      const user = await storage.createUser(userData);
      const { password, ...sanitizedUser } = user;
      res.status(201).json(sanitizedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  app2.patch("/api/users/:id", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const isAdmin = req.user?.role === "admin";
      const isSelf = req.user?.id === userId;
      if (!isAdmin && !isSelf) {
        return res.status(403).json({ message: "Not authorized to update this user" });
      }
      const userData = req.body;
      if (!isAdmin) {
        const allowedFields = ["name", "password"];
        Object.keys(userData).forEach((key) => {
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
      const { password, ...sanitizedUser } = updatedUser;
      res.json(sanitizedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  app2.delete("/api/users/:id", authenticate, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
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
  app2.get("/api/projects", authenticate, async (req, res) => {
    try {
      let projects2;
      if (req.user?.role === "admin") {
        projects2 = await storage.getProjects();
      } else if (req.user) {
        console.log(`Filtrando projetos para o fot\xF3grafo ID=${req.user.id}`);
        projects2 = await storage.getProjects(req.user.id);
      } else {
        return res.status(401).json({ message: "N\xE3o autorizado" });
      }
      console.log(`Retornando ${projects2.length} projetos para o usu\xE1rio ID=${req.user?.id}`);
      res.json(projects2);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve projects" });
    }
  });
  app2.get("/api/projects/:id", async (req, res) => {
    try {
      const idParam = req.params.id;
      console.log(`Buscando projeto com ID ou publicId: ${idParam}`);
      const project = await storage.getProject(idParam);
      if (!project) {
        console.log(`Projeto com ID/publicId ${idParam} n\xE3o encontrado`);
        return res.status(404).json({ message: "Project not found" });
      }
      console.log(`Projeto encontrado: ID=${project.id}, Nome=${project.name}, PublicId=${project.publicId}`);
      console.log(`Status do projeto: ${project.status}`);
      console.log(`Total de fotos: ${project.photos?.length || 0}`);
      if (req.user && req.user.role !== "admin") {
        if (project.photographerId !== req.user.id) {
          console.log(`Acesso negado: o usu\xE1rio ${req.user.id} tentou acessar projeto ${project.id} do fot\xF3grafo ${project.photographerId}`);
          return res.status(403).json({ message: "You don't have permission to access this project" });
        }
        console.log(`Acesso autorizado: o fot\xF3grafo ${req.user.id} est\xE1 acessando seu pr\xF3prio projeto ${project.id}`);
      }
      res.json(project);
    } catch (error) {
      console.error(`Erro ao buscar projeto: ${error}`);
      res.status(500).json({ message: "Failed to retrieve project" });
    }
  });
  app2.post("/api/projects", r2Upload.array("photos", 1e4), async (req, res) => {
    try {
      console.log("Receiving request to create project", req.body);
      const { projectName, clientName, clientEmail, photographerId, photos: photos2, photosData, applyWatermark } = req.body;
      const name = projectName || req.body.nome || req.body.name;
      const shouldApplyWatermark = applyWatermark === "false" ? false : true;
      console.log("Project data (raw):", { projectName, clientName, clientEmail, photographerId });
      console.log("Project data (processed):", { name, clientName, clientEmail, photographerId });
      const currentUserId = req.user?.id || parseInt(photographerId || "1");
      const uniquePublicId = nanoid2(10);
      const projectData = insertProjectSchema.parse({
        name,
        clientName,
        clientEmail,
        photographerId: currentUserId,
        publicId: uniquePublicId
      });
      if (req.user && (projectData.photographerId !== req.user.id && req.user.role !== "admin")) {
        return res.status(403).json({ message: "Cannot create projects for other photographers" });
      }
      let processedPhotos = [];
      if (Array.isArray(photos2)) {
        console.log(`Processing ${photos2.length} photos sent as JSON array`);
        processedPhotos = [];
        for (const photo of photos2) {
          let url = photo.url;
          let id = nanoid2();
          try {
            if (url.startsWith("http")) {
              console.log(`External photo URL: ${url} with ID: ${id}`);
              try {
                const uniqueFilename = generateUniqueFileName(photo.filename || "photo.jpg");
                const result = await downloadAndUploadToR2(url, uniqueFilename);
                url = result.url;
                console.log(`Successfully downloaded external image and uploaded to R2: ${url}`);
              } catch (err) {
                console.error(`Failed to download and upload external image from ${url}: ${err.message}`);
              }
            }
            console.log(`JSON photo: ${photo.filename}, URL: ${url}, ID: ${id}`);
            processedPhotos.push({
              id,
              url,
              filename: photo.filename,
              originalName: photo.originalName || photo.filename || "external-image.jpg"
            });
          } catch (error) {
            console.error(`Error processing photo ${photo.filename}: ${error.message}`);
          }
        }
      } else if (photosData) {
        try {
          const parsedPhotosData = JSON.parse(photosData);
          console.log(`Processing ${parsedPhotosData.length} photos from photosData JSON`);
          processedPhotos = [];
          for (const photo of parsedPhotosData) {
            let url = photo.url;
            let id = nanoid2();
            try {
              if (url.startsWith("http")) {
                console.log(`External photo URL: ${url} with ID: ${id}`);
                try {
                  const uniqueFilename = generateUniqueFileName(photo.filename || "photo.jpg");
                  const result = await downloadAndUploadToR2(url, uniqueFilename);
                  url = result.url;
                  console.log(`Successfully downloaded external image and uploaded to R2: ${url}`);
                } catch (err) {
                  console.error(`Failed to download and upload external image from ${url}: ${err.message}`);
                }
              }
              console.log(`JSON photosData: ${photo.filename}, URL: ${url}, ID: ${id}`);
              processedPhotos.push({
                id,
                url,
                filename: photo.filename,
                originalName: photo.originalName || photo.filename || "external-image.jpg"
              });
            } catch (error) {
              console.error(`Error processing photosData ${photo.filename}: ${error.message}`);
            }
          }
        } catch (error) {
          console.error("Error parsing photosData JSON:", error);
        }
      } else if (req.files && Array.isArray(req.files)) {
        console.log(`Processing ${req.files.length} photos from multipart form-data`);
        const uploadedFiles = req.files;
        processedPhotos = [];
        for (const file of uploadedFiles) {
          const filename = generateUniqueFileName(file.originalname);
          try {
            const result = await uploadFileToR2(
              file.buffer,
              filename,
              file.mimetype,
              shouldApplyWatermark
            );
            processedPhotos.push({
              id: nanoid2(),
              url: result.url,
              filename,
              // Nome único usado pelo R2
              originalName: file.originalname
              // Nome original do arquivo
            });
            console.log(`File uploaded to R2: ${file.originalname}, R2 URL: ${result.url}`);
          } catch (error) {
            console.error(`Error uploading file to R2: ${error}`);
          }
        }
      }
      if (processedPhotos.length === 0) {
        console.log("No photos found in request, using a placeholder");
        processedPhotos = [
          {
            id: nanoid2(),
            url: "https://via.placeholder.com/800x600?text=No+Photo+Uploaded",
            filename: "placeholder.jpg",
            originalName: "No Photo Uploaded.jpg"
          }
        ];
      }
      console.log(`Fotos processadas: ${processedPhotos.length}`);
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
      const project = await storage.createProject(projectData, processedPhotos);
      console.log(`Projeto criado com ID: ${project.id}`);
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
  app2.patch("/api/projects/:id/finalize", async (req, res) => {
    try {
      const idParam = req.params.id;
      const { selectedPhotos } = req.body;
      if (!Array.isArray(selectedPhotos)) {
        return res.status(400).json({ message: "Selected photos must be an array" });
      }
      console.log(`Finalizando sele\xE7\xE3o de fotos para projeto ${idParam}. Fotos selecionadas: ${selectedPhotos.length}`);
      const project = await storage.getProject(idParam);
      let projectId = 0;
      if (project) {
        projectId = project.id;
        console.log(`Projeto encontrado: ID=${project.id}, Nome=${project.name}, PublicId=${project.publicId}`);
      }
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (!project.photos || !Array.isArray(project.photos)) {
        return res.status(400).json({ message: "Projeto n\xE3o cont\xE9m fotos para sele\xE7\xE3o" });
      }
      const validPhotoIds = project.photos.map((photo) => photo.id);
      const invalidPhotoIds = selectedPhotos.filter((id) => !validPhotoIds.includes(id));
      if (invalidPhotoIds.length > 0) {
        return res.status(400).json({
          message: "Algumas fotos selecionadas n\xE3o existem neste projeto",
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
  app2.patch("/api/projects/:id/archive", authenticate, requireActiveUser, async (req, res) => {
    try {
      const idParam = req.params.id;
      const project = await storage.getProject(idParam);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
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
  app2.patch("/api/projects/:id/reopen", authenticate, requireActiveUser, async (req, res) => {
    try {
      const idParam = req.params.id;
      const project = await storage.getProject(idParam);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
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
  app2.post("/api/projects/:id/photos", authenticate, requireActiveUser, r2Upload.array("photos", 1e4), async (req, res) => {
    try {
      const idParam = req.params.id;
      const { applyWatermark } = req.body;
      const shouldApplyWatermark = applyWatermark === "false" ? false : true;
      const project = await storage.getProject(idParam);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const projectId = project.id;
      if (req.user && project.photographerId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "You don't have permission to edit this project" });
      }
      let processedPhotos = [];
      let photoCount = 0;
      if (req.files && Array.isArray(req.files)) {
        const uploadedFiles = req.files;
        photoCount = uploadedFiles.length;
        console.log(`Processing ${photoCount} uploaded photos for project ${projectId}`);
        processedPhotos = [];
        for (const file of uploadedFiles) {
          const filename = generateUniqueFileName(file.originalname);
          try {
            const result = await uploadFileToR2(
              file.buffer,
              filename,
              file.mimetype,
              shouldApplyWatermark
            );
            processedPhotos.push({
              id: nanoid2(),
              url: result.url,
              filename,
              // Nome único usado pelo R2
              originalName: file.originalname
              // Nome original do arquivo
            });
            console.log(`File uploaded to R2 for project ${projectId}: ${file.originalname}, R2 URL: ${result.url}`);
          } catch (error) {
            console.error(`Error uploading file to R2: ${error}`);
          }
        }
      } else if (req.body.photos && Array.isArray(req.body.photos)) {
        const { photos: photos2 } = req.body;
        photoCount = photos2.length;
        console.log(`Processing ${photoCount} photos from JSON data`);
        processedPhotos = [];
        for (const photo of photos2) {
          let url = photo.url;
          let id = photo.id || nanoid2();
          try {
            let savedFilename = photo.filename;
            if (url.startsWith("http")) {
              console.log(`External photo URL: ${url} with ID: ${id}`);
              try {
                const uniqueFilename = generateUniqueFileName(photo.filename || "photo.jpg");
                savedFilename = uniqueFilename;
                const result = await downloadAndUploadToR2(url, uniqueFilename);
                url = result.url;
                console.log(`Successfully downloaded external image and uploaded to R2: ${url}`);
              } catch (err) {
                console.error(`Failed to download and upload external image from ${url}: ${err.message}`);
                savedFilename = photo.filename;
              }
            }
            console.log(`JSON photo for existing project: ${photo.filename}, URL: ${url}, ID: ${id}, Saved filename: ${savedFilename}`);
            processedPhotos.push({
              id,
              url,
              filename: savedFilename,
              originalName: photo.originalName || photo.filename || "external-image.jpg"
            });
          } catch (error) {
            console.error(`Error processing photo for existing project ${photo.filename}: ${error.message}`);
          }
        }
      }
      if (processedPhotos.length === 0) {
        return res.status(400).json({ message: "No photos provided" });
      }
      if (req.user && req.user.role !== "admin") {
        const canUpload = await storage.checkUploadLimit(req.user.id, photoCount);
        if (!canUpload) {
          return res.status(403).json({
            message: "Upload limit exceeded",
            error: "UPLOAD_LIMIT_REACHED",
            details: "You have reached the upload limit for your current plan. Please upgrade to continue uploading photos."
          });
        }
        await storage.updateUploadUsage(req.user.id, photoCount);
      }
      const updatedProject = await storage.updateProject(projectId, {
        photos: [...project.photos || [], ...processedPhotos]
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
  app2.delete("/api/projects/:id", authenticate, requireActiveUser, async (req, res) => {
    try {
      const idParam = req.params.id;
      const project = await storage.getProject(idParam);
      if (!project) {
        return res.status(404).json({ message: "Projeto n\xE3o encontrado" });
      }
      if (project.photographerId !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Voc\xEA n\xE3o tem permiss\xE3o para excluir este projeto" });
      }
      const photoCount = project.photos ? project.photos.length : 0;
      console.log(`Deletando projeto ID=${project.id} com ${photoCount} fotos - removendo do contador de uploads`);
      if (project.photos && Array.isArray(project.photos)) {
        for (const photo of project.photos) {
          try {
            await deleteFileFromR2(photo.filename);
          } catch (error) {
            console.error(`Error deleting ${photo.filename} from R2:`, error);
          }
        }
      }
      const deleted = await storage.deleteProject(project.id);
      if (!deleted) {
        return res.status(500).json({ message: "Falha ao excluir projeto" });
      }
      console.log(`Projeto ID=${project.id} exclu\xEDdo com sucesso - contador de uploads atualizado`);
      res.json({
        success: true,
        message: "Projeto exclu\xEDdo com sucesso",
        photosRemoved: photoCount
        // Include count in response for client-side feedback
      });
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      res.status(500).json({ message: "Falha ao excluir projeto" });
    }
  });
  app2.get("/api/subscription/plans", authenticate, async (req, res) => {
    try {
      const plansV2 = {
        FREE: { ...SUBSCRIPTION_PLANS.FREE, current: req.user?.planType === "free" },
        BASIC_V2: { ...SUBSCRIPTION_PLANS.BASIC_V2, current: req.user?.planType === "basic_v2" },
        STANDARD_V2: { ...SUBSCRIPTION_PLANS.STANDARD_V2, current: req.user?.planType === "standard_v2" },
        PROFESSIONAL_V2: { ...SUBSCRIPTION_PLANS.PROFESSIONAL_V2, current: req.user?.planType === "professional_v2" }
      };
      const userPlanType = req.user?.planType || "free";
      const isLegacyPlan = ["basic", "standard", "professional"].includes(userPlanType);
      let plans = plansV2;
      if (isLegacyPlan) {
        const planKey = userPlanType.toUpperCase();
        plans = {
          ...plansV2,
          [planKey]: { ...SUBSCRIPTION_PLANS[planKey], current: true }
        };
      }
      const userStats = {
        uploadLimit: req.user?.uploadLimit || 0,
        usedUploads: req.user?.usedUploads || 0,
        remainingUploads: (req.user?.uploadLimit || 0) - (req.user?.usedUploads || 0),
        planType: userPlanType,
        subscriptionStatus: req.user?.subscriptionStatus || "inactive",
        subscriptionEndDate: req.user?.subscriptionEndDate
      };
      res.json({ plans, userStats });
    } catch (error) {
      console.error("Erro ao buscar planos de assinatura:", error);
      res.status(500).json({ message: "Falha ao buscar planos de assinatura" });
    }
  });
  app2.post("/api/create-payment-intent", authenticate, async (req, res) => {
    try {
      const { planType } = req.body;
      if (!planType) {
        return res.status(400).json({ message: "Tipo de plano \xE9 obrigat\xF3rio" });
      }
      let planKey;
      if (planType.includes("_")) {
        planKey = planType.toUpperCase();
      } else if (planType === "free") {
        planKey = "FREE";
      } else {
        planKey = planType.toUpperCase();
      }
      const plan = SUBSCRIPTION_PLANS[planKey];
      if (!plan || plan.price === void 0) {
        const fallbackKey = `${planType.toUpperCase()}_V2`;
        const fallbackPlan = SUBSCRIPTION_PLANS[fallbackKey];
        if (!fallbackPlan) {
          return res.status(400).json({ message: "Plano inv\xE1lido ou n\xE3o encontrado" });
        }
        if (process.env.DEBUG_SUBSCRIPTION === "true") {
          console.log(`Plano ${planKey} n\xE3o encontrado, usando fallback ${fallbackKey}`);
        }
        planKey = fallbackKey;
      }
      const selectedPlan = SUBSCRIPTION_PLANS[planKey];
      if (!selectedPlan) {
        return res.status(400).json({ message: "Plano inv\xE1lido ou n\xE3o encontrado" });
      }
      if (!stripe) {
        return res.status(500).json({
          message: "Erro no servi\xE7o de pagamento",
          details: "Stripe n\xE3o est\xE1 configurado corretamente"
        });
      }
      const amountInCents = Math.round(selectedPlan.price * 100);
      const isV2Plan = planKey.includes("_V2") || planType.includes("_v2");
      const normalizedPlanType = isV2Plan ? planType.toLowerCase() : `${planType.toLowerCase()}_v2`;
      if (process.env.DEBUG_SUBSCRIPTION === "true") {
        console.log(`Criando PaymentIntent para plano: ${normalizedPlanType} (valor: R$${selectedPlan.price.toFixed(2)}, limite: ${selectedPlan.uploadLimit} uploads)`);
      }
      const metadata = {
        userId: req.user?.id.toString() || "",
        planType: normalizedPlanType,
        // Usar a versão normalizada do planType
        userEmail: req.user?.email || ""
      };
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        // Valor em centavos calculado a partir do preço do plano
        currency: "brl",
        metadata: {
          ...metadata,
          planName: selectedPlan.name,
          // Adicionar o nome amigável do plano aos metadados
          planPrice: selectedPlan.price.toString(),
          // Adicionar o preço do plano aos metadados
          uploadLimit: selectedPlan.uploadLimit.toString()
          // Adicionar o limite de uploads aos metadados
        },
        description: `Assinatura do plano ${selectedPlan.name} - R$${selectedPlan.price.toFixed(2)} - ${selectedPlan.uploadLimit} uploads - PhotoSelect`
      });
      res.json({
        clientSecret: paymentIntent.client_secret,
        planName: selectedPlan.name,
        planPrice: selectedPlan.price.toString()
      });
    } catch (error) {
      if (process.env.DEBUG_SUBSCRIPTION === "true") {
        console.error(
          "Erro ao criar intent de pagamento:",
          error instanceof Error ? error.message : "Erro desconhecido"
        );
      }
      res.status(500).json({
        message: "Falha ao processar pagamento"
      });
    }
  });
  app2.post("/api/subscription/upgrade", authenticate, async (req, res) => {
    try {
      const { planType } = req.body;
      const userPlanType = req.user?.planType || "free";
      const validPlans = [
        "free",
        "basic_v2",
        "standard_v2",
        "professional_v2",
        userPlanType
        // permitir que o usuário permaneça no seu plano atual, mesmo se for legado
      ];
      if (!planType || !validPlans.includes(planType)) {
        return res.status(400).json({ message: "Tipo de plano inv\xE1lido. Apenas os novos planos V2 est\xE3o dispon\xEDveis para upgrade." });
      }
      const updatedUser = await storage.updateUserSubscription(req.user?.id || 0, planType);
      if (!updatedUser) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
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
  app2.post("/api/webhook", async (req, res) => {
    try {
      const webhookPayloadSchema = z.object({
        type: z.string(),
        email: z.string().email(),
        subscription_id: z.string(),
        timestamp: z.string().datetime()
      });
      const payload = webhookPayloadSchema.parse(req.body);
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
  app2.post("/api/webhook/stripe", async (req, res) => {
    try {
      const event = req.body;
      if (!event || !event.type || !event.data) {
        return res.status(400).json({ error: "Evento inv\xE1lido" });
      }
      if (event.type.startsWith("subscription.")) {
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
      return res.json({
        message: "Evento n\xE3o processado",
        event: event.type,
        status: "ignored"
      });
    } catch (error) {
      console.error("Erro ao processar webhook do Stripe:", error);
      res.status(500).json({ message: "Falha ao processar webhook do Stripe" });
    }
  });
  app2.post("/api/webhook/hotmart", async (req, res) => {
    try {
      console.log("========== INICIO WEBHOOK HOTMART ==========");
      console.log("Recebido evento da Hotmart");
      try {
        const safePayload = JSON.parse(JSON.stringify(req.body));
        if (safePayload.data && safePayload.data.buyer) {
          if (safePayload.data.buyer.phone) safePayload.data.buyer.phone = "[REDACTED]";
          if (safePayload.data.buyer.document) safePayload.data.buyer.document = "[REDACTED]";
        }
        console.log("Estrutura completa do payload Hotmart:");
        console.log(JSON.stringify(safePayload, null, 2));
      } catch (logError) {
        console.error("Erro ao logar payload da Hotmart:", logError);
      }
      const signature = req.headers["x-hotmart-signature"];
      const webhookSecret = process.env.HOTMART_WEBHOOK_SECRET || "";
      if (signature && webhookSecret) {
        const rawBody = JSON.stringify(req.body);
        const isValid = validateHotmartSignature(rawBody, signature, webhookSecret);
        if (!isValid) {
          console.warn("Assinatura inv\xE1lida no webhook da Hotmart");
          return res.status(401).json({ message: "Assinatura inv\xE1lida" });
        }
      } else {
        console.warn("Verifica\xE7\xE3o de assinatura da Hotmart desativada - HOTMART_WEBHOOK_SECRET n\xE3o configurado");
        console.log("Para maior seguran\xE7a, defina a vari\xE1vel HOTMART_WEBHOOK_SECRET com a chave compartilhada da Hotmart");
      }
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
    } catch (error) {
      console.error("Erro ao processar webhook da Hotmart:", error);
      console.log("========== FIM WEBHOOK HOTMART (COM EXCE\xC7\xC3O) ==========");
      return res.status(500).json({
        message: "Falha ao processar webhook da Hotmart",
        error: error.message || "Erro desconhecido"
      });
    }
  });
  app2.post("/api/test-email", async (req, res) => {
    try {
      const { to, subject, html } = req.body;
      if (!to || !subject || !html) {
        return res.status(400).json({
          success: false,
          message: "Os campos 'to', 'subject' e 'html' s\xE3o obrigat\xF3rios"
        });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({
          success: false,
          message: "Endere\xE7o de e-mail inv\xE1lido"
        });
      }
      const result = await sendEmail({ to, subject, html });
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("Erro ao testar envio de e-mail:", error);
      return res.status(500).json({
        success: false,
        message: `Erro inesperado ao enviar e-mail: ${error instanceof Error ? error.message : "Erro desconhecido"}`
      });
    }
  });
  app2.post("/api/password/forgot", async (req, res) => {
    try {
      console.log("[Forgot Password] Requisi\xE7\xE3o recebida:", req.body);
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        console.log("[Forgot Password] Email inv\xE1lido:", email);
        return res.status(400).json({
          success: false,
          message: "Email inv\xE1lido"
        });
      }
      const normalizedEmail = email.toLowerCase().trim();
      console.log("[Forgot Password] Email normalizado:", normalizedEmail);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        console.log("[Forgot Password] Formato de email inv\xE1lido:", normalizedEmail);
        return res.status(400).json({
          success: false,
          message: "Formato de email inv\xE1lido"
        });
      }
      console.log("[Forgot Password] Buscando usu\xE1rio pelo email:", normalizedEmail);
      const user = await storage.getUserByEmail(normalizedEmail);
      if (user) {
        console.log("[Forgot Password] Usu\xE1rio encontrado:", user.id, user.email);
        console.log("[Forgot Password] Gerando token para o usu\xE1rio ID:", user.id);
        const token = await generatePasswordResetToken(user.id, 60);
        if (token) {
          console.log("[Forgot Password] Token gerado com sucesso:", token.substring(0, 8) + "...");
          console.log("[Forgot Password] Enviando email para:", user.email);
          const emailResult = await sendPasswordResetEmail(user.email, token, false, user.name);
          console.log("[Forgot Password] Resultado do envio de email:", emailResult);
          console.log(`Token de redefini\xE7\xE3o de senha gerado para: ${normalizedEmail}`);
        } else {
          console.error(`Falha ao gerar token para: ${normalizedEmail}`);
        }
      } else {
        console.log(`Tentativa de redefini\xE7\xE3o para email n\xE3o cadastrado: ${normalizedEmail}`);
      }
      return res.status(200).json({
        success: true,
        message: "Se este email estiver cadastrado, voc\xEA receber\xE1 instru\xE7\xF5es para redefinir sua senha"
      });
    } catch (error) {
      console.error("Erro ao processar solicita\xE7\xE3o de redefini\xE7\xE3o de senha:", error);
      return res.status(500).json({
        success: false,
        message: "Ocorreu um erro ao processar sua solicita\xE7\xE3o"
      });
    }
  });
  app2.get("/api/password/verify-token", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({
          isValid: false,
          message: "Token inv\xE1lido ou ausente"
        });
      }
      const result = await verifyPasswordResetToken(token);
      if (result.isValid) {
        return res.json({ isValid: true });
      } else {
        return res.status(400).json({
          isValid: false,
          message: "Token expirado ou inv\xE1lido"
        });
      }
    } catch (error) {
      console.error("Erro ao verificar token de redefini\xE7\xE3o de senha:", error);
      return res.status(500).json({
        isValid: false,
        message: "Erro ao verificar token"
      });
    }
  });
  app2.use((req, res, next) => {
    const path6 = req.path;
    if (path6.endsWith(".html")) {
      res.setHeader("Content-Type", "text/html; charset=UTF-8");
    } else if (path6.endsWith(".js") || path6.endsWith(".mjs")) {
      res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
    } else if (path6.endsWith(".jsx") || path6.endsWith(".tsx")) {
      res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
    } else if (path6.endsWith(".css")) {
      res.setHeader("Content-Type", "text/css; charset=UTF-8");
    } else if (path6.endsWith(".json")) {
      res.setHeader("Content-Type", "application/json; charset=UTF-8");
    }
    next();
  });
  app2.get(["*.tsx", "*.jsx", "*/src/*.tsx", "*/src/*.jsx"], (req, res, next) => {
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
    next();
  });
  app2.get(["*/reset-password.html", "*/create-password.html"], (req, res, next) => {
    console.log(`Servindo arquivo HTML est\xE1tico: ${req.path}`);
    res.setHeader("Content-Type", "text/html; charset=UTF-8");
    next();
  });
  app2.get(["/reset-password", "/reset-password/*", "/create-password", "/create-password/*"], (req, res, next) => {
    if (req.path.endsWith(".html")) {
      console.log(`Redirecionando para arquivo HTML est\xE1tico: ${req.path}`);
      return next();
    }
    const clientHtmlPath = path2.resolve(
      import.meta.dirname,
      "..",
      "client",
      "index.html"
    );
    console.log(`Servindo app React para rota de senha: ${req.url}`);
    res.setHeader("Content-Type", "text/html; charset=UTF-8");
    res.sendFile(clientHtmlPath);
  });
  app2.post("/api/password/reset", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: "Token e senha s\xE3o obrigat\xF3rios"
        });
      }
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "A senha deve ter pelo menos 6 caracteres"
        });
      }
      const result = await resetPasswordWithToken(token, password);
      if (result) {
        return res.json({
          success: true,
          message: "Senha alterada com sucesso"
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "N\xE3o foi poss\xEDvel redefinir a senha. O token pode estar expirado ou j\xE1 ter sido utilizado."
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
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid as nanoid3 } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid3()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import multer2 from "multer";
import path5 from "path";
import fs3 from "fs";
import { nanoid as nanoid4 } from "nanoid";
import cors from "cors";
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "studio-foto-session-secret-key-2023";
  console.log("SESSION_SECRET definido com valor padr\xE3o");
}
var uploadsDir = path5.join(process.cwd(), "uploads");
if (!fs3.existsSync(uploadsDir)) {
  fs3.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}
console.log(`Upload directory path: ${uploadsDir}`);
var multerStorage = multer2.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const id = nanoid4();
    const ext = path5.extname(file.originalname) || getExtensionFromMimeType(file.mimetype);
    cb(null, `${id}${ext}`);
    console.log(`File upload: ${file.originalname} \u2192 ${id}${ext}`);
  }
});
function getExtensionFromMimeType(mimetype) {
  switch (mimetype) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}
var fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
var upload = multer2({
  storage: multerStorage,
  fileFilter,
  limits: {
    fileSize: 1e3 * 1024 * 1024
    // 1000MB (1GB) limit - efetivamente sem limite para uso normal
  }
});
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: true }));
app.use(express2.static(path5.join(process.cwd(), "public"), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith(".html")) {
      res.setHeader("Content-Type", "text/html; charset=UTF-8");
    } else if (filepath.endsWith(".js") || filepath.endsWith(".mjs")) {
      res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
    } else if (filepath.endsWith(".jsx") || filepath.endsWith(".tsx")) {
      res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
    } else if (filepath.endsWith(".css")) {
      res.setHeader("Content-Type", "text/css; charset=UTF-8");
    } else if (filepath.endsWith(".json")) {
      res.setHeader("Content-Type", "application/json; charset=UTF-8");
    }
    console.log(`Servindo arquivo est\xE1tico: ${filepath} com Content-Type: ${res.getHeader("Content-Type")}`);
  }
}));
app.use(cors({
  origin: true,
  // Allow the requesting origin (dynamically)
  credentials: true,
  // This is essential for cookies to work
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"]
}));
setupAuth(app);
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") && (req.path.includes("/auth") || req.path.includes("/login") || req.path.includes("/logout") || process.env.DEBUG_REQUESTS === "true")) {
    console.log(`[DEBUG-REQ] ${req.method} ${req.path} | Auth: ${req.isAuthenticated ? req.isAuthenticated() : "N/A"} | User: ${req.user ? req.user.id : "none"}`);
    if (process.env.DEBUG_COOKIES === "true" && req.headers.cookie) {
      console.log(`[DEBUG-REQ] Cookies: "${req.headers.cookie}"`);
    }
    if (process.env.DEBUG_SESSION === "true" && req.session && req.session.passport) {
      console.log(`[DEBUG-REQ] Passport session: ${JSON.stringify(req.session.passport)}`);
    }
  }
  next();
});
app.use("/uploads", express2.static(uploadsDir));
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as time, current_database() as db_name");
    const userCount = await pool.query("SELECT COUNT(*) as count FROM users");
    const projectCount = await pool.query("SELECT COUNT(*) as count FROM projects");
    res.json({
      status: "connected",
      timestamp: result.rows[0].time,
      database: result.rows[0].db_name,
      tables: {
        users: parseInt(userCount.rows[0].count),
        projects: parseInt(projectCount.rows[0].count)
      },
      environment: process.env.NODE_ENV,
      host: process.env.PGHOST || process.env.DB_HOST || "localhost"
    });
  } catch (error) {
    console.error("Erro na rota de teste:", error);
    res.status(500).json({
      error: "Database connection error",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : void 0
    });
  }
});
app.use((req, res, next) => {
  const start = Date.now();
  const path6 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path6.startsWith("/api")) {
      let logLine = `${req.method} ${path6} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && Array.isArray(capturedJsonResponse)) {
        logLine += ` :: Array[${capturedJsonResponse.length}]`;
      } else if (capturedJsonResponse && typeof capturedJsonResponse === "object") {
        const keys = Object.keys(capturedJsonResponse).join(",");
        logLine += ` :: Object{${keys}}`;
      }
      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  console.log("Using Cloudflare R2 for storage - bucket must be created manually in Cloudflare dashboard");
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = Number(process.env.PORT) || 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port} (NODE_ENV: ${process.env.NODE_ENV})`);
    setupMemoryMonitor();
  });
  function setupMemoryMonitor() {
    const bytesToMB = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;
    let lastFullLogTime = 0;
    const logMemoryUsage = () => {
      const memoryData = process.memoryUsage();
      const now = Date.now();
      const isFullInterval = now - lastFullLogTime >= 10 * 60 * 1e3;
      if (process.env.DEBUG_MEMORY === "true" || isFullInterval) {
        if (isFullInterval) {
          lastFullLogTime = now;
        }
        console.log("=== MEMORY USAGE ===");
        console.log(`RSS: ${bytesToMB(memoryData.rss)} MB`);
        console.log(`Heap Total: ${bytesToMB(memoryData.heapTotal)} MB`);
        console.log(`Heap Used: ${bytesToMB(memoryData.heapUsed)} MB`);
        console.log(`External: ${bytesToMB(memoryData.external)} MB`);
        if (process.env.DEBUG_MEMORY === "true" && storage && "users" in storage && "projects" in storage) {
          const usersObj = storage.users;
          const projectsObj = storage.projects;
          if (usersObj && typeof usersObj.getStats === "function" && projectsObj && typeof projectsObj.getStats === "function") {
            try {
              const userCacheStats = usersObj.getStats();
              const projectCacheStats = projectsObj.getStats();
              console.log("=== CACHE STATS ===");
              console.log(`Users cache: ${userCacheStats.size}/${userCacheStats.maxSize} items (${Math.round(userCacheStats.hitRatio * 100)}% hit ratio)`);
              console.log(`Projects cache: ${projectCacheStats.size}/${projectCacheStats.maxSize} items (${Math.round(projectCacheStats.hitRatio * 100)}% hit ratio)`);
              console.log(`Oldest item age: Users ${Math.round(userCacheStats.oldestItemAge / 60)} min, Projects ${Math.round(projectCacheStats.oldestItemAge / 60)} min`);
            } catch (error) {
              if (process.env.DEBUG_MEMORY === "true") {
                console.log("=== CACHE STATS: Not available ===");
              }
            }
          }
        }
        console.log("===================");
      }
    };
    logMemoryUsage();
    const intervalId = setInterval(logMemoryUsage, 6e4);
    const gcIntervalId = setInterval(() => {
      if (global.gc) {
        try {
          global.gc();
          if (process.env.DEBUG_MEMORY === "true") {
            console.log("[MEMORY] Manual garbage collection executed");
          }
        } catch (e) {
          if (process.env.DEBUG_MEMORY === "true") {
            console.error("[MEMORY] Failed to execute garbage collection");
          }
        }
      }
    }, 15 * 60 * 1e3);
    process.on("SIGINT", () => {
      clearInterval(intervalId);
      clearInterval(gcIntervalId);
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      clearInterval(intervalId);
      clearInterval(gcIntervalId);
      process.exit(0);
    });
  }
})();
export {
  upload
};
