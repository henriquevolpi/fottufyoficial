import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, primaryKey, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Existing User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("photographer"), // photographer | admin
  status: text("status").notNull().default("active"), // active | suspended | canceled
  createdAt: timestamp("created_at").notNull().defaultNow(),
  
  // Campos relacionados ao plano e assinatura
  planType: text("plan_type").default("free"), // free | basic | standard | professional
  uploadLimit: integer("upload_limit").default(0),
  usedUploads: integer("used_uploads").default(0),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  subscriptionStatus: text("subscription_status").default("inactive"), // active | inactive | canceled
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscription_id: text("subscription_id"), // mantido para compatibilidade
  
  lastEvent: jsonb("last_event").default(null).$type<{
    type: string;
    timestamp: string;
  } | null>(),
});

// Relations for users
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(newProjects),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastEvent: true,
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
  },
  STANDARD: {
    name: "Padrão",
    type: "standard",
    price: 37.9,
    uploadLimit: 50000,
    description: "50.000 uploads por conta",
  },
  PROFESSIONAL: {
    name: "Profissional",
    type: "professional",
    price: 70,
    uploadLimit: 100000,
    description: "100.000 uploads por conta",
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
  status: text("status").notNull().default("pending"), // pending | reviewed | reopened | archived
  photos: jsonb("photos").default([]).$type<{
    id: string;
    url: string;
    filename: string;
  }[]>(),
  selectedPhotos: jsonb("selected_photos").default([]).$type<string[]>(),
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
  selected: boolean("selected").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations for the photos table
export const photosRelations = relations(photos, ({ one }) => ({
  project: one(newProjects, {
    fields: [photos.projectId],
    references: [newProjects.id],
  }),
}));

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
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

export type OldPhoto = {
  id: string;
  url: string;
  filename: string;
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
      plan: {
        id: string;
        product: string;
      };
    };
  };
};
