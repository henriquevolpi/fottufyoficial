import crypto from 'crypto';
import { SUBSCRIPTION_PLANS } from '@shared/schema';
import { InsertUser, type User } from '@shared/schema';
import { storage } from '../storage';
import { randomBytes } from 'crypto';
import { sendEmail } from '../utils/sendEmail';
import { hashPassword } from '../auth';
import { sendWelcomeEmail } from '../utils/welcomeEmail';

// Definição da interface para o payload do webhook da Hotmart
interface HotmartWebhookPayload {
  event: string;          // Tipo do evento (compra, cancelamento, etc)
  email?: string;         // Email pode estar em diferentes níveis do payload
  buyer?: {
    email?: string;       // Email pode estar aqui também
  };
  purchase?: {
    buyer?: {
      email?: string;     // Ou aqui
    };
  };
  data: {
    email?: string;       // Email pode estar diretamente em data
    buyer_email?: string; // Em alguns formatos, o email pode estar aqui como string
    buyer?: {
      email?: string;     // Email do comprador
      name?: string;      // Nome do comprador
      phone?: string;     // Telefone do comprador (opcional)
    };
    contact?: {
      email?: string;     // Email pode estar no objeto de contato em alguns payloads
    };
    purchase?: {
      transaction?: string; // ID da transação ou URL com parâmetros (pode conter "off=XXXX")
      status?: string;      // Status da compra (approved, refunded, etc)
      offer?: {
        code?: string;      // Código da oferta (usado para mapear o plano)
        off?: string;       // ID da oferta conforme especificado (ex: ro76q5uz)
        status?: string;    // Status da oferta
      };
      plan?: {
        name?: string;      // Nome do plano (usado como fallback)
      };
    };
    subscription?: {
      subscriber?: string;  // ID do assinante na Hotmart
      status?: string;      // Status da assinatura (active, cancelled, etc)
      plan?: string | {     // Nome ou identificador do plano (pode ser string ou objeto)
        name?: string;
      };
    };
    product?: {
      id?: string;          // ID do produto
      name?: string;        // Nome do produto
    };
    params?: {
      off?: string;         // ID da oferta como parâmetro
    };
  };
}

// Mapeamento dos códigos de oferta da Hotmart para os planos do Fottufy
// Configurado com os códigos reais das ofertas da Hotmart
const HOTMART_OFFER_TO_PLAN_MAP: Record<string, string> = {
  // Planos mensais
  "ro76q5uz": "basic_v2",        // R$14,90 - 6.000 fotos
  "z0pxaesy": "basic_v2",        // R$14,90 - 6.000 fotos  
  "ze3jhsob": "basic_v2",        // R$14,90 - 6.000 fotos
  "tpfhcllk": "standard_v2",     // R$29,90 - 15.000 fotos (CORRIGIDO)
  "hjb8gqn7": "standard_v2",     // R$29,90 - 15.000 fotos
  "xtuh4ji0": "professional_v2", // R$49,90 - 35.000 fotos (CORRIGIDO)
  
  // Planos anuais - TROCAR pelos códigos reais da Hotmart
  "BASICO_ANUAL_CODIGO": "basic_v2",        // Básico Anual - substituir código
  "STANDARD_ANUAL_CODIGO": "standard_v2",   // Standard Anual - substituir código
  "PREMIUM_ANUAL_CODIGO": "professional_v2" // Premium Anual - substituir código
};

// Função para gerar uma senha aleatória para novos usuários
export function generateRandomPassword(length = 12): string {
  const buffer = randomBytes(length);
  return buffer.toString('hex').slice(0, length);
}

// Função para validar a assinatura da Hotmart (deve ser implementada com a chave correta)
export function validateHotmartSignature(payload: string, signature: string, secret: string): boolean {
  // SEGURANÇA MELHORADA: Só permitir webhooks sem validação em ambiente de desenvolvimento
  if (!secret) {
    if (process.env.NODE_ENV === 'development') {
      console.warn("[DEV] HOTMART_WEBHOOK_SECRET não configurado. Validação pulada apenas em desenvolvimento!");
      return true;
    } else {
      console.error("[SECURITY] HOTMART_WEBHOOK_SECRET é obrigatório em produção!");
      throw new Error("Webhook secret é obrigatório em produção");
    }
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedSignature = hmac.update(payload).digest('hex');
    
    return calculatedSignature === signature;
  } catch (error) {
    console.error("Erro na validação da assinatura Hotmart:", error);
    return false;
  }
}

/**
 * Determina o tipo de plano com base na oferta da Hotmart
 * 
 * Esta função implementa:
 * 1. Busca de ID da oferta em múltiplos locais do payload
 * 2. Verificação do ID contra o mapeamento de ofertas para planos
 * 3. Detecção e rejeição de planos de teste (retorna null)
 * 4. Busca recursiva de IDs de oferta em estruturas complexas
 * 
 * @param payload O payload recebido do webhook da Hotmart
 * @returns String com o tipo de plano ou null se não for encontrado/válido
 */
