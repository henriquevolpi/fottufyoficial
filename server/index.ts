import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

// Definir variável de ambiente para a sessão se não estiver definida
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "studio-foto-session-secret-key-2023";
  console.log("SESSION_SECRET definido com valor padrão");
}

// Create upload directory if it doesn't exist
// Use a direct path relative to the project root
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}
console.log(`Upload directory path: ${uploadsDir}`); // Log for debugging

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique ID for better URL handling
    const id = nanoid();
    // Get original extension and ensure it's preserved
    const ext = path.extname(file.originalname) || getExtensionFromMimeType(file.mimetype);
    // Final filename format: unique-id.ext
    cb(null, `${id}${ext}`);
    
    // Log for debugging
    console.log(`File upload: ${file.originalname} → ${id}${ext}`);
  }
});

// Helper function to get extension from MIME type if original name doesn't have one
function getExtensionFromMimeType(mimetype: string): string {
  switch(mimetype) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/gif':
      return '.gif';
    case 'image/webp':
      return '.webp';
    default:
      return '.jpg'; // Default to jpg
  }
}

// Filter for image files only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Initialize Express and configure middleware
const app = express();

// Configure essential middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up CORS to allow credentials
app.use((req, res, next) => {
  // For development, allow all origins with credentials
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Set up authentication BEFORE any route handlers
import { setupAuth } from './auth';
setupAuth(app);

// Configure session logging middleware
app.use((req, res, next) => {
  // Log session details for debugging
  if (req.path.startsWith('/api/')) {
    console.log(`Request: ${req.method} ${req.path}`);
    console.log(`Session ID: ${req.sessionID}`);
    console.log(`Authenticated: ${req.isAuthenticated ? req.isAuthenticated() : 'N/A'}`);
    console.log(`User: ${req.user ? `ID=${req.user.id}` : 'none'}`);
    console.log(`Cookies: ${req.headers.cookie || 'none'}`);
  }
  next();
});

// Set up static file serving
app.use('/uploads', express.static(uploadsDir));

// Request/response logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register API routes after authentication is set up
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
