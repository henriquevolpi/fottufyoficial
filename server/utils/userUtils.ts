import { User } from "@shared/schema";

/**
 * Transforma dados de usuário PostgreSQL (snake_case) para formato frontend (camelCase)
 * e adiciona propriedades computadas baseadas no plano
 */
export function enhanceUserWithComputedProps(user: any): User {
  // Mapear campos PostgreSQL snake_case para camelCase
  const mappedUser = {
    ...user,
    planType: user.plan || 'free',
    status: user.isActive === true ? 'active' : 'inactive',
    subscriptionStatus: user.isActive === true ? 'active' : 'inactive'
  };

  // Definir limites baseados no tipo de plano
  let uploadLimit = 10; // free default
  let maxProjects = 5; // free default
  let maxPhotosPerProject = 100; // free default

  switch (mappedUser.planType) {
    case 'basic':
    case 'basic_v2':
    case 'basic_fottufy':
      uploadLimit = 100;
      maxProjects = 15;
      maxPhotosPerProject = 500;
      break;
    case 'standard':
    case 'standard_v2':
      uploadLimit = 300;
      maxProjects = 30;
      maxPhotosPerProject = 1000;
      break;
    case 'professional':
    case 'professional_v2':
    case 'professional_fottufy':
      uploadLimit = 1000;
      maxProjects = 100;
      maxPhotosPerProject = 2000;
      break;
    case 'free':
    default:
      uploadLimit = 10;
      maxProjects = 5;
      maxPhotosPerProject = 100;
      break;
  }

  return {
    ...mappedUser,
    uploadLimit,
    maxProjects,
    maxPhotosPerProject
  };
}