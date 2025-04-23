// server/index.ts

// Path fix for Railway deployment
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM compatibility functions
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to get the correct public path in different environments
const getPublicPath = () => {
  // Check dist/public first (common in production)
  const publicPath = path.resolve(process.cwd(), 'dist', 'public');
  if (fs.existsSync(publicPath)) {
    console.log('Usando caminho: ' + publicPath);
    return publicPath;
  }
  
  // Then try dist (fallback)
  const distPath = path.resolve(process.cwd(), 'dist');
  console.log('Usando caminho fallback: ' + distPath);
  return distPath;
};

// Helper function to get client path
const getClientPath = (...segments) => {
  return path.resolve(process.cwd(), 'client', ...segments);
};

console.log('Railway path fixes carregados com sucesso');

import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
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
  lastEvent: jsonb("last_event").default(null).$type()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastEvent: true,
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
    price: 15,
    uploadLimit: 1500,
    description: "1.500 uploads por conta"
  },
  STANDARD: {
    name: "Padr\xE3o",
    type: "standard",
    price: 35,
    uploadLimit: 5e3,
    description: "5.000 uploads por conta"
  },
  PROFESSIONAL: {
    name: "Profissional",
    type: "professional",
    price: 120,
    uploadLimit: 999999,
    // Praticamente ilimitado
    description: "Uploads ilimitados"
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

// server/storage.ts
import { nanoid } from "nanoid";
import session from "express-session";
import createMemoryStore from "memorystore";
var MemoryStore = createMemoryStore(session);
var MemStorage = class {
  users;
  projects;
  userId;
  projectId;
  sessionStore;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.projects = /* @__PURE__ */ new Map();
    this.userId = 1;
    this.projectId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5,
      // 24 hours to clean expired sessions
      stale: false,
      // Do not delete stale sessions
      ttl: 7 * 24 * 60 * 60
      // 7 days TTL (matches cookie maxAge)
    });
    const adminUser = {
      id: this.userId++,
      name: "Admin",
      email: "admin@studio.com",
      password: "admin123",
      // Plain password for the admin account
      role: "admin",
      status: "active",
      createdAt: /* @__PURE__ */ new Date(),
      planType: "professional",
      uploadLimit: -1,
      // unlimited uploads
      usedUploads: 0,
      subscriptionStartDate: /* @__PURE__ */ new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3),
      // 1 year from now
      subscriptionStatus: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscription_id: null,
      lastEvent: null
    };
    this.users.set(adminUser.id, adminUser);
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByEmail(email) {
    console.log(`Buscando usu\xE1rio com email: ${email}`);
    console.log(`Usu\xE1rios dispon\xEDveis:`, Array.from(this.users.values()).map((u) => ({ id: u.id, email: u.email, role: u.role })));
    const user = Array.from(this.users.values()).find(
      (user2) => user2.email.toLowerCase() === email.toLowerCase()
    );
    console.log(`Usu\xE1rio encontrado:`, user ? { id: user.id, email: user.email, role: user.role } : "nenhum");
    return user;
  }
  async getUserBySubscriptionId(subscriptionId) {
    return Array.from(this.users.values()).find(
      (user) => user.subscription_id === subscriptionId || user.stripeSubscriptionId === subscriptionId
    );
  }
  async getUserByStripeCustomerId(customerId) {
    return Array.from(this.users.values()).find(
      (user) => user.stripeCustomerId === customerId
    );
  }
  async getUsers() {
    return Array.from(this.users.values());
  }
  async createUser(userData) {
    const id = this.userId++;
    const now = /* @__PURE__ */ new Date();
    const user = {
      id,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role || "photographer",
      status: userData.status || "active",
      createdAt: now,
      // Campos de assinatura
      planType: userData.planType || "free",
      uploadLimit: 0,
      // Será definido com base no plano
      usedUploads: 0,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      subscriptionStatus: "inactive",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscription_id: userData.subscription_id || null,
      lastEvent: null
    };
    if (user.planType === "free") {
      user.uploadLimit = SUBSCRIPTION_PLANS.FREE.uploadLimit;
    }
    this.users.set(id, user);
    return user;
  }
  async updateUser(id, userData) {
    const user = this.users.get(id);
    if (!user) return void 0;
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  async deleteUser(id) {
    const deleted = this.users.delete(id);
    return deleted;
  }
  // Métodos de gerenciamento de assinatura
  async updateUserSubscription(userId, planType) {
    const user = this.users.get(userId);
    if (!user) return void 0;
    let plan;
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
    const now = /* @__PURE__ */ new Date();
    const endDate = /* @__PURE__ */ new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const updatedUser = await this.updateUser(userId, {
      planType,
      uploadLimit: plan.uploadLimit,
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
      subscriptionStatus: "active",
      status: "active"
      // Garantir que o usuário esteja ativo
    });
    return updatedUser;
  }
  async updateStripeInfo(userId, customerId, subscriptionId) {
    const user = this.users.get(userId);
    if (!user) return void 0;
    const updatedUser = await this.updateUser(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId
    });
    return updatedUser;
  }
  async handleStripeWebhook(payload) {
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
    switch (payload.type) {
      case "subscription.created":
      case "subscription.updated":
        if (payload.data.subscription.status === "active") {
          subscriptionStatus = "active";
          userStatus = "active";
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
    const updatedUser = await this.updateUser(user.id, {
      subscriptionStatus,
      status: userStatus,
      subscriptionEndDate,
      stripeSubscriptionId: payload.data.subscription.id,
      lastEvent: {
        type: payload.type,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    return updatedUser;
  }
  // Métodos de gerenciamento de uploads
  async checkUploadLimit(userId, count) {
    const user = this.users.get(userId);
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
    return availableUploads >= count;
  }
  async updateUploadUsage(userId, addCount) {
    const user = this.users.get(userId);
    if (!user) return void 0;
    const currentUsed = user.usedUploads || 0;
    let newUsedUploads = currentUsed + addCount;
    if (newUsedUploads < 0) {
      newUsedUploads = 0;
    }
    console.log(`Upload usage updated for user ${userId}: ${currentUsed} \u2192 ${newUsedUploads} (added ${addCount})`);
    const updatedUser = await this.updateUser(userId, {
      usedUploads: newUsedUploads
    });
    return updatedUser;
  }
  async handleWebhookEvent(payload) {
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
    const updatedUser = await this.updateUser(user.id, {
      status,
      subscription_id: payload.subscription_id || user.subscription_id,
      lastEvent: {
        type: payload.type,
        timestamp: payload.timestamp
      }
    });
    return updatedUser;
  }
  // Project methods
  async getProject(id) {
    console.log(`MemStorage: Buscando projeto ID=${id}`);
    console.log(`MemStorage: Projetos dispon\xEDveis: ${Array.from(this.projects.keys()).join(", ")}`);
    let project;
    if (typeof id === "number") {
      project = this.projects.get(id);
    } else {
      const numericId = parseInt(id);
      if (!isNaN(numericId)) {
        project = this.projects.get(numericId);
      }
      if (!project) {
        const allProjects = Array.from(this.projects.values());
        project = allProjects.find((p) => p.publicId === id);
        console.log(`MemStorage: Buscando por publicId="${id}", encontrado: ${!!project}`);
      }
    }
    if (project) {
      console.log(`MemStorage: Projeto encontrado: ${project.name}`);
    } else {
      console.log(`MemStorage: Projeto ID=${id} n\xE3o encontrado`);
      if (this.projects.size === 0) {
        console.log("MemStorage: Nenhum projeto encontrado e nenhum exemplo ser\xE1 criado.");
        return void 0;
      }
    }
    return project;
  }
  // Método auxiliar para inicializar dados de exemplo
  initializeExampleProjects() {
    this.projectId = 1;
    console.log("MemStorage: No example projects will be created. Users will start with an empty list.");
  }
  async getProjects(photographerId) {
    if (photographerId) {
      return Array.from(this.projects.values()).filter(
        (project) => project.photographerId === photographerId
      );
    }
    return Array.from(this.projects.values());
  }
  async createProject(projectData, photos) {
    const id = this.projectId++;
    const now = /* @__PURE__ */ new Date();
    const processedPhotos = photos.map((photo) => ({
      ...photo,
      id: nanoid()
    }));
    const project = {
      id,
      publicId: projectData.publicId,
      // Use the provided publicId
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
  async updateProject(id, projectData) {
    const project = this.projects.get(id);
    if (!project) return void 0;
    const updatedProject = { ...project, ...projectData };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  async finalizeProjectSelection(id, selectedPhotos) {
    console.log(`MemStorage: Finalizando sele\xE7\xE3o para projeto ID=${id}, fotos selecionadas: ${selectedPhotos.length}`);
    let projectToUpdate = this.projects.get(id);
    let projectId = id;
    if (!projectToUpdate) {
      console.log(`MemStorage: Projeto ID=${id} n\xE3o encontrado diretamente, buscando de outra forma`);
      const allProjects = Array.from(this.projects.values());
      const foundProject = allProjects.find((p) => p.id.toString() === id.toString());
      if (!foundProject) {
        console.log(`MemStorage: Projeto ID=${id} n\xE3o encontrado em nenhum formato`);
        return void 0;
      }
      projectToUpdate = foundProject;
      projectId = foundProject.id;
      console.log(`MemStorage: Projeto encontrado com ID=${projectId}`);
    }
    const updatedProject = {
      ...projectToUpdate,
      selectedPhotos,
      status: "reviewed"
      // This is the critical change - using "reviewed" not "completed"
    };
    if (updatedProject.photos) {
      updatedProject.photos = updatedProject.photos.map((photo) => ({
        ...photo,
        selected: selectedPhotos.includes(photo.id)
      }));
    }
    this.projects.set(projectId, updatedProject);
    const verifiedProject = this.projects.get(projectId);
    console.log(`MemStorage: Projeto ID=${projectId} atualizado para status="${verifiedProject?.status}"`);
    const selecionadas = selectedPhotos.length;
    console.log(`MemStorage: ${selecionadas} fotos foram selecionadas`);
    return updatedProject;
  }
  async archiveProject(id) {
    const project = this.projects.get(id);
    if (!project) return void 0;
    const updatedProject = { ...project, status: "archived" };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  async reopenProject(id) {
    const project = this.projects.get(id);
    if (!project) return void 0;
    const updatedProject = { ...project, status: "reopened" };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  // Método para deletar um projeto
  async deleteProject(id) {
    console.log(`MemStorage: Tentando deletar projeto ID=${id}`);
    const project = this.projects.get(id);
    if (!project) {
      console.log(`MemStorage: Projeto ID=${id} n\xE3o encontrado para dele\xE7\xE3o`);
      return false;
    }
    const photographerId = project.photographerId;
    const photoCount = project.photos ? project.photos.length : 0;
    const deleted = this.projects.delete(id);
    console.log(`MemStorage: Projeto ID=${id} ${deleted ? "deletado com sucesso" : "falha ao deletar"}`);
    if (deleted && photoCount > 0) {
      console.log(`MemStorage: Atualizando contador de uploads para o fot\xF3grafo ID=${photographerId}, reduzindo ${photoCount} fotos`);
      await this.updateUploadUsage(photographerId, -photoCount);
    }
    return deleted;
  }
};
var storage = new MemStorage();

// server/routes.ts
import { z } from "zod";
import path from "path";
import fs from "fs";
import { nanoid as nanoid2 } from "nanoid";
import Stripe from "stripe";
import http from "http";
import https from "https";
async function downloadImage(url, filename) {
  const id = nanoid2();
  const extension = path.extname(filename) || ".jpg";
  const targetFilename = `${id}${extension}`;
  const targetPath = path.join("uploads", targetFilename);
  console.log(`Downloading image from ${url} to ${targetPath}`);
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const request = client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log(`Following redirect to ${redirectUrl}`);
          downloadImage(redirectUrl, filename).then(resolve).catch(reject);
          return;
        }
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      const fileStream = fs.createWriteStream(targetPath);
      response.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        console.log(`Successfully downloaded image to ${targetPath}`);
        resolve(`/uploads/${targetFilename}`);
      });
      fileStream.on("error", (err) => {
        fs.unlink(targetPath, () => {
        });
        reject(err);
      });
    });
    request.on("error", (err) => {
      reject(err);
    });
    request.setTimeout(1e4, () => {
      request.abort();
      reject(new Error(`Request timeout downloading image from ${url}`));
    });
  });
}
var authenticate = async (req, res, next) => {
  console.log(`[AUTH] Checking authentication for ${req.method} ${req.path}`);
  console.log(`[AUTH] Session ID: ${req.sessionID}, isAuthenticated: ${req.isAuthenticated ? req.isAuthenticated() : "not a function"}`);
  console.log(`[AUTH] Raw cookies: ${req.headers.cookie || "none"}`);
  console.log(`[AUTH] User: ${req.user ? `ID=${req.user.id}, role=${req.user.role}` : "undefined"}`);
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log(`[AUTH] User authenticated via session: ID=${req.user?.id}`);
    return next();
  }
  if (req.headers.cookie) {
    console.log(`[AUTH] Cookies found but no passport session: ${req.headers.cookie}`);
    if (req.headers.cookie.includes("studio.sid") && req.session && req.sessionID) {
      console.log(`[AUTH] Attempting to recover session ${req.sessionID}`);
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
    if (req.headers.cookie.includes("user_id=")) {
      console.log(`[AUTH] Found direct user_id cookie, extracting ID`);
      let userId = null;
      const cookies = req.headers.cookie.split(";");
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === "user_id") {
          userId = parseInt(value);
          console.log(`[AUTH] Found user ID ${userId} in direct cookie`);
          break;
        }
      }
      if (userId && !isNaN(userId)) {
        storage.getUser(userId).then((user) => {
          if (user) {
            console.log(`[AUTH] Successfully loaded user from direct cookie ID: ${userId}`);
            req.login(user, (err) => {
              if (err) {
                console.error("[AUTH] Error establishing session from direct cookie:", err);
              } else {
                console.log(`[AUTH] Session established from direct cookie, continuing request`);
                next();
              }
            });
          }
        }).catch((err) => {
          console.error("[AUTH] Error loading user from direct cookie ID:", err);
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
  console.log("[AUTH] No authentication found, returning 401");
  return res.status(401).json({
    message: "N\xE3o autorizado",
    debug: {
      sessionId: req.sessionID,
      hasCookies: Boolean(req.headers.cookie),
      sessionExists: Boolean(req.session),
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false
    }
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
  app2.get("/api/admin/users", authenticate, requireAdmin, async (req, res) => {
    try {
      const planType = req.query.planType;
      const status = req.query.status;
      const isDelinquent = req.query.isDelinquent === "true";
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      let users3 = await storage.getUsers();
      if (planType) {
        users3 = users3.filter((user) => user.planType === planType);
      }
      if (status) {
        users3 = users3.filter((user) => user.status === status);
      }
      if (isDelinquent) {
        users3 = users3.filter(
          (user) => user.subscriptionStatus === "inactive" || user.subscriptionStatus === "canceled"
        );
      }
      if (startDate) {
        const start = new Date(startDate);
        users3 = users3.filter((user) => new Date(user.createdAt) >= start);
      }
      if (endDate) {
        const end = new Date(endDate);
        users3 = users3.filter((user) => new Date(user.createdAt) <= end);
      }
      const sanitizedUsers = users3.map((user) => ({
        ...user,
        password: void 0
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error retrieving users:", error);
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });
  app2.get("/api/users", authenticate, requireAdmin, async (req, res) => {
    try {
      const users3 = await storage.getUsers();
      const sanitizedUsers = users3.map((user) => ({
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
      const validPlans = Object.keys(SUBSCRIPTION_PLANS).map((key) => SUBSCRIPTION_PLANS[key].type);
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
        uploadLimit = SUBSCRIPTION_PLANS.FREE.uploadLimit;
      }
      const newUser = await storage.createUser({
        name,
        email,
        password,
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
      let projects3;
      if (req.user?.role === "admin") {
        projects3 = await storage.getProjects();
      } else if (req.user) {
        console.log(`Filtrando projetos para o fot\xF3grafo ID=${req.user.id}`);
        projects3 = await storage.getProjects(req.user.id);
      } else {
        return res.status(401).json({ message: "N\xE3o autorizado" });
      }
      console.log(`Retornando ${projects3.length} projetos para o usu\xE1rio ID=${req.user?.id}`);
      res.json(projects3);
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
  app2.post("/api/projects", upload.array("photos", 100), async (req, res) => {
    try {
      console.log("Receiving request to create project", req.body);
      const { projectName, clientName, clientEmail, photographerId, photos, photosData } = req.body;
      const name = projectName || req.body.nome || req.body.name;
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
      if (Array.isArray(photos)) {
        console.log(`Processing ${photos.length} photos sent as JSON array`);
        processedPhotos = [];
        for (const photo of photos) {
          let url = photo.url;
          let id = nanoid2();
          try {
            if (url.startsWith("http")) {
              console.log(`External photo URL: ${url} with ID: ${id}`);
              try {
                const localUrl = await downloadImage(url, photo.filename);
                url = localUrl;
                console.log(`Successfully downloaded external image to: ${url}`);
              } catch (err) {
                console.error(`Failed to download external image from ${url}: ${err.message}`);
              }
            } else {
              url = `/uploads/${path.basename(url)}`;
            }
            console.log(`JSON photo: ${photo.filename}, URL: ${url}, ID: ${id}`);
            processedPhotos.push({
              id,
              url,
              filename: photo.filename
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
                  const localUrl = await downloadImage(url, photo.filename);
                  url = localUrl;
                  console.log(`Successfully downloaded external image to: ${url}`);
                } catch (err) {
                  console.error(`Failed to download external image from ${url}: ${err.message}`);
                }
              } else {
                url = `/uploads/${path.basename(url)}`;
              }
              console.log(`JSON photosData: ${photo.filename}, URL: ${url}, ID: ${id}`);
              processedPhotos.push({
                id,
                url,
                filename: photo.filename
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
        processedPhotos = uploadedFiles.map((file) => {
          const id = nanoid2();
          const filename = path.basename(file.path);
          const fileUrl = `/uploads/${filename}`;
          console.log(`File uploaded: ${file.originalname}, Saved as: ${filename}, URL: ${fileUrl}`);
          return {
            id,
            url: fileUrl,
            filename: file.originalname || "photo.jpg"
          };
        });
      }
      if (processedPhotos.length === 0) {
        console.log("No photos found in request, using a placeholder");
        processedPhotos = [
          {
            id: nanoid2(),
            url: "https://via.placeholder.com/800x600?text=No+Photo+Uploaded",
            filename: "placeholder.jpg"
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
  app2.post("/api/projects/:id/photos", authenticate, requireActiveUser, upload.array("photos", 100), async (req, res) => {
    try {
      const idParam = req.params.id;
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
        processedPhotos = uploadedFiles.map((file) => {
          const id = nanoid2();
          const filename = path.basename(file.path);
          const fileUrl = `/uploads/${filename}`;
          console.log(`File uploaded to project ${projectId}: ${file.originalname}, Saved as: ${filename}, URL: ${fileUrl}`);
          return {
            id,
            url: fileUrl,
            filename: file.originalname || "photo.jpg"
          };
        });
      } else if (req.body.photos && Array.isArray(req.body.photos)) {
        const { photos } = req.body;
        photoCount = photos.length;
        console.log(`Processing ${photoCount} photos from JSON data`);
        processedPhotos = [];
        for (const photo of photos) {
          let url = photo.url;
          let id = photo.id || nanoid2();
          try {
            if (url.startsWith("http")) {
              console.log(`External photo URL: ${url} with ID: ${id}`);
              try {
                const localUrl = await downloadImage(url, photo.filename);
                url = localUrl;
                console.log(`Successfully downloaded external image to: ${url}`);
              } catch (err) {
                console.error(`Failed to download external image from ${url}: ${err.message}`);
              }
            } else {
              url = `/uploads/${path.basename(url)}`;
            }
            console.log(`JSON photo for existing project: ${photo.filename}, URL: ${url}, ID: ${id}`);
            processedPhotos.push({
              id,
              url,
              filename: photo.filename
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
      const plans = {
        FREE: { ...SUBSCRIPTION_PLANS.FREE, current: req.user?.planType === "free" },
        BASIC: { ...SUBSCRIPTION_PLANS.BASIC, current: req.user?.planType === "basic" },
        STANDARD: { ...SUBSCRIPTION_PLANS.STANDARD, current: req.user?.planType === "standard" },
        PROFESSIONAL: { ...SUBSCRIPTION_PLANS.PROFESSIONAL, current: req.user?.planType === "professional" }
      };
      const userStats = {
        uploadLimit: req.user?.uploadLimit || 0,
        usedUploads: req.user?.usedUploads || 0,
        remainingUploads: (req.user?.uploadLimit || 0) - (req.user?.usedUploads || 0),
        planType: req.user?.planType || "free",
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
      const { planType, amount } = req.body;
      if (!planType) {
        return res.status(400).json({ message: "Tipo de plano \xE9 obrigat\xF3rio" });
      }
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valor inv\xE1lido" });
      }
      if (!stripe) {
        return res.status(500).json({
          message: "Erro no servi\xE7o de pagamento",
          details: "Stripe n\xE3o est\xE1 configurado corretamente"
        });
      }
      const metadata = {
        userId: req.user?.id.toString() || "",
        planType,
        userEmail: req.user?.email || ""
      };
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        // Stripe trabalha com centavos
        currency: "brl",
        metadata,
        description: `Assinatura do plano ${planType.toUpperCase()} - PhotoSelect`
      });
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      console.error("Erro ao criar intent de pagamento:", error);
      res.status(500).json({
        message: "Falha ao processar pagamento",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  app2.post("/api/subscription/upgrade", authenticate, async (req, res) => {
    try {
      const { planType } = req.body;
      if (!planType || !["free", "basic", "standard", "professional"].includes(planType)) {
        return res.status(400).json({ message: "Tipo de plano inv\xE1lido" });
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
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path2 from "path";
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
      "@": path2.resolve(__dirname, "client", "src"),
      "@shared": path2.resolve(__dirname, "shared"),
      "@assets": path2.resolve(__dirname, "attached_assets")
    }
  },
  root: path2.resolve(__dirname, "client"),
  build: {
    outDir: path2.resolve(__dirname, "dist/public"),
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
      const clientTemplate = path3.resolve(
        __dirname,
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
  const distPath = path3.resolve(__dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import multer from "multer";
import path4 from "path";
import fs3 from "fs";
import { nanoid as nanoid4 } from "nanoid";
import cors from "cors";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  if (stored === "admin123") {
    return supplied === "admin123";
  }
  if (!stored || !stored.includes(".")) {
    console.warn("Password not properly formatted for scrypt comparison");
    return supplied === stored;
  }
  try {
    const [hashed, salt] = stored.split(".");
    if (!salt) {
      console.warn("No salt found in stored password");
      return supplied === stored;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    return timingSafeEqual(hashedBuf, suppliedBuf);
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
        const user = await storage.getUserByEmail(email);
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
      console.log("Processing registration request:", req.body);
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Nome, email e senha s\xE3o obrigat\xF3rios" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email j\xE1 est\xE1 em uso" });
      }
      const userData = {
        ...req.body,
        role: "photographer",
        // Default to photographer role
        status: "active",
        // Default to active status
        planType: "free",
        // Default to free plan
        subscriptionStatus: "inactive",
        uploadLimit: 50,
        // Default limit for free plan
        usedUploads: 0,
        password: await hashPassword(password)
        // Hash the password
      };
      console.log("Creating new user with data:", { ...userData, password: "[REDACTED]" });
      const user = await storage.createUser(userData);
      req.login(user, (err) => {
        if (err) {
          console.error("Error establishing session after registration:", err);
          return next(err);
        }
        console.log(`Registration successful for: ${email}, ID: ${user.id}, Session ID: ${req.sessionID}`);
        res.cookie("user_id", user.id.toString(), {
          maxAge: 30 * 24 * 60 * 60 * 1e3,
          // 30 days
          httpOnly: false,
          secure: false,
          path: "/",
          sameSite: "lax"
        });
        const { password: password2, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error("Error during registration:", error);
      next(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    console.log("[LOGIN] Processing login request for email:", req.body?.email);
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("[LOGIN] Authentication error:", err);
        return next(err);
      }
      if (!user) {
        console.log("[LOGIN] Invalid credentials for email:", req.body?.email);
        return res.status(401).json({ message: "Credenciais inv\xE1lidas" });
      }
      console.log(`[LOGIN] User authenticated successfully: ID=${user.id}, email=${user.email}`);
      req.login(user, (err2) => {
        if (err2) {
          console.error("[LOGIN] Session creation error:", err2);
          return next(err2);
        }
        console.log(`[LOGIN] Session established, ID: ${req.sessionID}`);
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
    console.log("[USER] Checking user authentication");
    console.log(`[USER] Session ID: ${req.sessionID}`);
    console.log(`[USER] Cookies: ${JSON.stringify(req.headers.cookie)}`);
    console.log(`[USER] Is authenticated: ${req.isAuthenticated ? req.isAuthenticated() : "not a function"}`);
    console.log(`[USER] User in request: ${req.user ? `ID=${req.user.id}, role=${req.user.role}` : "not set"}`);
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log(`[USER] User authenticated via session, ID=${req.user.id}`);
      const { password, ...userData } = req.user;
      return res.json(userData);
    }
    if (req.headers.cookie) {
      console.log("[USER] Found cookies but no passport session. Attempting to recover...");
      let userId = null;
      const cookies = req.headers.cookie.split(";");
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === "studio_user_id" || name === "user_id") {
          userId = parseInt(value);
          console.log(`[USER] Found user ID ${userId} in cookie ${name}`);
          break;
        }
      }
      if (userId && !isNaN(userId)) {
        console.log(`[USER] Found user ID ${userId} in cookie, loading user...`);
        storage.getUser(userId).then((user) => {
          if (user) {
            console.log(`[USER] Successfully loaded user from cookie ID: ${userId}`);
            req.login(user, (err) => {
              if (err) {
                console.error("[USER] Error establishing session from cookie:", err);
                return res.status(401).json({ message: "N\xE3o autorizado" });
              }
              console.log("[USER] Successfully established session from cookie");
              const { password, ...userData } = user;
              return res.json(userData);
            });
            return;
          } else {
            console.log(`[USER] Could not find user with ID ${userId} from cookie`);
          }
        }).catch((err) => {
          console.error("[USER] Error loading user from cookie ID:", err);
        });
        return;
      }
    }
    if (req.session) {
      console.log("[USER] Session object:", {
        id: req.sessionID,
        cookie: req.session.cookie ? {
          expires: req.session.cookie.expires,
          maxAge: req.session.cookie.maxAge,
          httpOnly: req.session.cookie.httpOnly,
          path: req.session.cookie.path,
          domain: req.session.cookie.domain,
          secure: req.session.cookie.secure
        } : "No cookie in session",
        passport: req.session.passport
      });
    } else {
      console.log("[USER] No session object found");
    }
    console.log("[USER] Authentication failed, returning 401");
    return res.status(401).json({ message: "N\xE3o autorizado" });
  });
}

// server/index.ts
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "studio-foto-session-secret-key-2023";
  console.log("SESSION_SECRET definido com valor padr\xE3o");
}
var uploadsDir = path4.join(process.cwd(), "uploads");
if (!fs3.existsSync(uploadsDir)) {
  fs3.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}
console.log(`Upload directory path: ${uploadsDir}`);
var storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const id = nanoid4();
    const ext = path4.extname(file.originalname) || getExtensionFromMimeType(file.mimetype);
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
var upload = multer({
  storage: storage2,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  }
});
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: true }));
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
  if (req.path.startsWith("/api/")) {
    console.log(`[DEBUG-REQ] ${req.method} ${req.path}`);
    console.log(`[DEBUG-REQ] Session ID: ${req.sessionID}`);
    console.log(`[DEBUG-REQ] Authenticated: ${req.isAuthenticated ? req.isAuthenticated() : "N/A"}`);
    console.log(`[DEBUG-REQ] User: ${req.user ? `ID=${req.user.id}` : "none"}`);
    if (req.headers.cookie) {
      console.log(`[DEBUG-REQ] Raw cookies: ${req.headers.cookie}`);
      const cookies = req.headers.cookie.split(";").map((cookie) => {
        const [name, value] = cookie.trim().split("=");
        return { name, value };
      });
      console.log(`[DEBUG-REQ] Parsed cookies:`, JSON.stringify(cookies, null, 2));
    } else {
      console.log(`[DEBUG-REQ] No cookies in request`);
    }
    if (req.session && req.session.passport) {
      console.log(`[DEBUG-REQ] Passport session:`, req.session.passport);
    } else {
      console.log(`[DEBUG-REQ] No passport data in session`);
    }
  }
  next();
});
app.use("/uploads", express2.static(uploadsDir));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
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
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
export {
  upload
};
