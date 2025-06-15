import { SUBSCRIPTION_PLANS, type User } from "@shared/schema";

/**
 * Calculate upload limit based on user's plan
 */
export function calculateUploadLimit(user: Partial<User>): number {
  const plan = user.plan || user.subscriptionPlan || "free";
  
  // Map plan names to subscription plan objects
  const planMapping: Record<string, any> = {
    'free': SUBSCRIPTION_PLANS.FREE,
    'basic': SUBSCRIPTION_PLANS.BASIC,
    'basic_v2': SUBSCRIPTION_PLANS.BASIC_V2,
    'standard': SUBSCRIPTION_PLANS.STANDARD,
    'standard_v2': SUBSCRIPTION_PLANS.STANDARD_V2,
    'professional': SUBSCRIPTION_PLANS.PROFESSIONAL,
    'professional_v2': SUBSCRIPTION_PLANS.PROFESSIONAL_V2,
  };
  
  const subscriptionPlan = planMapping[plan.toLowerCase()];
  return subscriptionPlan?.uploadLimit || SUBSCRIPTION_PLANS.FREE.uploadLimit;
}

/**
 * Get plan type from user data
 */
export function getPlanType(user: Partial<User>): string {
  return user.plan || user.subscriptionPlan || "free";
}

/**
 * Enhance user object with computed properties
 * Maps PostgreSQL column names to expected frontend format
 */
export function enhanceUserWithComputedProps(user: any): User {
  // Map PostgreSQL column names to camelCase
  const mappedUser = {
    ...user,
    // Map snake_case to camelCase for compatibility
    isActive: user.is_active ?? user.isActive,
    maxProjects: user.max_projects ?? user.maxProjects,
    maxPhotosPerProject: user.max_photos_per_project ?? user.maxPhotosPerProject,
    usedUploads: user.used_uploads ?? user.usedUploads,
    subscriptionPlan: user.subscription_plan ?? user.subscriptionPlan,
    subscriptionStatus: user.subscription_status ?? user.subscriptionStatus,
    subscriptionStartDate: user.subscription_start_date ?? user.subscriptionStartDate,
    subscriptionEndDate: user.subscription_end_date ?? user.subscriptionEndDate,
    stripeCustomerId: user.stripe_customer_id ?? user.stripeCustomerId,
    stripeSubscriptionId: user.stripe_subscription_id ?? user.stripeSubscriptionId,
    createdAt: user.created_at ?? user.createdAt,
    updatedAt: user.updated_at ?? user.updatedAt,
    planExpiresAt: user.plan_expires_at ?? user.planExpiresAt,
    lastLoginAt: user.last_login_at ?? user.lastLoginAt,
  };

  return {
    ...mappedUser,
    uploadLimit: calculateUploadLimit(mappedUser),
    planType: getPlanType(mappedUser),
    status: mappedUser.isActive ? 'active' : 'inactive',
    subscription_id: mappedUser.stripeSubscriptionId || null,
  };
}