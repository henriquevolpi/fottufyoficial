import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, primaryKey, foreignKey, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User model matching Render database structure
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("photographer"),
  status: text("status").default("active"),
  phone: text("phone"),
  created_at: timestamp("created_at").defaultNow(),
  plan: text("plan").default("free"),
  plan_expires_at: timestamp("plan_expires_at"),
  max_projects: integer("max_projects").default(5),
  max_photos_per_project: integer("max_photos_per_project").default(50),
  is_active: boolean("is_active").default(true),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Relations for users
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(newProjects),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastEvent: true,
  lastLoginAt: true,
  uploadLimit: true,
  usedUploads: true,
  subscriptionStartDate: true,
  subscriptionEndDate: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
});

// Definição dos planos disponíveis
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Gratuito",
    type: "free",
    price: 0,
    uploadLimit: 10, // limite para teste
    description: "Plano para testes",
  },
  BASIC: {
    name: "Básico",
    type: "basic",
    price: 14.9,
    uploadLimit: 10000,
    description: "10.000 uploads por conta",
    stripePriceId: "price_1RLDC2Hhs27r0l2SJGfPUumX", // Adicionando o mesmo priceId do Basic_V2 para compatibilidade
  },
  STANDARD: {
    name: "Padrão",
    type: "standard",
    price: 37.9,
    uploadLimit: 50000,
    description: "50.000 uploads por conta",
    stripePriceId: "price_1RLDCLHhs27r0l2SXe9gkVlD", // Adicionando o mesmo priceId do Standard_V2 para compatibilidade
  },
  PROFESSIONAL: {
    name: "Profissional",
    type: "professional",
    price: 70,
    uploadLimit: 100000,
    description: "100.000 uploads por conta",
    stripePriceId: "price_1RLDCpHhs27r0l2S4InekNvP", // Adicionando o mesmo priceId do Professional_V2 para compatibilidade
  },
  // Novos planos V2
  BASIC_V2: {
    name: "Básico",
    type: "basic_v2",
    price: 14.9,
    uploadLimit: 6000,
    description: "6.000 uploads por conta",
    stripePriceId: "price_1RLDC2Hhs27r0l2SJGfPUumX",
  },
  STANDARD_V2: {
    name: "Padrão",
    type: "standard_v2",
    price: 29.9,
    uploadLimit: 15000,
    description: "15.000 uploads por conta",
    stripePriceId: "price_1RLDCLHhs27r0l2SXe9gkVlD",
  },
  PROFESSIONAL_V2: {
    name: "Profissional",
    type: "professional_v2",
    price: 49.9,
    uploadLimit: 35000,
    description: "35.000 uploads por conta",
    stripePriceId: "price_1RLDCpHhs27r0l2S4InekNvP",
  },
};

// Existing projects schema (maintained for backward compatibility)
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(), // Used for public URLs
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  photographerId: integer("photographer_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pendente"), // pendente | revisado | finalizado | arquivado
  photos: jsonb("photos").default([]).$type<{
    id: string;
    url: string;
    filename: string;
    originalName?: string;
  }[]>(),
  selectedPhotos: jsonb("selected_photos").default([]).$type<string[]>(),
  showWatermark: boolean("show_watermark").default(true), // Frontend watermark control
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  photos: true,
  selectedPhotos: true,
  createdAt: true,
});

// New tables with UUID and proper relations as requested

// New projects table with UUIDs
export const newProjects = pgTable("new_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  showWatermark: boolean("show_watermark").default(true), // Frontend watermark control
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations for the new projects table
export const newProjectsRelations = relations(newProjects, ({ one, many }) => ({
  user: one(users, {
    fields: [newProjects.userId],
    references: [users.id],
  }),
  photos: many(photos),
}));

export const insertNewProjectSchema = createInsertSchema(newProjects).omit({
  id: true,
  createdAt: true,
});

// Photos table with UUIDs
export const photos = pgTable("photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => newProjects.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename"), // Nome único usado pelo R2
  originalName: text("original_name"), // Nome original do arquivo enviado pelo usuário
  selected: boolean("selected").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations for the photos table
export const photosRelations = relations(photos, ({ one, many }) => ({
  project: one(newProjects, {
    fields: [photos.projectId],
    references: [newProjects.id],
  }),
  comments: many(photoComments),
}));

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
});

// Photo Comments table
export const photoComments = pgTable("photo_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  photoId: uuid("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(), // Nome do cliente que comentou
  comment: text("comment").notNull(), // O comentário em si
  isViewed: boolean("is_viewed").default(false), // Se o fotógrafo já viu o comentário
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations for the photo comments table
export const photoCommentsRelations = relations(photoComments, ({ one }) => ({
  photo: one(photos, {
    fields: [photoComments.photoId],
    references: [photos.id],
  }),
}));

export const insertPhotoCommentSchema = createInsertSchema(photoComments).omit({
  id: true,
  createdAt: true,
  isViewed: true,
}).extend({
  photoId: z.string().min(1), // Accept any non-empty string for photo ID
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type NewProject = typeof newProjects.$inferSelect;
export type InsertNewProject = z.infer<typeof insertNewProjectSchema>;

export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;

export type PhotoComment = typeof photoComments.$inferSelect;
export type InsertPhotoComment = z.infer<typeof insertPhotoCommentSchema>;

export type OldPhoto = {
  id: string;
  url: string;
  filename: string;
  originalName?: string;
};

export type WebhookPayload = {
  type: string;
  email: string;
  subscription_id: string;
  timestamp: string;
  plan_type?: string;
  metadata?: Record<string, any>;
};

export type SubscriptionWebhookPayload = {
  type: string; // subscription.created, subscription.updated, subscription.cancelled
  data: {
    customer: {
      email: string;
      id: string;
    };
    subscription: {
      id: string;
      status: string;
      current_period_end: number;
      metadata?: {
        planType?: string;
        planPrice?: string;
        planName?: string;
        userId?: string;
        userEmail?: string;
        [key: string]: string | undefined;
      };
      plan: {
        id: string;
        product: string;
      };
    };
  };
};

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: uuid("token").notNull().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  token: true,
  createdAt: true,
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
// NOTA: Tabela session removida do schema Drizzle para evitar conflitos
// A tabela session é gerenciada pelo connect-pg-simple e não deve ser alterada pelo Drizzle
// Formato atual no banco: sid (varchar), sess (json), expire (timestamp)
// Esta abordagem previne tentativas de alteração da tabela session pelo Drizzle