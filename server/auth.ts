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
  // Configure session cookie options for maximum compatibility
  const sessionSettings: session.SessionOptions = {
    // Use a strong secret for security
    secret: process.env.SESSION_SECRET || "studio-development-secret-key-testing-onlyaaaaa", 
    // These settings must be true for Replit environment to work properly
    resave: true, 
    saveUninitialized: true,
    store: storage.sessionStore,
    name: 'studio.sid',
    cookie: { 
      // Must be false in development (no HTTPS)
      secure: false,
      // Longer session duration (30 days) to avoid frequent re-logins
      maxAge: 30 * 24 * 60 * 60 * 1000,
      // Allow JavaScript to read the cookie for backup recovery
      httpOnly: false,
      // CRÍTICO: cookies não funcionam corretamente com 'lax' em iframes do Replit
      sameSite: 'none',
      path: '/',
      // Configuração especial para garantir que o cookie funcione no Replit com SameSite=none
      domain: process.env.REPLIT_DOMAIN ? undefined : undefined
    }
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
        }
        
        // Return only id and email as requested
        res.status(201).json({
          id: user.id,
          email: user.email
        });
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
    
    passport.authenticate("local", (err, user, info) => {
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
      req.login(user, async (err) => {
        if (err) return next(err);
        
        // Atualizar o campo lastLoginAt
        try {
          await storage.updateUser(user.id, { lastLoginAt: new Date() });
        } catch (updateError) {
          // Log o erro mas continua o login (não é crucial)
          console.error("Error updating lastLoginAt:", updateError);
        }
        
        // Tentar usar o nome padrão do domínio da aplicação em vez de usar códigos rígidos
        try {
          // Informação sobre o domínio para o javascript do cliente
          res.cookie('user_id', user.id, {
            httpOnly: false,  // Precisa ser acessível pelo JS
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
            sameSite: 'lax', // Lax permite que o cookie seja enviado em navegações de nível superior
            secure: false     // Não exigir HTTPS em desenvolvimento
          });
        } catch (cookieError) {
          // Log o erro mas continua o login (não é crucial)
          console.error("Error setting cookie:", cookieError);
        }
        
        // Retornar apenas os dados necessários por segurança
        const { password, ...userData } = user;
        res.json(userData);
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

  app.get("/api/user", (req, res) => {
    if (process.env.DEBUG_AUTH === 'true') {
      console.log("[USER] Checking user authentication");
      console.log(`[USER] Session ID: ${req.sessionID}`);
      console.log(`[USER] Cookies: ${req.headers.cookie ? 'present' : 'undefined'}`);
      console.log(`[USER] Is authenticated: ${req.isAuthenticated ? req.isAuthenticated() : "not a function"}`);
      console.log(`[USER] User in request: ${req.user ? 'set' : "not set"}`);
    }
    
    // First, handle normal passport session authentication
    if (req.isAuthenticated && req.isAuthenticated()) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.log(`[USER] User authenticated via session`);
      }
      
      // Return user data without password - enviando apenas os dados necessários
      const { password, ...userData } = req.user;
      return res.json(userData);
    }
    
    // If we have any backup cookies but no session, try to rebuild session
    if (req.headers.cookie) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.log('[USER] Found cookies but no passport session. Attempting to recover...');
      }
      
      // Try to extract user ID from any available cookie
      let userId = null;
      const cookies = req.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        // Check both our original cookie and the new user_id cookie
        if (name === 'studio_user_id' || name === 'user_id') {
          userId = parseInt(value);
          break;
        }
      }
      
      if (userId && !isNaN(userId)) {
        // Try to get the user data
        storage.getUser(userId)
          .then(user => {
            if (user) {
              if (process.env.DEBUG_AUTH === 'true') {
                console.log(`[USER] Loaded user from cookie`);
              }
              
              // Atualizar o campo lastLoginAt
              storage.updateUser(user.id, { lastLoginAt: new Date() })
                .then(updatedUser => {
                  if (process.env.DEBUG_AUTH === 'true') {
                    console.log(`[USER] Last login timestamp updated`);
                  }
                  
                  // Se o updateUser retornar um usuário atualizado, usamos ele, caso contrário mantém o original
                  const userToLogin = updatedUser || user;
                  
                  // Login the user to establish a session
                  req.login(userToLogin, (err) => {
                    if (err && process.env.DEBUG_AUTH === 'true') {
                      console.error('[USER] Error establishing session');
                      return res.status(401).json({ message: "Não autorizado" });
                    }
                    
                    // Return the user data
                    if (process.env.DEBUG_AUTH === 'true') {
                      console.log('[USER] Session established');
                    }
                    const { password, ...userData } = userToLogin;
                    return res.json(userData);
                  });
                })
                .catch(error => {
                  if (process.env.DEBUG_AUTH === 'true') {
                    console.error("[USER] Error updating last login timestamp");
                  }
                  
                  // Login the user to establish a session (mesmo com erro na atualização do timestamp)
                  req.login(user, (err) => {
                    if (err && process.env.DEBUG_AUTH === 'true') {
                      console.error('[USER] Error establishing session');
                      return res.status(401).json({ message: "Não autorizado" });
                    }
                    
                    // Return the user data
                    if (process.env.DEBUG_AUTH === 'true') {
                      console.log('[USER] Session established');
                    }
                    const { password, ...userData } = user;
                    return res.json(userData);
                  });
                });
              return; // Important to prevent executing the code below
            } else if (process.env.DEBUG_AUTH === 'true') {
              console.log(`[USER] Could not find user from cookie`);
            }
          })
          .catch(err => {
            if (process.env.DEBUG_AUTH === 'true') {
              console.error('[USER] Error loading user from cookie');
            }
          });
        
        // Return early since we're handling response in promise
        return;
      }
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