export function determinePlanType(payload: HotmartWebhookPayload): string | null {
  try {
    if (!payload) {
      console.log('Hotmart: Payload inválido');
      return null;
    }
    
    // Primeiro verificar locais conhecidos
    // Verificar se temos o ID da oferta diretamente nos parâmetros
    if (payload.data?.params?.off) {
      const offerId = payload.data.params.off;
      console.log(`Hotmart: ID da oferta encontrado em params: ${offerId}`);
      if (HOTMART_OFFER_TO_PLAN_MAP[offerId]) {
        return HOTMART_OFFER_TO_PLAN_MAP[offerId];
      }
    }
    
    // Verificar se temos o ID da oferta diretamente no objeto offer
    if (payload.data?.purchase?.offer?.off) {
      const offerId = payload.data.purchase.offer.off;
      console.log(`Hotmart: ID da oferta encontrado em offer: ${offerId}`);
      if (HOTMART_OFFER_TO_PLAN_MAP[offerId]) {
        return HOTMART_OFFER_TO_PLAN_MAP[offerId];
      }
    }
    
    // Buscar o ID da oferta no parâmetro "off" dentro da URL da transação
    if (payload.data?.purchase?.transaction) {
      const transactionUrl = payload.data.purchase.transaction;
      // Verificar se a URL contém o parâmetro "off"
      if (typeof transactionUrl === 'string' && transactionUrl.includes('off=')) {
        // Extrair o ID da oferta do parâmetro "off"
        const offMatch = transactionUrl.match(/off=([a-zA-Z0-9]+)/);
        if (offMatch && offMatch[1]) {
          const offerId = offMatch[1];
          console.log(`Hotmart: ID da oferta encontrado na URL: ${offerId}`);
          if (HOTMART_OFFER_TO_PLAN_MAP[offerId]) {
            return HOTMART_OFFER_TO_PLAN_MAP[offerId];
          }
        }
      }
    }
    
    // Tentar pegar o código da oferta (segunda tentativa)
    const offerCode = payload.data?.purchase?.offer?.code;
    if (offerCode && HOTMART_OFFER_TO_PLAN_MAP[offerCode]) {
      console.log(`Hotmart: Usando código da oferta: ${offerCode}`);
      return HOTMART_OFFER_TO_PLAN_MAP[offerCode];
    }
    
    // Buscar recursivamente em qualquer parte do payload
    console.log('Hotmart: Iniciando busca recursiva por ID de oferta...');
    const offerId = findOfferIdInPayload(payload);
    if (offerId) {
      console.log(`Hotmart: ID da oferta encontrado por busca recursiva: ${offerId}`);
      return HOTMART_OFFER_TO_PLAN_MAP[offerId];
    }
    
    // Verificar se o plano encontrado não é um plano de teste
    const planName = payload.data?.purchase?.plan?.name || payload.data?.subscription?.plan;
    
    if (planName) {
      console.log(`Hotmart: Verificando nome do plano: ${JSON.stringify(planName)}`);
      
      // Extrair o nome correto dependendo do tipo
      let rawName = '';
      
      if (typeof planName === 'string') {
        // Se for string, usar diretamente
        rawName = planName;
      } else if (typeof planName === 'object' && planName !== null) {
        // Se for objeto, tentar extrair a propriedade name
        rawName = planName.name || '';
      }
      
      // Verificar se temos um nome válido após a normalização
      if (rawName && typeof rawName === 'string') {
        console.log(`Hotmart: Nome do plano normalizado: ${rawName}`);
        
        // Converter para minúsculas de forma segura e verificar
        const lowerName = rawName.toLowerCase();
        
        // Verificar se é um plano de teste (não devemos processar)
        if (lowerName.includes('teste') || lowerName.includes('test')) {
          console.log(`Hotmart: Plano de teste detectado, não será processado`);
          return null;
        }
        
        // Não usar mais o nome como fallback para determinar o tipo de plano
        // Agora só processamos se tivermos um ID de oferta válido
      }
    }
    
    // Se não encontrou um ID de oferta válido, retornar null para indicar que não deve processar
    console.log(`Hotmart: Nenhuma oferta válida encontrada`);
    return null;
  } catch (error) {
    console.error('Erro ao determinar tipo de plano:', error);
    // Em caso de erro, retornar null para não processar
    return null;
  }
}

// Esta seção foi removida e substituída pelo módulo dedicado welcomeEmail.ts

/**
 * Função recursiva auxiliar para buscar o email em qualquer lugar do objeto payload
 * Verifica em todas as propriedades, incluindo objetos aninhados
 */
function findEmailInPayload(obj: any, depth: number = 0): string | null {
  // Limite de profundidade para evitar loops infinitos em objetos circulares
  if (depth > 15 || !obj || typeof obj !== 'object') {
    return null;
  }
  
  // Verificar estruturas específicas conhecidas que são mais complexas
  // 1. Estrutura: data.transaction.details.purchaseInfo.clientProfile.personalInfo.contact.email.primaryAddress
  const complexEmail1 = obj?.data?.transaction?.details?.purchaseInfo?.clientProfile?.personalInfo?.contact?.email?.primaryAddress;
  if (complexEmail1 && typeof complexEmail1 === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(complexEmail1)) {
    console.log(`Hotmart: Email encontrado em estrutura complexa (tipo 1):`, complexEmail1);
    return complexEmail1;
  }
  
  // 2. Estrutura: data.order.details.buyer.user_identity.contact.primary.email_address
  const complexEmail2 = obj?.data?.order?.details?.buyer?.user_identity?.contact?.primary?.email_address;
  if (complexEmail2 && typeof complexEmail2 === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(complexEmail2)) {
    console.log(`Hotmart: Email encontrado em estrutura complexa (tipo 2):`, complexEmail2);
    return complexEmail2;
  }
  
  // Procurar por propriedades que possam conter um email
  const emailKeys = [
    'email', 'mail', 'e-mail', 'emailAddress', 'email_address', 'subscriber_email', 
    'buyer_email', 'customer_email', 'primaryAddress', 'primaryEmail', 'emailPrimary',
    'userEmail', 'client_email', 'contactEmail'
  ];
  
  // Procurar por valores que parecem ser emails, mesmo em propriedades com nomes não padrão
  for (const key of Object.keys(obj)) {
    // Verificar se a propriedade atual é um email (verificando pelo nome da propriedade)
    if (emailKeys.includes(key.toLowerCase()) && typeof obj[key] === 'string') {
      const potentialEmail = obj[key];
      // Validação básica de email
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(potentialEmail)) {
        console.log(`Hotmart: Email encontrado na propriedade ${key}:`, potentialEmail);
        return potentialEmail;
      }
    }
    
    // Verificar se o valor parece ser um email, independente do nome da propriedade
    if (typeof obj[key] === 'string') {
      const value = obj[key];
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        console.log(`Hotmart: Email encontrado como valor da propriedade ${key}:`, value);
        return value;
      }
    }
    
    // Verificar objetos aninhados
    if (obj[key] && typeof obj[key] === 'object') {
      const nestedEmail = findEmailInPayload(obj[key], depth + 1);
      if (nestedEmail) {
        return nestedEmail;
      }
    }
  }
  
  return null;
}

/**
 * Função auxiliar recursiva para buscar telefone em objetos aninhados
 */
function findPhoneRecursive(obj: any, depth: number = 0): string | null {
  if (depth > 10 || !obj || typeof obj !== 'object') {
    return null;
  }
  
  // Procurar por chaves que podem conter números de telefone
  const phoneKeys = ['phone', 'mobile', 'cellphone', 'telephone', 'tel', 'contactNumber', 'phoneNumber'];
  
  for (const key of Object.keys(obj)) {
    // Se encontrar uma propriedade que parece ser um telefone
    if (phoneKeys.includes(key.toLowerCase()) && typeof obj[key] === 'string') {
      const potentialPhone = obj[key];
      // Validação básica: pelo menos 8 dígitos
      if (/^[+\d\s()-]{8,}$/.test(potentialPhone)) {
        console.log(`Hotmart: Telefone do cliente encontrado na propriedade ${key}: ${potentialPhone}`);
        return potentialPhone;
      }
    }
    
    // Verificar objetos aninhados
    if (obj[key] && typeof obj[key] === 'object') {
      const nestedPhone = findPhoneRecursive(obj[key], depth + 1);
      if (nestedPhone) {
        return nestedPhone;
      }
    }
  }
  
  return null;
}

