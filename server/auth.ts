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
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: { 
      secure: false, // Set to false to ensure cookies work on http in development
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      sameSite: 'lax'
    }
  };
  
  console.log("Setting up session with the following settings:", {
    secret: process.env.SESSION_SECRET ? "***" : "studio-dev-secret",
    resave: true,
    saveUninitialized: true,
    cookieSecure: false,
    cookieMaxAge: "7 days",
    cookieHttpOnly: true,
    cookieSameSite: "lax",
  });

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
      console.log("POST /api/register - Registration attempt:", { email: req.body.email, name: req.body.name });
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.log("Registration failed: Email already in use:", req.body.email);
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Create the user with hashed password
      const hashedPassword = await hashPassword(req.body.password);
      console.log("Password hashed successfully for new user");
      
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      
      console.log("User created successfully:", { id: user.id, email: user.email, role: user.role });

      // Log the user in (create a session)
      req.login(user, (err) => {
        if (err) {
          console.error("Error during login after registration:", err);
          return next(err);
        }
        
        console.log("User logged in successfully after registration, authenticated:", req.isAuthenticated());
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Error during registration:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("POST /api/login - Attempting login with:", { email: req.body.email });
    
    passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed: Invalid credentials for", req.body.email);
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      console.log("Login successful for user:", { id: user.id, email: user.email, role: user.role });
      
      req.login(user, (err) => {
        if (err) {
          console.error("Error during req.login:", err);
          return next(err);
        }
        
        console.log("Session established, user authenticated:", req.isAuthenticated());
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("POST /api/logout - Logging out user:", req.user ? { id: req.user.id, email: req.user.email } : "No user");
    
    // First call req.logout()
    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return next(err);
      }
      
      // Then destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return next(err);
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        console.log("User logged out successfully, session destroyed");
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("GET /api/user - Request received");
    console.log("Session ID:", req.sessionID);
    console.log("Cookie:", req.headers.cookie);
    console.log("Authentication status:", req.isAuthenticated ? req.isAuthenticated() : "isAuthenticated not a function");
    
    // Check if user data exists
    if (req.user) {
      console.log("User data exists in session:", { id: req.user.id, email: req.user.email, role: req.user.role });
    } else {
      console.log("No user data in session");
    }
    
    // If not authenticated, return 401 unauthorized
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log("User not authenticated, returning 401");
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    // If authenticated, return the user
    console.log("User authenticated, returning user data");
    res.json(req.user);
  });
}