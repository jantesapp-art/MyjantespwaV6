#!/bin/bash
# ============================================================
# MyJantes V6 PRO+ - Railway Complete Deployment (BDD auto + admin)
# ============================================================

set -e
echo "⚡ Déploiement rapide MyJantes V6 PRO+ avec Railway et BDD auto..."

# --- Variables ---
FRONTEND_DIR="client"
SCHEMA_FILE="./shared/schema.ts"
MIGRATIONS_DIR="./migrations"

# --- 1️⃣ Nettoyage Replit ---
echo "🧹 Nettoyage dépendances inutiles..."
npm uninstall @neondatabase/serverless replit dotenv 2>/dev/null || true
rm -f .replit .replit.nix replit.nix

# --- 2️⃣ Installation minimale dépendances ---
echo "📦 Installation dépendances essentielles..."
npm install express pg drizzle-orm connect-pg-simple bcrypt dotenv ws helmet cors compression drizzle-kit winston

# --- 3️⃣ Création .env avec session secret et PORT ---
echo "📄 Création automatique du .env"
cat > .env <<EOL
SESSION_SECRET=$(openssl rand -hex 16)
PORT=3000
EOL

# --- 4️⃣ Build frontend React + Notifications live ---
echo "🎨 Build frontend production avec Notifications"
cd $FRONTEND_DIR
npm install

mkdir -p src/components
cat > src/components/Notifications.tsx <<'EOL'
import { useEffect, useState } from "react";
interface Notification { event: string; message?: string; data?: any }
export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}`);
    ws.onmessage = (event) => {
      const data: Notification = JSON.parse(event.data);
      setNotifications(prev => [data, ...prev]);
    };
    ws.onopen = () => console.log("🔌 WebSocket connecté pour notifications live");
    return () => ws.close();
  }, []);
  return (
    <div style={{ position: "fixed", top: 10, right: 10, zIndex: 9999 }}>
      {notifications.map((notif, idx) => (
        <div key={idx} style={{ background: "rgba(255,0,0,0.85)", color: "white", padding: "10px 15px", marginBottom: 10, borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
          {notif.event}: {notif.message || JSON.stringify(notif.data)}
        </div>
      ))}
    </div>
  );
}
EOL

cat > src/App.tsx <<'EOL'
import Notifications from "./components/Notifications";
function App() {
  return (
    <div>
      <Notifications />
      {/* Ton app existante */}
    </div>
  );
}
export default App;
EOL

npm run build
cd ..

# --- 5️⃣ Backend Express + WebSocket + Admin ---
echo "⚙️ Backend sécurisé + WebSocket + admin par défaut"
cat > server.js <<'EOL'
import express from "express";
import session from "express-session";
import pg from "pg";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./shared/schema";
import path from "path";
import winston from "winston";
import { WebSocketServer } from "ws";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const logger = winston.createLogger({ level: "info", format: winston.format.combine(winston.format.timestamp(), winston.format.json()), transports: [new winston.transports.Console()] });

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json());

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const PgSession = connectPgSimple(session);
app.set("trust proxy", 1);
app.use(session({
  store: new PgSession({ pool }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, sameSite: "none", maxAge: 7*24*60*60*1000 }
}));

const isAuthenticated = (req, res, next) => { 
  if(req.session.userId){ req.session.touch(); return next(); }
  if(req.originalUrl.startsWith("/api")) return res.status(401).json({error:"Non authentifié"});
  return res.redirect("/login");
};

// Routes Auth
app.post("/api/register", async(req,res)=>{
  const {email,password}=req.body;
  const hashed=await bcrypt.hash(password,10);
  const [user]=await db.insert(schema.users).values({email,password:hashed}).returning();
  req.session.userId=user.id;
  res.json({success:true});
});
app.post("/api/login", async(req,res)=>{
  const {email,password}=req.body;
  const user=await db.query.users.findFirst({where:{email}});
  if(!user||!(await bcrypt.compare(password,user.password))) return res.status(401).json({error:"Email ou mot de passe incorrect"});
  req.session.userId=user.id;
  res.json({success:true});
});
app.post("/api/logout",(req,res)=>{ req.session.destroy(()=>res.json({success:true})); });
app.get("/api/profile",isAuthenticated,async(req,res)=>{
  const user=await db.query.users.findFirst({where:{id:req.session.userId}});
  res.json({user});
});

// HTTPS redirect
app.use((req,res,next)=>{ if(req.headers["x-forwarded-proto"]!=="https") return res.redirect(`https://${req.headers.host}${req.url}`); next(); });

// WebSocket notifications
let notifications=[];
const server=app.listen(PORT,()=>logger.info(`✅ Serveur MyJantes PRO+ rapide actif sur port ${PORT}`));
const wss=new WebSocketServer({server});
wss.on("connection",ws=>{
  ws.send(JSON.stringify({event:"connected",message:"Bienvenue MyJantes V6 PRO+ 🚗"}));
  ws.on("message",msg=>{
    const data=JSON.parse(msg.toString());
    notifications.push(data);
    wss.clients.forEach(client=>client.readyState===1 && client.send(JSON.stringify(data)));
  });
});

// Frontend static
app.use(express.static(path.join(process.cwd(),"client/dist")));
app.get("*",(req,res)=>res.sendFile(path.join(process.cwd(),"client/dist/index.html")));

// Création admin par défaut
const setupAdmin = async () => {
  const adminExists = await db.query.users.findFirst({ where: { role: "admin" } });
  if (!adminExists) {
    const hashed = await bcrypt.hash("admin123",10);
    await db.insert(schema.users).values({ email:"admin@myjantes.com", password:hashed, role:"admin" });
    console.log("✅ Utilisateur admin créé : admin@myjantes.com / admin123");
  }
};
setupAdmin();
EOL

