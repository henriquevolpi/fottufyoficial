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
 */
export function enhanceUserWithComputedProps(user: any): User {
  return {
    ...user,
    uploadLimit: calculateUploadLimit(user),
    planType: getPlanType(user),
    status: user.isActive ? 'active' : 'inactive',
    subscription_id: user.stripeSubscriptionId || null,
  };
}