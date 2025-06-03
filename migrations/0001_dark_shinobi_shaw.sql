ALTER TABLE "users" ADD COLUMN "manual_activation_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "manual_activation_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_manual_activation" boolean DEFAULT false;