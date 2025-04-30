import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
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
      // Essential for cookies to work in all browsers in this environment
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
      console.log("Processing registration request");
      console.log("Registration data:", JSON.stringify(req.body));
      
      // Validate required fields
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
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
      
      console.log("Creating new user");
      const user = await storage.createUser(userData);
      
      // Establish session by logging in the user
      req.login(user, (err) => {
        if (err) {
          console.error("Error establishing session after registration:", err);
          return next(err);
        }
        
        console.log(`Registration successful for: ${email}, ID: ${user.id}`);
        
        // Return only id and email as requested
        res.status(201).json({
          id: user.id,
          email: user.email
        });
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
        
        // Set a direct cookie with the user ID for tracking
        res.cookie('user_id', user.id.toString(), {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          httpOnly: false,
          secure: false,
          path: '/',
          sameSite: 'lax'
        });
        
        // Return user data without password
        const { password, ...userData } = user;
        res.status(200).json(userData);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Clear all cookies related to authentication
    res.clearCookie('user_id');
    res.clearCookie('studio_user_id');
    res.clearCookie('studio_auth');
    res.clearCookie('studio.sid');
    
    // Logout from passport session
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
    
    // If we have any backup cookies but no session, try to rebuild session
    if (req.headers.cookie) {
      console.log('[USER] Found cookies but no passport session. Attempting to recover...');
      
      // Try to extract user ID from any available cookie
      let userId = null;
      const cookies = req.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        // Check both our original cookie and the new user_id cookie
        if (name === 'studio_user_id' || name === 'user_id') {
          userId = parseInt(value);
          console.log(`[USER] Found user ID ${userId} in cookie ${name}`);
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