/**
 * Função para extrair telefone do cliente de diferentes locais no payload 
 */
function findCustomerPhone(payload: any): string | null {
  try {
    // Verificar estruturas complexas primeiro
    // 1. Estrutura: data.transaction.details.purchaseInfo.clientProfile.personalInfo.contact.phone.mobile
    const complexPhone1 = payload?.data?.transaction?.details?.purchaseInfo?.clientProfile?.personalInfo?.contact?.phone?.mobile;
    if (complexPhone1 && typeof complexPhone1 === 'string' && complexPhone1.length > 2) {
      console.log(`Hotmart: Telefone do cliente encontrado em estrutura complexa (tipo 1): ${complexPhone1}`);
      return complexPhone1;
    }
    
    // 2. Estrutura: data.order.details.buyer.user_identity.contact.primary.phone.number
    // Tenta combinar código do país + número
    const countryCode = payload?.data?.order?.details?.buyer?.user_identity?.contact?.primary?.phone?.countryCode;
    const phoneNumber = payload?.data?.order?.details?.buyer?.user_identity?.contact?.primary?.phone?.number;
    if (countryCode && phoneNumber && typeof countryCode === 'string' && typeof phoneNumber === 'string') {
      const fullPhone = countryCode.startsWith('+') ? `${countryCode}${phoneNumber}` : `+${countryCode}${phoneNumber}`;
      console.log(`Hotmart: Telefone do cliente composto a partir de countryCode e number: ${fullPhone}`);
      return fullPhone;
    }

    // 3. Estrutura: purchaseDetails.subscriber.userDetails.personalIdentity.contactPhone
    const complexPhone3 = payload?.purchaseDetails?.subscriber?.userDetails?.personalIdentity?.contactPhone;
    if (complexPhone3 && typeof complexPhone3 === 'string' && complexPhone3.length > 2) {
      // Formatação básica: adicionar + se for só números e não tiver o prefixo internacional
      const formattedPhone = /^\d+$/.test(complexPhone3) ? `+${complexPhone3}` : complexPhone3;
      console.log(`Hotmart: Telefone do cliente encontrado em estrutura complexa (tipo 3): ${formattedPhone}`);
      return formattedPhone;
    }
    
    // Verificar locais conhecidos
    const phone = 
      payload.data?.buyer?.phone || 
      payload.data?.customer?.contact?.phone ||
      payload.data?.purchase?.customer?.contact?.phone ||
      payload.data?.contact?.phone ||
      payload.customer?.contact?.phone ||
      payload.customer?.phone ||
      payload.buyer?.phone;
    
    if (phone && typeof phone === 'string' && phone.length > 2) {
      console.log(`Hotmart: Telefone do cliente encontrado em local padrão: ${phone}`);
      return phone;
    }
    
    // Tentar busca recursiva se nenhum telefone foi encontrado
    return findPhoneRecursive(payload);
  } catch (error) {
    console.error('Erro ao buscar telefone:', error);
    return null;
  }
}

/**
 * Função recursiva auxiliar para encontrar o nome do cliente em qualquer lugar do payload
 * Verifica diversos locais onde o nome pode estar localizado
 */
function findCustomerName(payload: any, depth: number = 0): string | null {
  // Limite de profundidade para evitar loops infinitos
  if (depth > 15 || !payload || typeof payload !== 'object') {
    return null;
  }
  
  // Verificar estruturas complexas conhecidas
  // 1. Estrutura: data.transaction.details.purchaseInfo.clientProfile.personalInfo.identification.fullName
  const complexName1 = payload?.data?.transaction?.details?.purchaseInfo?.clientProfile?.personalInfo?.identification?.fullName;
  if (complexName1 && typeof complexName1 === 'string' && complexName1.length > 0) {
    console.log(`Hotmart: Nome do cliente encontrado em estrutura complexa (tipo 1): ${complexName1}`);
    return complexName1;
  }
  
  // 2. Estrutura alternativa para nome composto
  const firstName = payload?.data?.transaction?.details?.purchaseInfo?.clientProfile?.personalInfo?.identification?.firstName;
  const lastName = payload?.data?.transaction?.details?.purchaseInfo?.clientProfile?.personalInfo?.identification?.lastName;
  if (firstName && lastName && typeof firstName === 'string' && typeof lastName === 'string') {
    const fullName = `${firstName} ${lastName}`;
    console.log(`Hotmart: Nome do cliente composto a partir de firstName e lastName: ${fullName}`);
    return fullName;
  }
  
  // 3. Estrutura: data.order.details.buyer.user_identity.name.fullName
  const complexName3 = payload?.data?.order?.details?.buyer?.user_identity?.name?.fullName;
  if (complexName3 && typeof complexName3 === 'string' && complexName3.length > 0) {
    console.log(`Hotmart: Nome do cliente encontrado em estrutura complexa (tipo 3): ${complexName3}`);
    return complexName3;
  }
  
  // Procurar por propriedades específicas que podem conter o nome do cliente
  const nameKeys = [
    'name', 'customer_name', 'clientName', 'buyer_name', 'fullName', 
    'primeiro_nome', 'full_name', 'completeName', 'displayName',
    'userName', 'customerFullName', 'buyerName'
  ];
  
  // Verificar locais específicos que são conhecidos por conter nomes
  // Aqui estamos checando locais conhecidos primeiro
  const customerName = 
    payload.data?.customer?.name || 
    payload.data?.purchase?.customer?.name ||
    payload.data?.buyer?.name || 
    payload.purchase?.customer?.name ||
    payload.customer?.name ||
    payload.data?.subscriber?.name;
  
  if (customerName && typeof customerName === 'string' && customerName.length > 0) {
    console.log(`Hotmart: Nome do cliente encontrado em local específico: ${customerName}`);
    return customerName;
  }
  
  // Verificar propriedades diretamente
  for (const key of Object.keys(payload)) {
    // Verificar se a propriedade atual é um nome
    if (nameKeys.includes(key.toLowerCase()) && typeof payload[key] === 'string' && payload[key].length > 0) {
      console.log(`Hotmart: Nome do cliente encontrado na propriedade ${key}: ${payload[key]}`);
      return payload[key];
    }
    
    // Verificar objetos aninhados
    if (payload[key] && typeof payload[key] === 'object') {
      const nestedName = findCustomerName(payload[key], depth + 1);
      if (nestedName) {
        return nestedName;
      }
    }
  }
  
  return null;
}

/**
 * Função recursiva auxiliar para buscar o ID da oferta em qualquer lugar do objeto payload
 */
