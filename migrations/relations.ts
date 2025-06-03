import { relations } from "drizzle-orm/relations";
import { users, projects, newProjects, photos, passwordResetTokens } from "./schema";

export const projectsRelations = relations(projects, ({one}) => ({
	user: one(users, {
		fields: [projects.photographerId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	projects: many(projects),
	newProjects: many(newProjects),
	passwordResetTokens: many(passwordResetTokens),
}));

export const newProjectsRelations = relations(newProjects, ({one, many}) => ({
	user: one(users, {
		fields: [newProjects.userId],
		references: [users.id]
	}),
	photos: many(photos),
}));

export const photosRelations = relations(photos, ({one}) => ({
	newProject: one(newProjects, {
		fields: [photos.projectId],
		references: [newProjects.id]
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));