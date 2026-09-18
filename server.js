const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const webpush = require("web-push");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(process.env.DB_PATH || path.join(__dirname, "punitions.db"));

db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  classe TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS punishments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  motif TEXT NOT NULL,
  date TEXT NOT NULL,
  duree TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT UNIQUE NOT NULL,
  subscription_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

function env(name) {
  return process.env[name] || "";
}

let vapidReady = false;
if (env("VAPID_PUBLIC_KEY") && env("VAPID_PRIVATE_KEY") && env("VAPID_SUBJECT")) {
  webpush.setVapidDetails(env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
  vapidReady = true;
}

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (_, res) => {
  res.json({ vapidPublicKey: env("VAPID_PUBLIC_KEY"), pushConfigured: vapidReady });
});

app.get("/api/students", (_, res) => {
  const students = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM punishments p WHERE p.student_id=s.id) AS punishment_count
    FROM students s ORDER BY LOWER(s.nom), LOWER(s.prenom)
  `).all();
  res.json(students);
});

app.get("/api/punishments", (_, res) => {
  const rows = db.prepare(`
    SELECT p.*, s.nom, s.prenom, s.classe
    FROM punishments p JOIN students s ON s.id=p.student_id
    ORDER BY p.date DESC, p.id DESC
  `).all();
  res.json(rows);
});

app.post("/api/students", (req, res) => {
  const nom = String(req.body.nom || "").trim();
  const prenom = String(req.body.prenom || "").trim();
  const classe = String(req.body.classe || "").trim();
  if (!nom || !prenom || !classe) return res.status(400).json({error:"Nom, prénom et classe sont obligatoires."});
  const info = db.prepare("INSERT INTO students(nom,prenom,classe) VALUES(?,?,?)").run(nom, prenom, classe);
  res.json({id: info.lastInsertRowid, nom, prenom, classe});
});

app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const nom = String(req.body.nom || "").trim();
  const prenom = String(req.body.prenom || "").trim();
  const classe = String(req.body.classe || "").trim();
  if (!id || !nom || !prenom || !classe) return res.status(400).json({error:"Données invalides."});
  db.prepare("UPDATE students SET nom=?, prenom=?, classe=? WHERE id=?").run(nom, prenom, classe, id);
  res.json({ok:true});
});

app.delete("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM punishments WHERE student_id=?").run(id);
  db.prepare("DELETE FROM students WHERE id=?").run(id);
  res.json({ok:true});
});

app.post("/api/punishments", async (req, res) => {
  const studentId = Number(req.body.student_id);
  const type = String(req.body.type || "").trim();
  const motif = String(req.body.motif || "").trim();
  const date = String(req.body.date || "").trim();
  const duree = String(req.body.duree || "").trim();
  if (!studentId || !type || !motif || !date) return res.status(400).json({error:"Élève, type, motif et date sont obligatoires."});

  const student = db.prepare("SELECT * FROM students WHERE id=?").get(studentId);
  if (!student) return res.status(404).json({error:"Élève introuvable."});

  const info = db.prepare("INSERT INTO punishments(student_id,type,motif,date,duree) VALUES(?,?,?,?,?)")
    .run(studentId, type, motif, date, duree);

  const punishment = {id: info.lastInsertRowid, student_id:studentId, type, motif, date, duree,
    nom:student.nom, prenom:student.prenom, classe:student.classe};

  const payload = JSON.stringify({
    title: "Nouvelle punition — Punitions ISL",
    body: `${student.prenom} ${student.nom} • ${type}`,
    data: { punishmentId: punishment.id }
  });

  if (vapidReady) {
    const subscriptions = db.prepare("SELECT * FROM push_subscriptions").all();
    await Promise.all(subscriptions.map(async s => {
      try { await webpush.sendNotification(JSON.parse(s.subscription_json), payload); }
      catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          db.prepare("DELETE FROM push_subscriptions WHERE id=?").run(s.id);
        }
      }
    }));
  }
  res.json(punishment);
});

app.put("/api/punishments/:id", (req,res) => {
  const id=Number(req.params.id);
  const studentId=Number(req.body.student_id);
  const type=String(req.body.type||"").trim();
  const motif=String(req.body.motif||"").trim();
  const date=String(req.body.date||"").trim();
  const duree=String(req.body.duree||"").trim();
  if(!id||!studentId||!type||!motif||!date) return res.status(400).json({error:"Données invalides."});
  db.prepare("UPDATE punishments SET student_id=?,type=?,motif=?,date=?,duree=? WHERE id=?")
    .run(studentId,type,motif,date,duree,id);
  res.json({ok:true});
});

app.delete("/api/punishments/:id",(req,res)=>{
  db.prepare("DELETE FROM punishments WHERE id=?").run(Number(req.params.id));
  res.json({ok:true});
});

app.post("/api/push/subscribe",(req,res)=>{
  const sub=req.body;
  if(!sub || !sub.endpoint) return res.status(400).json({error:"Subscription invalide."});
  db.prepare("INSERT INTO push_subscriptions(endpoint,subscription_json) VALUES(?,?) ON CONFLICT(endpoint) DO UPDATE SET subscription_json=excluded.subscription_json")
    .run(sub.endpoint, JSON.stringify(sub));
  res.json({ok:true});
});

app.get("/api/push/status",(req,res)=>{
  res.json({configured:vapidReady, subscribers:db.prepare("SELECT COUNT(*) n FROM push_subscriptions").get().n});
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname,"public","index.html"));
});

app.listen(PORT,()=>console.log(`Punitions ISL lancé sur le port ${PORT}`));
