import { User } from "@shared/schema";

/**
 * Transforma dados de usuário PostgreSQL (snake_case) para formato frontend (camelCase)
 * e adiciona propriedades computadas baseadas no plano conforme sistema original
 */
export function enhanceUserWithComputedProps(user: any): User {
  // Mapear campos PostgreSQL snake_case para camelCase
  const mappedUser = {
    ...user,
    planType: user.plan || 'free',
    status: user.isActive === true ? 'active' : 'inactive',
    subscriptionStatus: user.isActive === true ? 'active' : 'inactive'
  };

  // Definir limites baseados no tipo de plano conforme sistema original
  let uploadLimit = 10; // free default
  let maxProjects = 5; // free default
  let maxPhotosPerProject = 50; // free default

  switch (mappedUser.planType) {
    // Planos básicos ligados à Hotmart (6.000 uploads)
    case 'basic':
    case 'basic_v2':
    case 'basic_fottufy':
      uploadLimit = 6000; // Plano básico Hotmart
      maxProjects = 50;
      maxPhotosPerProject = 500;
      break;
    
    // Planos fotógrafo/padrão (15.000 uploads)  
    case 'standard':
    case 'standard_v2':
    case 'fotografo':
      uploadLimit = 15000; // Plano fotógrafo
      maxProjects = 100;
      maxPhotosPerProject = 1000;
      break;
    
    // Planos profissionais/estúdio (35.000 uploads)
    case 'professional':
    case 'professional_v2':
    case 'professional_fottufy':
    case 'estudio':
      uploadLimit = 35000; // Plano estúdio
      maxProjects = 200;
      maxPhotosPerProject = 2000;
      break;
    
    case 'free':
    default:
      uploadLimit = 10;
      maxProjects = 5;
      maxPhotosPerProject = 50;
      break;
  }

  return {
    ...mappedUser,
    uploadLimit,
    maxProjects,
    maxPhotosPerProject
  };
}