import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("photographer"), // photographer | admin
  status: text("status").notNull().default("active"), // active | suspended | canceled
  createdAt: timestamp("created_at").notNull().defaultNow(),
  subscription_id: text("subscription_id"),
  lastEvent: jsonb("last_event").default(null).$type<{
    type: string;
    timestamp: string;
  } | null>(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastEvent: true,
});

// Project model
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Photo = {
  id: string;
  url: string;
  filename: string;
};

export type WebhookPayload = {
  type: string;
  email: string;
  subscription_id: string;
  timestamp: string;
};
