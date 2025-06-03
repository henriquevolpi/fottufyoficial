import { pgTable, unique, serial, text, timestamp, integer, jsonb, boolean, foreignKey, index, varchar, json, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	role: text().default('photographer').notNull(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	planType: text("plan_type").default('free'),
	uploadLimit: integer("upload_limit").default(0),
	usedUploads: integer("used_uploads").default(0),
	subscriptionStartDate: timestamp("subscription_start_date", { mode: 'string' }),
	subscriptionEndDate: timestamp("subscription_end_date", { mode: 'string' }),
	subscriptionStatus: text("subscription_status").default('inactive'),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	subscriptionId: text("subscription_id"),
	lastEvent: jsonb("last_event").default(null),
	phone: text().notNull(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	pendingDowngradeDate: timestamp("pending_downgrade_date", { mode: 'string' }),
	pendingDowngradeReason: text("pending_downgrade_reason"),
	originalPlanBeforeDowngrade: text("original_plan_before_downgrade"),
	manualActivationDate: timestamp("manual_activation_date", { mode: 'string' }),
	manualActivationBy: text("manual_activation_by"),
	isManualActivation: boolean("is_manual_activation").default(false),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	publicId: text("public_id").notNull(),
	name: text().notNull(),
	clientName: text("client_name").notNull(),
	clientEmail: text("client_email").notNull(),
	photographerId: integer("photographer_id").notNull(),
	status: text().default('pending').notNull(),
	photos: jsonb().default([]),
	selectedPhotos: jsonb("selected_photos").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.photographerId],
			foreignColumns: [users.id],
			name: "projects_photographer_id_users_id_fk"
		}),
	unique("projects_public_id_unique").on(table.publicId),
]);

export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const newProjects = pgTable("new_projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "new_projects_user_id_fkey"
		}),
]);

export const photos = pgTable("photos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	url: text().notNull(),
	selected: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	originalName: text("original_name"),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [newProjects.id],
			name: "photos_project_id_fkey"
		}).onDelete("cascade"),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: uuid().defaultRandom().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: boolean().default(false).notNull(),
}, (table) => [
	index("idx_password_reset_tokens_token").using("btree", table.token.asc().nullsLast().op("uuid_ops")),
	index("idx_password_reset_tokens_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_fkey"
		}).onDelete("cascade"),
]);
