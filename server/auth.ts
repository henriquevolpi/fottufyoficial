import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import axios from "axios";
import { storage } from "./storage";
import { User as SelectUser, users } from "@shared/schema";
import { sendEmail } from "./utils/sendEmail";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { enhanceUserWithComputedProps } from "./utils/userUtils";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const SALT_ROUNDS = 10;
const BOT_CONVERSA_WEBHOOK_URL = "https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/108243/V8tF64jdaanj/";

/**
 * Envia os dados de registro para o webhook do BotConversa
 * Falha silenciosamente em caso de erro para não bloquear o processo de registro
 */
async function sendBotConversaWebhook(name: string, phone: string) {
  // Evitar enviar webhook em ambiente de desenvolvimento para economizar recursos
  if (process.env.NODE_ENV === 'development' && process.env.FORCE_WEBHOOK !== 'true') {
    return;
  }
  
  try {
    // Log condicional baseado em variável de ambiente
    if (process.env.DEBUG_WEBHOOK === 'true') {
      console.log(`[WEBHOOK] Enviando dados para BotConversa`);
    }
    
    await axios.post(BOT_CONVERSA_WEBHOOK_URL, {
      name, 
      phone
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // Timeout de 5 segundos para não atrasar o fluxo principal
    });
    
    // Log condicional
    if (process.env.DEBUG_WEBHOOK === 'true') {
      console.log('[WEBHOOK] Dados enviados com sucesso');
    }
  } catch (error: any) {
    // Apenas loga o erro sem interromper o fluxo principal
    if (process.env.DEBUG_WEBHOOK === 'true') {
      console.error('[WEBHOOK] Erro ao enviar dados');
    }
  }
}

/**
 * Envia um e-mail de boas-vindas para o usuário recém registrado
 * Falha silenciosamente em caso de erro para não bloquear o processo de registro
 */
async function sendWelcomeEmail(name: string, email: string) {
  // Evitar enviar email em ambiente de desenvolvimento para economizar recursos
  if (process.env.NODE_ENV === 'development' && process.env.FORCE_EMAIL !== 'true') {
    return;
  }
  
  try {
    if (process.env.DEBUG_EMAIL === 'true') {
      console.log(`[EMAIL] Enviando e-mail de boas-vindas`);
    }
    
    // Formatação básica do nome para exibição
    const displayName = name.split(' ')[0]; // Pega apenas o primeiro nome
    
    // Template HTML do email (armazenado estaticamente para evitar processamento repetitivo)
    const htmlContent = getWelcomeEmailTemplate(displayName, new Date().getFullYear());
    
    // Enviar o e-mail
    const result = await sendEmail({
      to: email,
      subject: `Bem-vindo à Fottufy, ${displayName}!`,
      html: htmlContent
    });
    
    if (result.success) {
      if (process.env.DEBUG_EMAIL === 'true') {
        console.log(`[EMAIL] E-mail enviado com sucesso`);
      }
    } else {
      if (process.env.DEBUG_EMAIL === 'true') {
        console.error(`[EMAIL] Falha ao enviar e-mail: ${result.message}`);
      }
    }
  } catch (error: any) {
    // Apenas loga o erro em modo debug
    if (process.env.DEBUG_EMAIL === 'true') {
      console.error('[EMAIL] Erro ao enviar e-mail');
    }
  }
}

// Função separada para o template do email de boas-vindas
// Evita recriação do template HTML em cada chamada
function getWelcomeEmailTemplate(displayName: string, currentYear: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bem-vindo à Fottufy</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #6366f1;
          padding: 20px;
          text-align: center;
          color: white;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #6b7280;
          font-size: 14px;
        }
        h1 {
          color: white;
          margin: 0;
          font-size: 24px;
        }
        .button {
          display: inline-block;
          background-color: #6366f1;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          margin-top: 20px;
          font-weight: bold;
        }
        p {
          margin-bottom: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bem-vindo à Fottufy!</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${displayName}</strong>!</p>
          <p>É com grande prazer que damos as boas-vindas à Fottufy, sua nova plataforma para gerenciamento de fotos profissionais.</p>
          <p>Com a Fottufy, você poderá:</p>
          <ul>
            <li>Fazer upload e organizar suas fotos em projetos</li>
            <li>Compartilhar seus projetos com clientes através de links únicos</li>
            <li>Acompanhar quais fotos seus clientes selecionaram</li>
            <li>Gerenciar entregas e visualizações de seus trabalhos</li>
          </ul>
          <p>Para começar, faça login na plataforma e crie seu primeiro projeto:</p>
          <div style="text-align: center;">
            <a href="https://fottufy.com/dashboard" class="button">Acessar Minha Conta</a>
          </div>
          <p style="margin-top: 30px;">Se você tiver qualquer dúvida, basta responder a este e-mail que nossa equipe estará pronta para ajudar.</p>
          <p>Atenciosamente,<br>Equipe Fottufy</p>
        </div>
        <div class="footer">
          <p>© ${currentYear} Fottufy. Todos os direitos reservados.</p>
          <p>Está recebendo este e-mail porque você se registrou na plataforma Fottufy.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error("Error hashing password:", error);
    throw error;
  }
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // Special handling for admin@studio.com in case password isn't hashed
  if (stored === "admin123") {
    return supplied === "admin123";
  }
  
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    // Fallback to direct comparison in case of error
    return supplied === stored;
  }
}