function findOfferIdInPayload(obj: any, depth: number = 0): string | null {
  // Limite de profundidade para evitar loops infinitos
  if (depth > 15 || !obj || typeof obj !== 'object') {
    return null;
  }
  
  // Verificar estruturas específicas conhecidas
  // 1. Estrutura: data.transaction.details.purchaseInfo.vendorInfo.productData.offerId
  const complexOfferId1 = obj?.data?.transaction?.details?.purchaseInfo?.vendorInfo?.productData?.offerId;
  if (complexOfferId1 && typeof complexOfferId1 === 'string' && HOTMART_OFFER_TO_PLAN_MAP[complexOfferId1]) {
    console.log(`Hotmart: ID da oferta encontrado em estrutura complexa (tipo 1):`, complexOfferId1);
    return complexOfferId1;
  }
  
  // 2. Estrutura: purchaseDetails.product.information.offerId
  const complexOfferId2 = obj?.purchaseDetails?.product?.information?.offerId;
  if (complexOfferId2 && typeof complexOfferId2 === 'string' && HOTMART_OFFER_TO_PLAN_MAP[complexOfferId2]) {
    console.log(`Hotmart: ID da oferta encontrado em estrutura complexa (tipo 2):`, complexOfferId2);
    return complexOfferId2;
  }
  
  // Procurar por propriedades específicas que podem conter um ID de oferta
  const offerIdKeys = ['off', 'offer_id', 'offerId', 'offer_code', 'offerCode', 'productCode', 'planId'];
  
  // Verificar diretamente nas propriedades
  for (const key of Object.keys(obj)) {
    // Verificar se a propriedade é um ID de oferta
    if (offerIdKeys.includes(key.toLowerCase()) && typeof obj[key] === 'string') {
      const potentialOfferId = obj[key];
      // Verificar se existe no mapeamento
      if (HOTMART_OFFER_TO_PLAN_MAP[potentialOfferId]) {
        console.log(`Hotmart: ID da oferta encontrado na propriedade ${key}:`, potentialOfferId);
        return potentialOfferId;
      }
    }
    
    // Verificar se existe algum padrão de URL com off=XXXX
    if (typeof obj[key] === 'string' && obj[key].includes('off=')) {
      const offMatch = obj[key].match(/off=([a-zA-Z0-9]+)/);
      if (offMatch && offMatch[1] && HOTMART_OFFER_TO_PLAN_MAP[offMatch[1]]) {
        console.log(`Hotmart: ID da oferta encontrado em URL:`, offMatch[1]);
        return offMatch[1];
      }
    }
    
    // Verificar objetos aninhados
    if (obj[key] && typeof obj[key] === 'object') {
      const nestedOfferId = findOfferIdInPayload(obj[key], depth + 1);
      if (nestedOfferId) {
        return nestedOfferId;
      }
    }
  }
  
  // Verificar se existe uma oferta diretamente em offerName/productName - checando pelo nome do plano
  for (const key of Object.keys(obj)) {
    if (['offerName', 'productName', 'planName', 'subscription_name'].includes(key.toLowerCase()) && typeof obj[key] === 'string') {
      const planName = obj[key].toLowerCase();
      console.log(`Hotmart: Verificando nome de plano "${planName}" para inferir oferta`);
      
      // Verificar se o nome contém palavras-chave que indicam o plano
      if (planName.includes('basic') || planName.includes('básico')) {
        return 'ro76q5uz'; // ID da oferta do plano básico
      } 
      else if (planName.includes('standard') || planName.includes('padrão')) {
        return 'tpfhcllk'; // ID da oferta do plano standard
      }
      else if (planName.includes('professional') || planName.includes('profissional') || planName.includes('pro')) {
        return 'xtuh4ji0'; // ID da oferta do plano professional
      }
    }
  }
  
  return null;
}

/**
 * Sistema robusto de análise de status de assinatura
 * Implementa verificações completas para determinar se uma assinatura está ativa, inativa ou expirada
 */
export interface SubscriptionAnalysis {
  isActive: boolean;
  isExpired: boolean;
  isPendingCancellation: boolean;
  daysUntilExpiry: number | null;
  statusReason: string;
  recommendations: string[];
}

/**
 * Verifica se um downgrade é seguro e justificado
 * Adiciona camada de proteção contra downgrades incorretos
 */
