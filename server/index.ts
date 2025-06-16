// index.ts completo, 100% corrigido e pronto para colar

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { testConnection, pool, startDbHealthCheck } from "./db";
import { storage as dbStorage } from "./storage";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import { setupAuth } from './auth';

dotenv.config();

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "studio-foto-session-secret-key-2023";
  console.log("SESSION_SECRET definido com valor padrão");
}

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}

const multerStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => cb(null, `${nanoid()}-${file.originalname}`)
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 1000 * 1024 * 1024 },
  fileFilter: (_, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(null, false)
});

const app = express();

app.use(cors({
  origin: [
    "https://37c5b464-5962-44e7-9a4e-6af568cdfd81-00-27kawzdbfhlcc.worf.replit.dev",
    "http://localhost:3000",
    "http://localhost:5000"
  ],
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: dbStorage.sessionStore,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

app.use(passport.initialize());
app.use(passport.session());

setupAuth(app);

testConnection();

app.use('/uploads', express.static(uploadsDir));

registerRoutes(app);

startDbHealthCheck();

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db_name');
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const projectCount = await pool.query('SELECT COUNT(*) as count FROM projects');
    res.json({
      status: 'connected',
      timestamp: result.rows[0].time,
      database: result.rows[0].db_name,
      tables: {
        users: parseInt(userCount.rows[0].count),
        projects: parseInt(projectCount.rows[0].count)
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Database connection error" });
  }
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  if (!res.headersSent) {
    res.status(status).json({ message });
  } else {
    console.error("Headers already sent. Error:", message);
  }
});

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, async () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  
  // Setup Vite after server is created
  try {
    await setupVite(app, server);
    serveStatic(app);
    console.log("✓ Frontend configured successfully");
  } catch (error) {
    console.error("Frontend setup error:", error);
  }
});

export { upload };