export function setupAuth(app: Express) {
  // Detect if we're in a cross-domain environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isReplit = !!(process.env.REPLIT_DB_URL || process.env.REPL_ID);
  
  // Configure session cookie options for cross-domain compatibility
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "studio-development-secret-key-testing-onlyaaaaa", 
    resave: true, 
    saveUninitialized: true,
    store: storage.sessionStore,
    name: 'fottufy.sid', // Custom session name to avoid conflicts
    cookie: { 
      // Enable secure cookies for HTTPS environments (Replit uses HTTPS)
      secure: !!(isReplit || isProduction),
      // Long session duration
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      // Allow frontend access to cookies for debugging and fallback auth
      httpOnly: false,
      // Critical: Use 'none' for cross-domain functionality
      sameSite: isReplit || isProduction ? 'none' : 'lax',
      path: '/',
      // No domain restriction to allow cross-domain access
      domain: undefined
    },
    // Additional options for better cross-domain support
    proxy: true, // Trust proxy headers
    rolling: true // Reset expiration on each request
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase();
        const user = await storage.getUserByEmail(normalizedEmail);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      if (process.env.DEBUG_AUTH === 'true') {
        console.log("Processing registration request");
      }
      
      // Validate required fields
      let { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Normalize email to lowercase
      email = email.toLowerCase();
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Hash the password with bcrypt
      const hashedPassword = await hashPassword(password);
      
      // Create basic user data
      const userData = {
        name: req.body.name || email.split('@')[0], // Use part of email as name if not provided
        email,
        phone: req.body.phone || '+000000000000', // Use provided phone or default if not provided
        password: hashedPassword,
        role: "photographer", // Default to photographer role
        status: "active"      // Default to active status
      };
      
      // Criar usuário de forma assíncrona
      const user = await storage.createUser(userData);
      
      // Enviar webhook e email em background sem await (não bloqueia o fluxo principal)
      Promise.all([
        sendBotConversaWebhook(userData.name, userData.phone).catch(() => {}),
        sendWelcomeEmail(userData.name, userData.email).catch(() => {})
      ]);
      
      // Define a cookie da sessão primeiro, igual ao login
      if (req.session) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias (igual ao login)
      }
      
      // Establish session by logging in the user
      req.login(user, (err) => {
        if (err) {
          if (process.env.DEBUG_AUTH === 'true') {
            console.error("Error establishing session after registration");
          }
          return next(err);
        }
        
        if (process.env.DEBUG_AUTH === 'true') {
          console.log(`Registration successful for ID: ${user.id}`);
          console.log(`Session ID: ${req.sessionID}`);
        }
        
        // Set cross-domain compatible cookies for registration
        const cookieOptions = {
          httpOnly: false,
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: '/',
          sameSite: (isReplit || isProduction ? 'none' : 'lax') as 'none' | 'lax',
          secure: isReplit || isProduction,
          domain: undefined
        };
        
        try {
          res.cookie('auth_user', user.id, cookieOptions);
          
          const authToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
          res.cookie('auth_token', authToken, cookieOptions);
        } catch (cookieError) {
          console.error("Error setting cookies after registration:", cookieError);
        }
        
        // Importante: Retornar o objeto de usuário COMPLETO (exceto senha) igual ao fluxo de login
        // Isso garante que o frontend receba os mesmos dados que no login manual
        const { password, ...completeUserData } = user;
        
        // Log adicional para debug
        if (process.env.DEBUG_AUTH === 'true') {
          console.log(`Sending complete user data after registration: ID=${user.id}`);
        }
        
        res.status(201).json(completeUserData);
      });
    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.error("Error during registration");
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    // Normalize email to lowercase if provided
    if (req.body?.email) {
      req.body.email = req.body.email.toLowerCase();
    }
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        // Evitar expor a estrutura interna de autenticação para o cliente
        return res.status(401).json({ 
          message: "Falha na autenticação. Verifique seu email e senha."
        });
      }
      
      // Define a cookie da sessão
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
      
      // Definir o usuario nas sessões
      req.login(user, (err: any) => {
        if (err) return next(err);
        
        // Set user in session manually to ensure it's saved
        (req.session as any).passport = { user: user.id };
        
        // Force save session immediately
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Error saving session:", saveErr);
            return next(saveErr);
          }
            
          console.log(`[LOGIN] User ${user.id} logged in successfully`);
          console.log(`[LOGIN] Session ID: ${req.sessionID}`);
          console.log(`[LOGIN] Session data:`, req.session);
          
          // Set multiple authentication cookies for cross-domain compatibility
          const cookieOptions = {
            httpOnly: false,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
            sameSite: (isReplit || isProduction ? 'none' : 'lax') as 'none' | 'lax',
            secure: isReplit || isProduction,
            domain: undefined // Allow cross-domain
          };
          
          res.cookie('auth_user', user.id, cookieOptions);
          
          // Set simple auth token that frontend can use
          const authToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
          res.cookie('auth_token', authToken, cookieOptions);
          
          // Return user data
          const { password, ...userData } = user;
          res.json(userData);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).json({ message: "Erro ao realizar logout" });
      }
      // Limpar o cookie user_id usado para backup
      res.clearCookie('user_id');
      res.clearCookie('studio_user_id');
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    console.log("[USER] Checking user authentication");
    console.log(`[USER] Session ID: ${req.sessionID}`);
    console.log(`[USER] Cookies: ${req.headers.cookie ? 'present' : 'undefined'}`);
    console.log(`[USER] Is authenticated: ${req.isAuthenticated ? req.isAuthenticated() : "not a function"}`);
    console.log(`[USER] User in request: ${req.user ? 'set' : "not set"}`);
    
    // First, handle normal passport session authentication
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      console.log(`[USER] User authenticated via session`);
      
      // Apply enhanceUserWithComputedProps to get real plan data and limits
      const enhancedUser = enhanceUserWithComputedProps(req.user);
      const { password, ...userData } = enhancedUser;
      
      console.log('[USER-API] Returning enhanced user data:', {
        id: userData.id,
        name: userData.name,
        planType: userData.planType,
        uploadLimit: userData.uploadLimit,
        status: userData.status,
        maxProjects: userData.maxProjects
      });
      
      return res.json(userData);
    }
    
    // Try to recover session from cookies if available
    if (req.headers.cookie && req.headers.cookie.includes('studio.sid')) {
      console.log('[USER] Session cookie found, attempting to reload session...');
      
      // Force session reload to recover user data
      req.session.reload((err) => {
        if (!err && req.isAuthenticated && req.isAuthenticated() && req.user) {
          console.log('[USER] Session recovered successfully');
          const enhancedUser = enhanceUserWithComputedProps(req.user);
          const { password, ...userData } = enhancedUser;
          return res.json(userData);
        } else {
          console.log('[USER] Failed to recover session from cookie');
          return res.status(401).json({ message: "Não autorizado" });
        }
      });
      return;
    }
    
    // Log adicional apenas se DEBUG_AUTH for habilitado
    if (process.env.DEBUG_AUTH === 'true' && req.session) {
      console.log('[USER] Session object debug info');
    }
    
    // Sem log detalhado em produção para economizar memória
    if (process.env.DEBUG_AUTH === 'true') {
      console.log("[USER] Authentication failed, returning 401");
    }
    
    // Resposta simplificada para economizar memória
    return res.status(401).json({ message: "Não autorizado" });
  });
  
  /**
   * Altera a senha do usuário logado
   * 
   * POST /api/user/change-password
   * Body: { currentPassword: string, newPassword: string }
   * 
   * Retorna:
   * - 200 { success: true, message: "Senha alterada com sucesso" }
   * - 400 { success: false, message: "Senha atual incorreta" }
   * - 401 Unauthorized (usuário não autenticado)
   */
  app.post("/api/user/change-password", async (req, res) => {
    // Verificar se o usuário está logado
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado"
      });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Validação básica
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Senha atual e nova senha são obrigatórias"
        });
      }
      
      // Obter o usuário atual do banco de dados para ter a senha atual
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado"
        });
      }
      
      // Verificar se a senha atual está correta
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Senha atual incorreta"
        });
      }
      
      // Gerar hash da nova senha
      const hashedPassword = await hashPassword(newPassword);
      
      // Atualizar a senha no banco de dados
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));
      
      console.log(`Senha alterada com sucesso para o usuário ID: ${user.id}`);
      
      return res.status(200).json({
        success: true,
        message: "Senha alterada com sucesso"
      });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao processar a solicitação"
      });
    }
  });
}