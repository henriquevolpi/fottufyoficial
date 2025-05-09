import crypto from 'crypto';
import { SUBSCRIPTION_PLANS } from '@shared/schema';
import { InsertUser } from '@shared/schema';
import { storage } from '../storage';
import { randomBytes } from 'crypto';
import { sendEmail } from '../utils/sendEmail';
import { hashPassword } from '../auth';

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
  // Mapeamento conforme especificado
  "ro76q5uz": "basic_v2",
  "z0pxaesy": "basic_fottufy",
  "tpfhcllk": "standard",
  "xtuh4ji0": "professional"
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

// Função para determinar o tipo de plano com base na oferta da Hotmart
export function determinePlanType(payload: HotmartWebhookPayload): string {
  try {
    if (!payload) {
      console.log('Hotmart: Payload inválido, usando plano padrão');
      return 'basic_v2';
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
    
    // Fallback: tentar usar o nome do plano se disponível
    const planName = payload.data?.purchase?.plan?.name || payload.data?.subscription?.plan;
    
    if (planName) {
      console.log(`Hotmart: Determinando plano pelo nome: ${JSON.stringify(planName)}`);
      
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
        
        // Lógica de fallback para determinar o plano pelo nome
        if (lowerName.includes('basic')) return 'basic_v2';
        if (lowerName.includes('standard')) return 'standard';
        if (lowerName.includes('pro')) return 'professional';
      } else {
        console.log(`Hotmart: Nome do plano inválido após normalização: ${rawName}`);
      }
    }
    
    // Se nada funcionar, usar o plano básico como padrão
    console.log(`Hotmart: Nenhum plano identificado, usando plano padrão: basic_v2`);
    return 'basic_v2';
  } catch (error) {
    console.error('Erro ao determinar tipo de plano:', error);
    // Em caso de erro, sempre retornar um valor padrão seguro
    return 'basic_v2';
  }
}

// Função para enviar email de boas-vindas com senha
async function sendWelcomeEmailWithPassword(name: string, email: string, password: string): Promise<boolean> {
  try {
    const currentYear = new Date().getFullYear();
    const displayName = name.split(' ')[0]; // Pega apenas o primeiro nome
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://fottufy.com/logo.png" alt="Fottufy Logo" style="height: 60px;">
        </div>
        
        <h1 style="color: #4F46E5; text-align: center;">Bem-vindo à Fottufy!</h1>
        
        <p>Olá, ${displayName}!</p>
        
        <p>Sua conta na Fottufy foi criada com sucesso a partir da sua compra na Hotmart!</p>
        
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Suas credenciais de acesso:</strong></p>
          <p><strong>E-mail:</strong> ${email}</p>
          <p><strong>Senha temporária:</strong> ${password}</p>
        </div>
        
        <p>Por favor, faça login e altere sua senha o mais rápido possível para garantir a segurança da sua conta.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://fottufy.com/auth" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Acessar minha conta</a>
        </div>
        
        <p>Se tiver qualquer dúvida, sinta-se à vontade para responder este email.</p>
        
        <p>Atenciosamente,<br>Equipe Fottufy</p>
        
        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #777; text-align: center;">
          <p>© ${currentYear} Fottufy. Todos os direitos reservados.</p>
        </div>
      </div>
    `;
    
    const result = await sendEmail({
      to: email,
      subject: `Bem-vindo à Fottufy, ${displayName}!`,
      html: htmlContent
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    return false;
  }
}

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

// Função para processar webhooks da Hotmart
export async function processHotmartWebhook(payload: HotmartWebhookPayload): Promise<{ success: boolean, message: string }> {
  try {
    // Verificar se o payload é válido
    if (!payload) {
      console.error('Hotmart webhook: payload inválido ou vazio');
      return { success: false, message: 'Payload inválido ou vazio' };
    }
    
    // Tentar extrair o evento
    const event = payload.event || 'unknown_event';
    console.log(`Hotmart: Evento recebido: ${event}`);
    
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
        email = foundEmail;
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
    
    // Processar de acordo com o tipo de evento
    switch (event) {
      case 'purchase.approved':
        if (user) {
          // Usuário existente - ativar o plano
          console.log(`Hotmart: Ativando plano ${planType} para usuário existente: ${email}`);
          await storage.updateUserSubscription(user.id, planType);
          
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
          
          // Gerar senha aleatória
          const randomPassword = generateRandomPassword();
          // Hash da senha
          const hashedPassword = await hashPassword(randomPassword);
          
          // Dados para o novo usuário, com validação segura para evitar erros
          // Extrair informações do cliente de diferentes locais do payload
          const customerName = findCustomerName(payload);
          const customerPhone = findCustomerPhone(payload);
          
          const userData: InsertUser = {
            name: (customerName || data?.buyer?.name || email.split('@')[0]) || 'Usuário Fottufy',
            email,
            password: hashedPassword, // Usar hash da senha
            role: 'photographer',
            status: 'active',
            phone: customerPhone || data?.buyer?.phone || '',
            planType,
            subscriptionStatus: 'active'
          };
          
          // Criar o usuário
          user = await storage.createUser(userData);
          
          // Atualizar limite de uploads com base no plano
          await storage.updateUserSubscription(user.id, planType);
          
          // Salvar ID da transação para referência
          await storage.updateUser(user.id, {
            subscription_id: data?.purchase?.transaction || `hotmart_${Date.now()}`
          });
          
          // Enviar email de boas-vindas com a senha
          try {
            await sendWelcomeEmailWithPassword(
              userData.name, 
              userData.email, 
              randomPassword // Enviar senha em texto plano no email
            );
          } catch (emailError) {
            console.error('Erro ao enviar email de boas-vindas:', emailError);
          }
        }
        return { success: true, message: 'Plano ativado com sucesso' };
        
      case 'purchase.refunded':
      case 'purchase.chargeback':
      case 'subscription.canceled':
        if (user) {
          console.log(`Hotmart: Desativando plano para usuário: ${email} (evento: ${event})`);
          // Atualizar para plano gratuito e desativar subscrição
          await storage.updateUserSubscription(user.id, 'free');
          await storage.updateUser(user.id, {
            subscriptionStatus: 'inactive',
            // Opcionalmente, pode deixar o usuário inativo também
            // status: 'inactive' 
          });
        }
        return { success: true, message: 'Plano desativado' };
        
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