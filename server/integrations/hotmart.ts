import crypto from 'crypto';
import { SUBSCRIPTION_PLANS } from '@shared/schema';
import { InsertUser } from '@shared/schema';
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
  // Mapeamento corrigido conforme solicitação
  "ro76q5uz": "basic_v2",        // R$14,90 - 6.000 fotos
  "z0pxaesy": "basic_v2",        // R$14,90 - 6.000 fotos  
  "ze3jhsob": "basic_v2",        // R$14,90 - 6.000 fotos
  "tpfhcllk": "standard_v2",     // R$29,90 - 15.000 fotos (CORRIGIDO)
  "hjb8gqn7": "standard_v2",     // R$29,90 - 15.000 fotos
  "xtuh4ji0": "professional_v2"  // R$49,90 - 35.000 fotos (CORRIGIDO)
};

// Função para gerar uma senha aleatória para novos usuários
export function generateRandomPassword(length = 12): string {
  const buffer = randomBytes(length);
  return buffer.toString('hex').slice(0, length);
}

// Função para validar a assinatura da Hotmart (deve ser implementada com a chave correta)
export function validateHotmartSignature(payload: string, signature: string, secret: string): boolean {
  // Se não houver um secret configurado, pular a validação (inseguro!)
  if (!secret) {
    console.warn("HOTMART_WEBHOOK_SECRET não configurado. Pulando validação da assinatura!");
    return true;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const calculatedSignature = hmac.update(payload).digest('hex');
  
  return calculatedSignature === signature;
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
 * Processa webhooks da Hotmart
 * 
 * Esta função implementa:
 * 1. Normalização de eventos com suporte a múltiplos formatos (PURCHASE_APPROVED, SUBSCRIPTION_CANCELLATION, etc.)
 * 2. Extração robusta de dados do cliente em diferentes estruturas de payload
 * 3. Detecção e rejeição de planos de teste
 * 4. Processamento de eventos de cancelamento mesmo sem ID de oferta válido
 * 5. Criação de usuários automaticamente para novos clientes
 * 
 * @param payload O payload recebido do webhook da Hotmart
 * @returns Objeto com status de sucesso e mensagem
 */
export async function processHotmartWebhook(payload: HotmartWebhookPayload): Promise<{ success: boolean, message: string }> {
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
        return { success: true, message: 'Plano ativado com sucesso' };
        
      case 'purchase.refunded':
      case 'purchase.chargeback':
      case 'purchase.canceled':
      case 'subscription.canceled':
        if (user) {
          console.log(`[DOWNGRADE] Agendando downgrade com tolerância de 3 dias para usuário: ${email} (evento: ${event})`);
          
          // Armazenar o plano atual antes do downgrade
          const currentPlan = user.planType || 'free';
          
          // Agendar downgrade com 3 dias de tolerância (em vez de fazer downgrade imediato)
          await storage.schedulePendingDowngrade(user.id, event, currentPlan);
          
          // Atualizar apenas o status da assinatura para indicar problema
          await storage.updateUser(user.id, {
            subscriptionStatus: 'pending_cancellation', // Status especial para indicar que está em período de tolerância
            lastEvent: {
              type: event,
              timestamp: new Date().toISOString(),
            },
          });
          
          console.log(`[DOWNGRADE] Usuário ${email} tem 3 dias para regularizar o pagamento antes do downgrade automático`);
          return { success: true, message: 'Downgrade agendado para 3 dias - período de tolerância ativado' };
        } else {
          console.log(`Hotmart: Usuário não encontrado para o email ${email}, nada a fazer`);
          return { success: false, message: 'Usuário não encontrado' };
        }
        
      default:
        console.log(`Hotmart: Evento não processado: ${event}`);
        return { success: false, message: `Evento não suportado: ${event}` };
    }
  } catch (error: any) {
    console.error('Erro ao processar webhook da Hotmart:', error);
    const errorMessage = error.message || 'Erro desconhecido';
    return { success: false, message: `Erro interno: ${errorMessage}` };
  }
}