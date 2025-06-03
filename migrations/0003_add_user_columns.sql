-- Migration to add new columns to users table only
-- This migration is safe and only adds new columns without touching existing data

-- Add pending downgrade columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_downgrade_date" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_downgrade_reason" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "original_plan_before_downgrade" text;

-- Add manual activation columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "manual_activation_date" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "manual_activation_by" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_manual_activation" boolean DEFAULT false;

-- Add last login tracking
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;