# --- 6️⃣ Git push ---
git init 2>/dev/null || true
git add .
git commit -m "Railway Complete Deployment MyJantes V6 PRO+ Live" || true
git remote add origin https://github.com/jantesapp-art/MyjantespwaV6.git 2>/dev/null || true
git branch -M main
git push -u origin main || true

# --- 7️⃣ Railway deploy + création BDD ---
if ! command -v railway &> /dev/null; then npm install -g @railway/cli; fi
railway init --yes || true
railway link || true
railway variables set SESSION_SECRET=$(openssl rand -hex 16)
railway variables set PORT=3000
railway add plugin postgresql || true
DB_URL=$(railway variables get DATABASE_URL | tail -n 1)
export DATABASE_URL="$DB_URL"
echo "📌 DATABASE_URL configurée : $DATABASE_URL"

# --- 8️⃣ Migrations Drizzle ---
npx drizzle-kit generate:pg --schema $SCHEMA_FILE --out $MIGRATIONS_DIR || true
npx drizzle-kit migrate:up --schema $SCHEMA_FILE --out $MIGRATIONS_DIR

# --- 9️⃣ Deployment Railway final ---
railway up --service MyJantes

echo "✅ Railway Complete Deployment terminé !"
echo "🌐 URL Railway : $(railway url)"cd $FRONTEND_DIR
npm install
npm run build
cd ..

# --- 5️⃣ Backend sécurisé + production-ready ---
echo "⚙️ Création server.js Production-Ready..."
cat > server.js <<'EOL'
import express from "express";
import session from "express-session";
import pg from "pg";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./shared/schema";
import path from "path";
import winston from "winston";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// --- Logging production ---
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// --- Sécurité & performance ---
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());

// --- PostgreSQL + Drizzle ---
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// --- Sessions sécurisées ---
const PgSession = connectPgSimple(session);
app.set("trust proxy", 1);
app.use(session({
  store: new PgSession({ pool }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, sameSite: "none", maxAge: 7*24*60*60*1000 }
}));

// --- Passport Google OAuth ---
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const existingUser = await db.query.users.findFirst({ where: { googleId: profile.id } });
    if (!existingUser) {
      const [newUser] = await db.insert(schema.users).values({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value || ""
      }).returning();
      return done(null, newUser);
    }
    return done(null, existingUser);
  } catch (err) { done(err); }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
app.use(passport.initialize());
app.use(passport.session());

// --- Middleware Auth + refresh automatique ---
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    // refresh session
    req.session.touch();
    return next();
  }
  if (req.originalUrl.startsWith("/api")) return res.status(401).json({ error: "Non authentifié" });
  return res.redirect("/login");
};

// --- HTTPS forced ---
app.use((req, res, next) => {
  if (req.headers["x-forwarded-proto"] !== "https") return res.redirect(`https://${req.headers.host}${req.url}`);
  next();
});

// --- Routes Auth ---
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), (req, res) => res.redirect("/dashboard"));
app.get("/logout", (req, res) => req.logout(() => res.redirect("/login")));
app.get("/api/profile", isAuthenticated, (req, res) => res.json({ user: req.user }));

// --- Dashboard Admin (notifications temps réel) ---
let notifications = [];
app.get("/dashboard", isAuthenticated, (req, res) => {
  res.send(`<h1>Dashboard Admin MyJantes V6 PRO+ Production</h1>
            <p>Notifications en temps réel: ${JSON.stringify(notifications)}</p>`);
});

// --- Serve frontend build ---
app.use(express.static(path.join(process.cwd(), "client/dist")));
app.get("*", (req, res) => res.sendFile(path.join(process.cwd(), "client/dist/index.html")));

// --- WebSocket notifications temps réel ---
const server = app.listen(PORT, () => logger.info(`✅ Serveur MyJantes PRO+ actif sur port ${PORT}`));
const wss = new WebSocketServer({ server });
wss.on("connection", ws => {
  logger.info("🔌 Nouvelle connexion WebSocket");
  ws.send(JSON.stringify({ event: "connected", message: "Bienvenue dans MyJantes V6 PRO+ 🚗" }));

  ws.on("message", msg => {
    const data = JSON.parse(msg.toString());
    notifications.push(data);
    // broadcast à tous
    wss.clients.forEach(client => client.readyState === 1 && client.send(JSON.stringify(data)));
  });
});
EOL

# --- 6️⃣ Git push ---
git add .
git commit -m "Déploiement Production-Ready MyJantes V6 PRO+" || true
git push origin main

# --- 7️⃣ Railway deploy ---
if ! command -v railway &> /dev/null; then npm install -g @railway/cli; fi
railway init --yes || true
railway link || true
railway variables set SESSION_SECRET=$(openssl rand -hex 16)
railway variables set PORT=3000
railway add plugin postgresql || true
DB_URL=$(railway variables get DATABASE_URL | tail -n 1)
railway variables set DATABASE_URL="$DB_URL"

# --- 8️⃣ Migrations Drizzle ---
export DATABASE_URL="$DB_URL"
npx drizzle-kit generate:pg --schema $SCHEMA_FILE --out $MIGRATIONS_DIR || true
npx drizzle-kit migrate:up --schema $SCHEMA_FILE --out $MIGRATIONS_DIR

# --- 9️⃣ Deployment Railway final ---
railway up --service MyJantes

echo "✅ Déploiement Production-Ready PRO+ terminé !"
echo "🌐 URL Railway : $(railway url)"