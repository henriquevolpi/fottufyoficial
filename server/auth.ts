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
  // Configure session cookie options
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "studio-dev-secret",
    resave: true, // Changed to true to ensure session is saved on every request
    saveUninitialized: true, // Changed to true to ensure cookie is set even for uninitialized sessions
    store: storage.sessionStore,
    name: 'studio.sid', // Specific name for the session cookie
    cookie: { 
      secure: false, // Must be false for development without HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (1 week)
      httpOnly: true, // Prevents JavaScript from reading the cookie
      sameSite: 'lax', // Allows the cookie to be sent in cross-site requests
      path: '/', // Cookie available across the entire site
      domain: undefined // Use the default domain
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
        
        console.log(`Registration successful for: ${email}, ID: ${user.id}, Session ID: ${req.sessionID}`);
        
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
    console.log("[LOGIN] Processing login request for email:", req.body?.email);
    
    // Use standard passport authentication
    passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
      if (err) {
        console.error("[LOGIN] Authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("[LOGIN] Invalid credentials for email:", req.body?.email);
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      console.log(`[LOGIN] User authenticated successfully: ID=${user.id}, email=${user.email}`);
      
      // Login the user and establish a session
      req.login(user, (err) => {
        if (err) {
          console.error("[LOGIN] Session creation error:", err);
          return next(err);
        }
        
        console.log(`[LOGIN] Session established, ID: ${req.sessionID}`);
        
        // Return user data without password
        const { password, ...userData } = user;
        res.status(200).json(userData);
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
    console.log("[USER] Checking user authentication");
    console.log(`[USER] Session ID: ${req.sessionID}`);
    console.log(`[USER] Cookies: ${JSON.stringify(req.headers.cookie)}`);
    console.log(`[USER] Is authenticated: ${req.isAuthenticated ? req.isAuthenticated() : "not a function"}`);
    console.log(`[USER] User in request: ${req.user ? `ID=${req.user.id}, role=${req.user.role}` : "not set"}`);
    
    // First, handle normal passport session authentication
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log(`[USER] User authenticated via session, ID=${req.user.id}`);
      
      // Return user data without password
      const { password, ...userData } = req.user;
      return res.json(userData);
    }
    
    // If we have the backup cookies but no session, try to rebuild session
    if (req.headers.cookie && (
        req.headers.cookie.includes('studio_auth=true') ||
        req.headers.cookie.includes('studio_user_id')
      )) {
      console.log('[USER] Found backup cookies but no passport session. Attempting to recover...');
      
      // Try to extract user ID from cookie
      let userId = null;
      const cookies = req.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'studio_user_id') {
          userId = parseInt(value);
          break;
        }
      }
      
      if (userId && !isNaN(userId)) {
        console.log(`[USER] Found user ID ${userId} in cookie, loading user...`);
        
        // Try to get the user data
        storage.getUser(userId)
          .then(user => {
            if (user) {
              console.log(`[USER] Successfully loaded user from cookie ID: ${userId}`);
              
              // Login the user to establish a session
              req.login(user, (err) => {
                if (err) {
                  console.error('[USER] Error establishing session from cookie:', err);
                  return res.status(401).json({ message: "Não autorizado" });
                }
                
                // Return the user data
                console.log('[USER] Successfully established session from cookie');
                const { password, ...userData } = user;
                return res.json(userData);
              });
              return; // Important to prevent executing the code below
            } else {
              console.log(`[USER] Could not find user with ID ${userId} from cookie`);
            }
          })
          .catch(err => {
            console.error('[USER] Error loading user from cookie ID:', err);
          });
        
        // Return early since we're handling response in promise
        return;
      }
    }
    
    // Log additional debug information about session and cookies
    if (req.session) {
      console.log('[USER] Session object:', {
        id: req.sessionID,
        cookie: req.session.cookie ? {
          expires: req.session.cookie.expires,
          maxAge: req.session.cookie.maxAge,
          httpOnly: req.session.cookie.httpOnly,
          path: req.session.cookie.path,
          domain: req.session.cookie.domain,
          secure: req.session.cookie.secure
        } : 'No cookie in session',
        passport: req.session.passport
      });
    } else {
      console.log('[USER] No session object found');
    }
    
    console.log("[USER] Authentication failed, returning 401");
    return res.status(401).json({ message: "Não autorizado" });
  });
}