function isSafeToDowngrade(user: User, event: string): { safe: boolean; reason: string } {
  // Verificação 1: Usuário já no plano gratuito
  if (!user.planType || user.planType === 'free') {
    return { safe: false, reason: 'Usuário já possui plano gratuito' };
  }
  
  // Verificação 2: Ativação manual recente (menos de 30 dias)
  if (user.isManualActivation && user.manualActivationDate) {
    const daysSinceManualActivation = Math.floor(
      (new Date().getTime() - new Date(user.manualActivationDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceManualActivation < 30) {
      return { 
        safe: false, 
        reason: `Ativação manual recente (${daysSinceManualActivation} dias) - não fazer downgrade automático` 
      };
    }
  }
  
  // Verificação 3: Pagamento muito recente (menos de 24 horas)
  if (user.lastEvent && user.lastEvent.type === 'purchase.approved') {
    const hoursSinceLastPayment = Math.floor(
      (new Date().getTime() - new Date(user.lastEvent.timestamp).getTime()) / (1000 * 60 * 60)
    );
    
    if (hoursSinceLastPayment < 24) {
      return { 
        safe: false, 
        reason: `Pagamento muito recente (${hoursSinceLastPayment} horas) - possível conflito de webhooks` 
      };
    }
  }
  
  // Verificação 4: Para eventos críticos, sempre é seguro
  if (event === 'purchase.refunded' || event === 'purchase.chargeback') {
    return { safe: true, reason: 'Evento crítico confirmado - downgrade justificado' };
  }
  
  // Verificação 5: Para cancelamentos, verificar se há pending downgrade
  if (event === 'purchase.canceled' || event === 'subscription.canceled') {
    return { safe: true, reason: 'Cancelamento confirmado - agendar downgrade com tolerância' };
  }
  
  return { safe: true, reason: 'Verificações de segurança aprovadas' };
}

/**
 * Analisa detalhadamente o status da assinatura de um usuário
 */
export function analyzeSubscriptionStatus(user: User): SubscriptionAnalysis {
  const now = new Date();
  const result: SubscriptionAnalysis = {
    isActive: false,
    isExpired: false,
    isPendingCancellation: false,
    daysUntilExpiry: null,
    statusReason: '',
    recommendations: []
  };
  
  // DEBUG: Log para debugar problemas
  console.log(`[DEBUG] Analisando usuário ${user.email}: planType=${user.planType}, subscriptionStatus=${user.subscriptionStatus}, subscriptionEndDate=${user.subscriptionEndDate}`);

  // 1. Verificar se o usuário possui um plano pago
  if (!user.planType || user.planType === 'free') {
    result.statusReason = 'Usuário possui plano gratuito';
    result.recommendations.push('Considerar upgrade para plano pago');
    return result;
  }

  // 2. Verificar status da assinatura
  if (user.subscriptionStatus !== 'active') {
    if (user.subscriptionStatus === 'pending_cancellation') {
      result.isPendingCancellation = true;
      result.statusReason = 'Assinatura em processo de cancelamento (período de tolerância de 3 dias)';
      result.recommendations.push('Regularizar pagamento para manter acesso');
      return result; // Não definir como ativa, mas permitir pending_cancellation
    } else if (user.subscriptionStatus === 'payment_failed') {
      result.isExpired = true;
      result.statusReason = 'Assinatura desativada por falha crítica de pagamento (reembolso ou chargeback)';
      result.recommendations.push('Entrar em contato com o suporte para reativar assinatura');
      result.recommendations.push('Verificar método de pagamento e efetuar nova compra se necessário');
      return result;
    } else {
      result.statusReason = `Status da assinatura: ${user.subscriptionStatus || 'indefinido'}`;
      result.recommendations.push('Verificar status da assinatura na Hotmart');
      return result;
    }
  }

  // 3. Verificar data de expiração (se definida)
  if (user.subscriptionEndDate) {
    const endDate = new Date(user.subscriptionEndDate);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    result.daysUntilExpiry = diffDays;
    
    if (diffDays <= 0) {
      result.isExpired = true;
      result.statusReason = `Assinatura expirou em ${endDate.toLocaleDateString()}`;
      result.recommendations.push('Renovar assinatura imediatamente');
      result.recommendations.push('Contatar suporte se houve renovação automática');
      return result;
    } else if (diffDays <= 7) {
      result.isActive = true; // CORREÇÃO: Definir como ativa mesmo próxima do vencimento
      result.statusReason = `Assinatura expira em ${diffDays} dias`;
      result.recommendations.push('Verificar renovação automática');
      result.recommendations.push('Preparar backup dos projetos');
    } else if (diffDays <= 30) {
      result.isActive = true; // CORREÇÃO: Assinatura ativa
      result.statusReason = `Assinatura expira em ${diffDays} dias`;
      result.recommendations.push('Considerar renovação antecipada');
    } else {
      result.isActive = true; // CORREÇÃO: Assinatura ativa
      result.statusReason = `Assinatura ativa, expira em ${diffDays} dias`;
    }
  } else {
    // Se não há data de expiração definida, mas status é active, considerar ativa
    result.isActive = true;
    result.statusReason = 'Assinatura ativa (sem data de expiração definida)';
  }

  // 4. Verificar downgrade pendente
  if (user.pendingDowngradeDate) {
    const downgradeDate = new Date(user.pendingDowngradeDate);
    const diffTime = downgradeDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      result.statusReason = 'Downgrade pendente vencido - será processado automaticamente';
      result.recommendations.push('Regularizar pagamento urgentemente');
      result.recommendations.push('Entrar em contato com suporte');
    } else {
      result.isPendingCancellation = true;
      result.statusReason = `Downgrade agendado para ${diffDays} dias (motivo: ${user.pendingDowngradeReason || 'não especificado'})`;
      result.recommendations.push(`Você tem ${diffDays} dias para regularizar o pagamento`);
      result.recommendations.push('Verificar problema de pagamento na Hotmart');
    }
  }

  // 5. Se chegou até aqui, a assinatura está ativa
  if (!result.isExpired && !result.statusReason) {
    result.isActive = true;
    result.statusReason = 'Assinatura ativa e funcionando normalmente';
  }

  return result;
}

/**
 * Verifica se um usuário pode fazer uploads com base na análise completa da assinatura
 */
export function canUserUpload(user: User): { allowed: boolean; reason: string; analysis: SubscriptionAnalysis } {
  const analysis = analyzeSubscriptionStatus(user);
  
  // Se a assinatura estiver ativa (mesmo com expiração próxima), permitir
  if (analysis.isActive || analysis.isPendingCancellation) {
    return { 
      allowed: true, 
      reason: 'Acesso autorizado', 
      analysis 
    };
  }
  
  // Se expirou ou está inativa, bloquear
  return { 
    allowed: false, 
    reason: analysis.statusReason, 
    analysis 
  };
}

/**
 * Verifica limite de uploads com análise avançada
 */
export async function checkAdvancedUploadLimit(userId: number, uploadCount: number): Promise<{
  allowed: boolean;
  reason: string;
  analysis: SubscriptionAnalysis;
  uploadInfo: {
    current: number;
    limit: number;
    available: number;
    planType: string;
  };
}> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const analysis = analyzeSubscriptionStatus(user);
  const uploadAccess = canUserUpload(user);
  
  const uploadInfo = {
    current: user.usedUploads || 0,
    limit: user.uploadLimit || 0,
    available: Math.max(0, (user.uploadLimit || 0) - (user.usedUploads || 0)),
    planType: user.planType || 'free'
  };

  // Primeiro verificar se o usuário tem acesso geral
  if (!uploadAccess.allowed) {
    return {
      allowed: false,
      reason: `Acesso negado: ${uploadAccess.reason}`,
      analysis,
      uploadInfo
    };
  }

  // Verificar limite de uploads
  if (uploadInfo.available < uploadCount) {
    return {
      allowed: false,
      reason: `Limite de ${uploadInfo.limit} uploads atingido (${uploadInfo.current} utilizados)`,
      analysis,
      uploadInfo
    };
  }

  return {
    allowed: true,
    reason: 'Upload autorizado',
    analysis,
    uploadInfo
  };
}

