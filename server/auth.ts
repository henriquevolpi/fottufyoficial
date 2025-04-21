import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Special handling for admin@studio.com in case password isn't hashed
  if (stored === "admin123") {
    return supplied === "admin123";
  }
  
  // Handle case where password isn't properly formatted
  if (!stored || !stored.includes('.')) {
    console.warn("Password not properly formatted for scrypt comparison");
    return supplied === stored; // Fallback to direct comparison
  }
  
  try {
    const [hashed, salt] = stored.split(".");
    if (!salt) {
      console.warn("No salt found in stored password");
      return supplied === stored; // Fallback to direct comparison
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    // Fallback to direct comparison in case of error
    return supplied === stored;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "studio-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'studio.sid', // Specific name for the session cookie
    cookie: { 
      secure: false, // Set to false for development to work without HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (1 week)
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
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
        const user = await storage.getUserByEmail(email);
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
      console.log("Processing registration request:", req.body);
      
      // Validate required fields
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Nome, email e senha são obrigatórios" });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }
      
      // Create user with basic info and photographer role
      const userData = {
        ...req.body,
        role: "photographer", // Default to photographer role
        status: "active",     // Default to active status
        planType: "free",     // Default to free plan
        subscriptionStatus: "inactive",
        uploadLimit: 50,      // Default limit for free plan
        usedUploads: 0,
        password: await hashPassword(password), // Hash the password
      };
      
      console.log("Creating new user with data:", { ...userData, password: "[REDACTED]" });
      const user = await storage.createUser(userData);
      
      // Establish session by logging in the user
      req.login(user, (err) => {
        if (err) {
          console.error("Error establishing session after registration:", err);
          return next(err);
        }
        
        console.log(`Registration successful for: ${email}, ID: ${user.id}`);
        
        // Return user data without password
        const { password, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error("Error during registration:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Credenciais inválidas" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user without password
        if (user) {
          const { password, ...userData } = user;
          res.status(200).json(userData);
        } else {
          res.status(500).json({ message: "Erro ao carregar dados do usuário" });
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("GET /api/user - Status de autenticação:", 
      req.isAuthenticated ? req.isAuthenticated() : "isAuthenticated não é uma função",
      "Session ID:", req.sessionID);
    
    // If not authenticated, return 401 unauthorized
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log("User not authenticated, returning 401");
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    console.log("User authenticated, returning user data:", req.user ? `ID=${req.user.id}` : "undefined");
    
    // If authenticated, return the user (omit password)
    if (req.user) {
      const { password, ...userData } = req.user;
      res.json(userData);
    } else {
      res.status(500).json({ message: "Erro ao carregar dados do usuário" });
    }
  });
}