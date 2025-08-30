/**
 * MIDDLEWARE DE SEGURANÇA - FOTTUFY
 * 
 * Este arquivo contém todas as configurações de segurança aplicadas
 * de forma conservadora para não quebrar funcionalidades existentes.
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

/**
 * Configuração de headers de segurança básicos usando Helmet
 * Configuração conservadora para não quebrar funcionalidades
 */
export const securityHeaders = helmet({
  // Headers básicos de segurança com suporte para Stripe
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"], // Stripe support
      connectSrc: ["'self'", "https:", "wss:", "ws:", "https://api.stripe.com"], // Stripe API
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"], // Stripe frames
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "blob:"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  
  // Previne clickjacking
  frameguard: { action: 'deny' },
  
  // Remove cabeçalho X-Powered-By
  hidePoweredBy: true,
  
  // HSTS para HTTPS (só ativa em produção)
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: false
  } : false,
  
  // Previne MIME sniffing
  noSniff: true,
  
  // Cross Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Desabilitado para compatibilidade
  
  // Referrer Policy
  referrerPolicy: { policy: "same-origin" }
});

/**
 * Rate limiting conservador para endpoints críticos
 * Configuração que não impactará uso normal
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requisições por IP por janela (muito conservador)
  message: {
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
    details: 'Rate limit atingido'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Não aplicar rate limit para admins e requisições locais
  skip: (req: Request) => {
    const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip?.includes('localhost');
    const isAdmin = req.user && (req.user as any).role === 'admin';
    return isLocalhost || isAdmin;
  }
});

/**
 * Rate limiting mais restritivo para endpoints de autenticação
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 tentativas de login por IP por janela
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    details: 'Limite de tentativas de autenticação atingido'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Aplicar apenas em rotas de autenticação
  skipSuccessfulRequests: true // Não contar requisições bem-sucedidas
});

/**
 * Rate limiting para uploads
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // máximo 30 uploads por minuto por IP
  message: {
    error: 'Muitos uploads em pouco tempo. Aguarde um minuto.',
    details: 'Limite de upload atingido'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Aplicar apenas para usuários autenticados
  skip: (req: Request) => {
    return !req.isAuthenticated || !req.isAuthenticated();
  }
});

/**
 * Middleware para validação avançada de uploads
 * Melhora a segurança sem quebrar funcionalidades
 */
export const advancedUploadValidation = (req: Request, res: Response, next: NextFunction) => {
  // Verificar se é uma requisição de upload
  if (req.method === 'POST' && req.path.includes('upload')) {
    
    // Verificar Content-Type para uploads
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        error: 'Tipo de conteúdo inválido para upload',
        expected: 'multipart/form-data'
      });
    }
    
    // Verificar tamanho do cabeçalho Content-Length
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 500 * 1024 * 1024; // 500MB (reduzido de 1GB)
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Arquivo muito grande',
        maxSize: '500MB',
        receivedSize: `${Math.round(contentLength / 1024 / 1024)}MB`
      });
    }
  }
  
  next();
};

/**
 * Middleware para logs de segurança (somente dados importantes)
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log apenas eventos de segurança importantes
  const isSecuritySensitive = 
    req.path.includes('/auth') || 
    req.path.includes('/login') || 
    req.path.includes('/reset-password') ||
    req.path.includes('/admin') ||
    req.method === 'DELETE';
  
  if (isSecuritySensitive && process.env.NODE_ENV === 'production') {
    // Log seguro sem expor dados sensíveis
    console.log(`[SECURITY] ${req.method} ${req.path} - IP: ${req.ip?.substring(0, 10)}*** - User: ${req.user ? 'authenticated' : 'anonymous'}`);
  }
  
  next();
};

/**
 * Configuração CORS mais segura
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Lista de domínios permitidos (para produção)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      process.env.FRONTEND_URL,
      process.env.ALLOWED_ORIGIN
    ].filter(Boolean);
    
    // Em desenvolvimento, permitir qualquer origem
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Em produção, verificar lista de origens permitidas
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] CORS blocked request from origin: ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  maxAge: 86400 // Cache preflight por 24 horas
};

/**
 * Geração de SESSION_SECRET mais segura
 */
export const generateSecureSessionSecret = (): string => {
  // Se já existe uma session secret definida, usar ela
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET !== "studio-foto-session-secret-key-2023") {
    return process.env.SESSION_SECRET;
  }
  
  // Gerar uma chave mais segura baseada em dados do ambiente
  const crypto = require('crypto');
  const base = process.env.DATABASE_URL || process.env.PORT || Date.now().toString();
  const hash = crypto.createHash('sha256').update(base + 'fottufy-secret-salt').digest('hex');
  
  return `fottufy-${hash.substring(0, 32)}`;
};

/**
 * Middleware para sanitização básica de input
 */
export const inputSanitizer = (req: Request, res: Response, next: NextFunction) => {
  // Sanitizar apenas campos críticos de texto
  if (req.body && typeof req.body === 'object') {
    const fieldsToSanitize = ['name', 'client_name', 'comment', 'email'];
    
    fieldsToSanitize.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        // Remover apenas caracteres obviamente maliciosos
        req.body[field] = req.body[field]
          .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
          .replace(/javascript:/gi, '') // Remove javascript: URLs
          .replace(/on\w+\s*=/gi, '') // Remove event handlers
          .trim();
      }
    });
  }
  
  next();
};