// Mapeamento de eventos da Hotmart para nomes normalizados
const EVENT_MAP: Record<string, string> = {
  // Compra aprovada - variações
  'PURCHASE_APPROVED': 'purchase.approved',
  'PURCHASE.APPROVED': 'purchase.approved',
  'purchase.approved': 'purchase.approved',
  'APPROVED': 'purchase.approved',
  'PURCHASE_COMPLETE': 'purchase.approved',
  'PURCHASE.COMPLETE': 'purchase.approved',
  'purchase.complete': 'purchase.approved',
  'PURCHASE_CONFIRMED': 'purchase.approved',
  'PURCHASE.CONFIRMED': 'purchase.approved',
  'purchase.confirmed': 'purchase.approved',
  'SALE': 'purchase.approved',
  'SALE_COMPLETE': 'purchase.approved',
  'ORDER_COMPLETED': 'purchase.approved',
  
  // Reembolso - variações
  'PURCHASE_REFUNDED': 'purchase.refunded',
  'PURCHASE.REFUNDED': 'purchase.refunded',
  'purchase.refunded': 'purchase.refunded',
  'REFUNDED': 'purchase.refunded',
  'REFUND': 'purchase.refunded',
  'REFUND_COMPLETE': 'purchase.refunded',
  'REFUND.COMPLETE': 'purchase.refunded',
  'PURCHASE_REFUND': 'purchase.refunded',
  'PURCHASE.REFUND': 'purchase.refunded',
  'REEMBOLSO': 'purchase.refunded',
  'REEMBOLSO_COMPLETO': 'purchase.refunded',
  
  // Cancelamento - variações 
  'PURCHASE_CANCELED': 'purchase.canceled',
  'PURCHASE.CANCELED': 'purchase.canceled',
  'purchase.canceled': 'purchase.canceled',
  'CANCELED': 'purchase.canceled',
  'CANCEL': 'purchase.canceled',
  'CANCELAMENTO': 'purchase.canceled',
  'ORDER_CANCELED': 'purchase.canceled',
  'PURCHASE_CANCELLED': 'purchase.canceled', // Variação com escrita britânica
  'PURCHASE.CANCELLED': 'purchase.canceled',
  'purchase.cancelled': 'purchase.canceled',
  'CANCELLED': 'purchase.canceled',
  
  // Atraso no pagamento
  'PURCHASE_DELAYED': 'purchase.delayed',
  'PURCHASE.DELAYED': 'purchase.delayed',
  'purchase.delayed': 'purchase.delayed',
  'DELAYED': 'purchase.delayed',
  'PAYMENT_DELAYED': 'purchase.delayed',
  'PAYMENT.DELAYED': 'purchase.delayed',
  'payment.delayed': 'purchase.delayed',
  'ATRASO': 'purchase.delayed',
  'PAGAMENTO_ATRASADO': 'purchase.delayed',
  
  // Disputa/Chargeback
  'PURCHASE_PROTEST': 'purchase.chargeback',
  'PURCHASE.PROTEST': 'purchase.chargeback',
  'purchase.protest': 'purchase.chargeback',
  'PROTEST': 'purchase.chargeback',
  'CHARGEBACK_INITIATED': 'purchase.chargeback',
  'CHARGEBACK.INITIATED': 'purchase.chargeback',
  'PURCHASE_CHARGEBACK': 'purchase.chargeback',
  'PURCHASE.CHARGEBACK': 'purchase.chargeback',
  'purchase.chargeback': 'purchase.chargeback',
  'CHARGEBACK': 'purchase.chargeback',
  'DISPUTA': 'purchase.chargeback',
  'DISPUTA_INICIADA': 'purchase.chargeback',
  'CONTESTACAO': 'purchase.chargeback',
  
  // Cancelamento de assinatura
  'SUBSCRIPTION_CANCELLATION': 'subscription.canceled',
  'SUBSCRIPTION.CANCELLATION': 'subscription.canceled',
  'subscription.cancellation': 'subscription.canceled',
  'SUBSCRIPTION_CANCELED': 'subscription.canceled',
  'SUBSCRIPTION.CANCELED': 'subscription.canceled',
  'subscription.canceled': 'subscription.canceled',
  'SUBSCRIPTION_CANCELLED': 'subscription.canceled', // Variação com escrita britânica
  'SUBSCRIPTION.CANCELLED': 'subscription.canceled',
  'subscription.cancelled': 'subscription.canceled',
  'CANCEL_SUBSCRIPTION': 'subscription.canceled',
  'CANCEL.SUBSCRIPTION': 'subscription.canceled',
  'cancel.subscription': 'subscription.canceled',
  'ASSINATURA_CANCELADA': 'subscription.canceled',
  'CANCELAMENTO_ASSINATURA': 'subscription.canceled'
};

/**
 * Sistema de controle de idempotência para webhooks
 * Evita o processamento duplo do mesmo evento
 */
interface WebhookProcessingRecord {
  transactionId: string;
  eventType: string;
  email: string;
  processedAt: Date;
  result: string;
}

// Cache simples em memória para controle de idempotência (em produção, usar Redis ou banco)
const processedWebhooks = new Map<string, WebhookProcessingRecord>();

/**
 * Gera uma chave única para identificar o webhook
 */
function generateWebhookKey(payload: HotmartWebhookPayload, event: string, email: string): string {
  // Tentar extrair ID da transação para idempotência
  const transactionId = 
    payload.data?.purchase?.transaction ||
    payload.data?.subscription?.subscriber ||
    payload.data?.product?.id ||
    `${email}_${event}_${Date.now()}`;
    
  return `${event}_${email}_${transactionId}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Verifica se o webhook já foi processado (idempotência)
 */
function isWebhookAlreadyProcessed(key: string, payload: HotmartWebhookPayload): boolean {
  const existing = processedWebhooks.get(key);
  
  if (!existing) {
    return false;
  }
  
  // Verificar se foi processado recentemente (24 horas)
  const hoursSinceProcessed = (Date.now() - existing.processedAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceProcessed > 24) {
    // Remover registro antigo
    processedWebhooks.delete(key);
    return false;
  }
  
  console.log(`[IDEMPOTENCY] Webhook já processado: ${key} em ${existing.processedAt.toISOString()}`);
  return true;
}

/**
 * Marca o webhook como processado
 */
function markWebhookAsProcessed(key: string, payload: HotmartWebhookPayload, event: string, email: string, result: string): void {
  const transactionId = 
    payload.data?.purchase?.transaction ||
    payload.data?.subscription?.subscriber ||
    'unknown';
    
  processedWebhooks.set(key, {
    transactionId,
    eventType: event,
    email,
    processedAt: new Date(),
    result
  });
  
  // Limpeza automática: manter apenas os últimos 1000 registros
  if (processedWebhooks.size > 1000) {
    const oldestKeys = Array.from(processedWebhooks.keys()).slice(0, 100);
    oldestKeys.forEach(key => processedWebhooks.delete(key));
  }
}

/**
 * Processa webhooks da Hotmart com melhorias de segurança e robustez
 * 
 * Esta função implementa:
 * 1. Normalização de eventos com suporte a múltiplos formatos (PURCHASE_APPROVED, SUBSCRIPTION_CANCELLATION, etc.)
 * 2. Extração robusta de dados do cliente em diferentes estruturas de payload
 * 3. Detecção e rejeição de planos de teste
 * 4. Processamento de eventos de cancelamento mesmo sem ID de oferta válido
 * 5. Criação de usuários automaticamente para novos clientes
 * 6. Controle de idempotência para evitar processamento duplo
 * 7. Análise avançada de status de assinatura
 * 
 * @param payload O payload recebido do webhook da Hotmart
 * @returns Objeto com status de sucesso e mensagem
 */
export async function processHotmartWebhook(payload: HotmartWebhookPayload): Promise<{ success: boolean, message: string, analysis?: SubscriptionAnalysis }> {
  try {
    // Verificar se o payload é válido
    if (!payload) {
      console.error('Hotmart webhook: payload inválido ou vazio');
      return { success: false, message: 'Payload inválido ou vazio' };
    }
    
    // Extrair e normalizar o evento (case-insensitive)
    let rawEvent = payload.event || 'unknown_event';
    const normalizedEvent = EVENT_MAP[rawEvent] || EVENT_MAP[rawEvent.toUpperCase()] || EVENT_MAP[rawEvent.toLowerCase()];
    
    // Usar o evento normalizado se encontrado, caso contrário manter o original
    const event = normalizedEvent || String(rawEvent);
    console.log(`Hotmart: Evento recebido: ${rawEvent} (normalizado: ${event})`);
    
    // Verificar se é um evento suportado
    const supportedEvents = [
      'purchase.approved', 
      'purchase.refunded',
      'purchase.chargeback',
      'purchase.canceled',
      'subscription.canceled'
    ];
    
    if (!supportedEvents.includes(event)) {
      console.log(`Hotmart: Evento não suportado: ${event}`);
      return { success: false, message: `Evento não suportado: ${event}` };
    }
    
    // Garantir que data existe (para evitar erros)
    const data = payload.data || {};
    
    // Primeiro, tentar extração direta nos locais conhecidos
    let email = 
      payload.email || 
      payload.buyer?.email || 
      data?.email || 
      data?.buyer?.email || 
      data?.buyer_email || 
      data?.contact?.email || 
      payload?.purchase?.buyer?.email;
    
    // Se não encontrou, tentar busca recursiva (isso irá encontrar em qualquer lugar do payload)
    if (!email) {
      console.log('Hotmart: Email não encontrado nas propriedades conhecidas, iniciando busca recursiva...');
      const foundEmail = findEmailInPayload(payload);
      // Converter de string | null para string | undefined para compatibilidade
      if (foundEmail) {
        email = String(foundEmail);
      }
    }
    
    // Verificar se temos um email válido
    if (!email) {
      console.error('Hotmart webhook: email não encontrado no payload', JSON.stringify(payload));
      return { success: false, message: 'Email ausente no payload' };
    }
    
    console.log(`Hotmart: Processando evento ${event} para email: ${email}`);
    
    // CONTROLE DE IDEMPOTÊNCIA: Verificar se o webhook já foi processado
    const webhookKey = generateWebhookKey(payload, event, email);
    
    if (isWebhookAlreadyProcessed(webhookKey, payload)) {
      console.log(`[IDEMPOTENCY] Webhook duplicado ignorado: ${webhookKey}`);
      return { 
        success: true, 
        message: 'Webhook já processado anteriormente (idempotência)' 
      };
    }
    
    // Verificar se já existe um usuário com este email
    let user = await storage.getUserByEmail(email);
    
    // Determinar o tipo de plano com base na oferta
    const planType = determinePlanType(payload);
    
    // Verificar se é um evento de cancelamento (eventos de cancelamento não precisam de planType)
    const isCancellationEvent = [
      'purchase.refunded',
      'purchase.chargeback', 
      'purchase.canceled',
      'subscription.canceled'
    ].includes(event);
    
    // Se não encontrou um plano válido (oferta não encontrada ou plano de teste)
    // E não é um evento de cancelamento (que não precisa de planType)
    if (!planType && !isCancellationEvent) {
      console.log(`Hotmart: Nenhum plano válido encontrado para o email ${email}, webhook ignorado`);
      return { success: false, message: 'Nenhuma oferta válida encontrada' };
    }
    
    // Processar de acordo com o tipo de evento
    switch (event) {
      case 'purchase.approved':
        if (user) {
          // Usuário existente - ativar o plano
          console.log(`Hotmart: Ativando plano ${planType} para usuário existente: ${email}`);
          
          // IMPORTANTE: Cancelar qualquer downgrade pendente (pagamento regularizado)
          if (user.pendingDowngradeDate) {
            console.log(`[DOWNGRADE] Cancelando downgrade pendente para usuário ${email} - pagamento regularizado`);
            await storage.cancelPendingDowngrade(user.id);
          }
          
          // Verificar se planType é válido (não é null)
          if (planType) {
            await storage.updateUserSubscription(user.id, planType);
          } else {
            console.error(`Hotmart: Tipo de plano inválido para usuário existente: ${email}`);
          }
          
          // Atualizar status e informações da Hotmart
          await storage.updateUser(user.id, {
            status: 'active',
            subscriptionStatus: 'active',
            // Salvar ID da transação no campo subscription_id para referência
            subscription_id: data?.purchase?.transaction || `hotmart_${Date.now()}`
          });
        } else {
          // Criar um novo usuário com o plano ativado
          console.log(`Hotmart: Criando novo usuário com plano ${planType}: ${email}`);
          
          // Gerar uma senha temporária para o novo usuário
          const tempPassword = generateRandomPassword(8); // Senha de 8 caracteres
          const hashedPassword = await hashPassword(tempPassword);
          
          // Extrair informações do cliente de diferentes locais do payload
          const customerName = findCustomerName(payload);
          const customerPhone = findCustomerPhone(payload);
          
          // Verificar se planType é válido e definir um tipo válido para o caso de ser null
          const validPlanType = planType || 'free';
          
          // Dados para o novo usuário, com validação segura para evitar erros
          const userData: InsertUser = {
            name: (customerName || data?.buyer?.name || email.split('@')[0]) || 'Usuário Fottufy',
            email,
            password: hashedPassword,
            role: 'photographer',
            status: 'active',
            phone: customerPhone || data?.buyer?.phone || '',
            planType: validPlanType, // Usar o planType validado
            subscriptionStatus: 'active'
          };
          
          // Criar o usuário
          user = await storage.createUser(userData);
          
          // Atualizar limite de uploads com base no plano
          if (planType) {
            await storage.updateUserSubscription(user.id, planType);
          } else {
            console.error(`Hotmart: Tipo de plano inválido para novo usuário: ${email}`);
          }
          
          // Salvar ID da transação para referência
          await storage.updateUser(user.id, {
            subscription_id: data?.purchase?.transaction || `hotmart_${Date.now()}`
          });
          
          // Enviar email com dados de acesso
          try {
            // Enviar email de boas-vindas com a senha temporária
            const result = await sendWelcomeEmail(userData.email, userData.name, tempPassword);
            if (result.success) {
              console.log(`Hotmart: Email com dados de acesso enviado para: ${email}`);
            } else {
              console.error(`Hotmart: Falha ao enviar email com dados de acesso: ${email}`);
            }
          } catch (emailError) {
            console.error('Erro ao enviar email com dados de acesso:', emailError);
          }
        }
        
        // Marcar webhook como processado com sucesso
        markWebhookAsProcessed(webhookKey, payload, event, email, 'PLANO_ATIVADO');
        
        // Analisar status da assinatura do usuário final
        const userFinal = await storage.getUser(user.id);
        const analysis = userFinal ? analyzeSubscriptionStatus(userFinal) : undefined;
        
        return { 
          success: true, 
          message: 'Plano ativado com sucesso',
          analysis 
        };
        
      case 'purchase.refunded':
      case 'purchase.chargeback':
      case 'purchase.canceled':
      case 'subscription.canceled':
        if (user) {
          // VERIFICAÇÃO DE SEGURANÇA: Verificar se o downgrade é seguro e justificado
          const safetyCheck = isSafeToDowngrade(user, event);
          
          if (!safetyCheck.safe) {
            console.log(`[SEGURANÇA] Downgrade cancelado para ${email}: ${safetyCheck.reason}`);
            markWebhookAsProcessed(webhookKey, payload, event, email, 'DOWNGRADE_CANCELADO_SEGURANCA');
            
            return { 
              success: true, 
              message: `Downgrade cancelado por segurança: ${safetyCheck.reason}` 
            };
          }
          
          console.log(`[SEGURANÇA] Downgrade aprovado para ${email}: ${safetyCheck.reason}`);
          
          // Verificar se é um evento que requer downgrade imediato (falha crítica de pagamento)
          const criticalPaymentFailure = event === 'purchase.refunded' || event === 'purchase.chargeback';
          
          if (criticalPaymentFailure) {
            // DOWNGRADE IMEDIATO: Reembolso e chargeback são falhas críticas
            console.log(`[DOWNGRADE CRÍTICO] Processando downgrade imediato para usuário: ${email} (evento crítico: ${event})`);
            
            const currentPlan = user.planType || 'free';
            
            // Fazer downgrade imediato para plano gratuito
            await storage.updateUserSubscription(user.id, 'free');
              
              // Atualizar status e informações
              await storage.updateUser(user.id, {
                subscriptionStatus: 'payment_failed', // Status específico para falha de pagamento
                originalPlanBeforeDowngrade: currentPlan, // Salvar plano original para possível restauração
                lastEvent: {
                  type: `immediate_downgrade_${event}`,
                  timestamp: new Date().toISOString(),
                },
              });
              
              console.log(`[DOWNGRADE CRÍTICO] Usuário ${email} convertido para plano gratuito imediatamente. Plano anterior: ${currentPlan}`);
              
              // Marcar webhook como processado
              markWebhookAsProcessed(webhookKey, payload, event, email, 'DOWNGRADE_IMEDIATO');
              
              const userUpdated = await storage.getUser(user.id);
              const analysis = userUpdated ? analyzeSubscriptionStatus(userUpdated) : undefined;
              
              return { 
                success: true, 
                message: `Downgrade imediato realizado - falha crítica de pagamento detectada (${event})`,
                analysis 
              };
          } else {
            // TOLERÂNCIA DE 3 DIAS: Cancelamentos simples mantêm período de tolerância
            console.log(`[DOWNGRADE] Agendando downgrade com tolerância de 3 dias para usuário: ${email} (evento: ${event})`);
            
            const currentPlan = user.planType || 'free';
            
            // Verificação de segurança: só agendar downgrade se não for plano "free"
            if (currentPlan !== 'free') {
              // Agendar downgrade com 3 dias de tolerância
              await storage.schedulePendingDowngrade(user.id, event, currentPlan);
              
              // Atualizar apenas o status da assinatura para indicar problema
              await storage.updateUser(user.id, {
                subscriptionStatus: 'pending_cancellation', // Status especial para período de tolerância
                lastEvent: {
                  type: event,
                  timestamp: new Date().toISOString(),
                },
              });
              
              console.log(`[DOWNGRADE] Usuário ${email} tem 3 dias para regularizar o pagamento antes do downgrade automático`);
              
              // Marcar webhook como processado com sucesso
              markWebhookAsProcessed(webhookKey, payload, event, email, 'DOWNGRADE_AGENDADO');
              
              const userUpdated = await storage.getUser(user.id);
              const analysis = userUpdated ? analyzeSubscriptionStatus(userUpdated) : undefined;
              
              return { 
                success: true, 
                message: 'Downgrade agendado para 3 dias - período de tolerância ativado',
                analysis 
              };
            } else {
              console.log(`[DOWNGRADE] Usuário ${email} já possui plano gratuito, nenhuma ação necessária`);
              markWebhookAsProcessed(webhookKey, payload, event, email, 'JA_PLANO_GRATUITO');
              
              return { 
                success: true, 
                message: 'Usuário já possui plano gratuito'
              };
            }
          }
        } else {
          console.log(`Hotmart: Usuário não encontrado para o email ${email}, nada a fazer`);
          
          // Marcar webhook como processado (falha por usuário não encontrado)
          markWebhookAsProcessed(webhookKey, payload, event, email, 'USUARIO_NAO_ENCONTRADO');
          
          return { success: false, message: 'Usuário não encontrado' };
        }
        
      default:
        console.log(`Hotmart: Evento não processado: ${event}`);
        
        // Marcar webhook como processado (evento não suportado)
        markWebhookAsProcessed(webhookKey, payload, event, email, 'EVENTO_NAO_SUPORTADO');
        
        return { success: false, message: `Evento não suportado: ${event}` };
    }
  } catch (error: any) {
    console.error('Erro ao processar webhook da Hotmart:', error);
    const errorMessage = error.message || 'Erro desconhecido';
    
    // Em caso de erro, ainda marcar como processado para evitar loops infinitos
    // Só se tivermos informações suficientes
    try {
      if (payload && payload.event) {
        let email = '';
        // Tentar extrair email básico para marcação de erro
        if (payload.email) email = payload.email;
        else if (payload.data?.email) email = payload.data.email;
        else if (payload.buyer?.email) email = payload.buyer.email;
        
        if (email) {
          const event = payload.event;
          const webhookKey = generateWebhookKey(payload, event, email);
          markWebhookAsProcessed(webhookKey, payload, event, email, `ERRO: ${errorMessage}`);
        }
      }
    } catch (markingError) {
      console.error('Erro ao marcar webhook como processado após falha:', markingError);
    }
    
    return { success: false, message: `Erro interno: ${errorMessage}` };
  }
}