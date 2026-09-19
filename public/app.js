const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const webpush = require("web-push");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Base de données
const dbPath =
  process.env.DB_PATH || path.join(__dirname, "punitions.db");

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

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
  return String(process.env[name] || "").trim();
}

// Notifications Web Push
let vapidReady = false;

const vapidPublicKey = env("VAPID_PUBLIC_KEY");
const vapidPrivateKey = env("VAPID_PRIVATE_KEY");
const vapidSubject = env("VAPID_SUBJECT");

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  try {
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    vapidReady = true;
    console.log("Web Push : configuré");
  } catch (error) {
    console.error("Erreur configuration Web Push :", error.message);
  }
} else {
  console.log(
    "Web Push : non configuré (variables VAPID absentes)"
  );
}

// Middleware
app.use(express.json({ limit: "100kb" }));

app.use(
  express.static(path.join(__dirname, "public"))
);

// =========================
// CONFIGURATION
// =========================

app.get("/api/config", (req, res) => {
  res.json({
    vapidPublicKey,
    pushConfigured: vapidReady
  });
});

// =========================
// ÉLÈVES
// =========================

app.get("/api/students", (req, res) => {
  try {
    const students = db
      .prepare(`
        SELECT
          s.*,
          (
            SELECT COUNT(*)
            FROM punishments p
            WHERE p.student_id = s.id
          ) AS punishment_count
        FROM students s
        ORDER BY LOWER(s.nom), LOWER(s.prenom)
      `)
      .all();

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible de récupérer les élèves."
    });
  }
});

app.post("/api/students", (req, res) => {
  try {
    const nom = String(req.body?.nom || "").trim();
    const prenom = String(req.body?.prenom || "").trim();
    const classe = String(req.body?.classe || "").trim();

    if (!nom || !prenom || !classe) {
      return res.status(400).json({
        error: "Nom, prénom et classe sont obligatoires."
      });
    }

    const info = db
      .prepare(
        "INSERT INTO students(nom, prenom, classe) VALUES (?, ?, ?)"
      )
      .run(nom, prenom, classe);

    res.json({
      id: info.lastInsertRowid,
      nom,
      prenom,
      classe
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible d'ajouter l'élève."
    });
  }
});

app.put("/api/students/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const nom = String(req.body?.nom || "").trim();
    const prenom = String(req.body?.prenom || "").trim();
    const classe = String(req.body?.classe || "").trim();

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID élève invalide."
      });
    }

    if (!nom || !prenom || !classe) {
      return res.status(400).json({
        error: "Nom, prénom et classe sont obligatoires."
      });
    }

    const result = db
      .prepare(
        `
        UPDATE students
        SET nom = ?, prenom = ?, classe = ?
        WHERE id = ?
        `
      )
      .run(nom, prenom, classe, id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Élève introuvable."
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible de modifier l'élève."
    });
  }
});

app.delete("/api/students/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID élève invalide."
      });
    }

    const result = db
      .prepare("DELETE FROM students WHERE id = ?")
      .run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Élève introuvable."
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible de supprimer l'élève."
    });
  }
});

// =========================
// PUNITIONS
// =========================

app.get("/api/punishments", (req, res) => {
  try {
    const rows = db
      .prepare(`
        SELECT
          p.*,
          s.nom,
          s.prenom,
          s.classe
        FROM punishments p
        JOIN students s
          ON s.id = p.student_id
        ORDER BY p.date DESC, p.id DESC
      `)
      .all();

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible de récupérer les punitions."
    });
  }
});

app.post("/api/punishments", async (req, res) => {
  try {
    const studentId = Number(req.body?.student_id);
    const type = String(req.body?.type || "").trim();
    const motif = String(req.body?.motif || "").trim();
    const date = String(req.body?.date || "").trim();
    const duree = String(req.body?.duree || "").trim();

    if (
      !Number.isInteger(studentId) ||
      studentId <= 0 ||
      !type ||
      !motif ||
      !date
    ) {
      return res.status(400).json({
        error:
          "Élève, type, motif et date sont obligatoires."
      });
    }

    const student = db
      .prepare("SELECT * FROM students WHERE id = ?")
      .get(studentId);

    if (!student) {
      return res.status(404).json({
        error: "Élève introuvable."
      });
    }

    const info = db
      .prepare(
        `
        INSERT INTO punishments
          (student_id, type, motif, date, duree)
        VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(
        studentId,
        type,
        motif,
        date,
        duree
      );

    const punishment = {
      id: info.lastInsertRowid,
      student_id: studentId,
      type,
      motif,
      date,
      duree,
      nom: student.nom,
      prenom: student.prenom,
      classe: student.classe
    };

    // Notification
    if (vapidReady) {
      const payload = JSON.stringify({
        title: "Nouvelle punition — Punitions ISL",
        body: `${student.prenom} ${student.nom} • ${type}`,
        data: {
          punishmentId: punishment.id
        }
      });

      const subscriptions = db
        .prepare("SELECT * FROM push_subscriptions")
        .all();

      await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            await webpush.sendNotification(
              JSON.parse(subscription.subscription_json),
              payload
            );
          } catch (error) {
            console.error(
              "Erreur notification :",
              error.message
            );

            if (
              error.statusCode === 404 ||
              error.statusCode === 410
            ) {
              db.prepare(
                "DELETE FROM push_subscriptions WHERE id = ?"
              ).run(subscription.id);
            }
          }
        })
      );
    }

    res.json(punishment);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible d'ajouter la punition."
    });
  }
});

app.put("/api/punishments/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const studentId = Number(req.body?.student_id);

    const type = String(req.body?.type || "").trim();
    const motif = String(req.body?.motif || "").trim();
    const date = String(req.body?.date || "").trim();
    const duree = String(req.body?.duree || "").trim();

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !Number.isInteger(studentId) ||
      studentId <= 0 ||
      !type ||
      !motif ||
      !date
    ) {
      return res.status(400).json({
        error: "Données invalides."
      });
    }

    const student = db
      .prepare("SELECT id FROM students WHERE id = ?")
      .get(studentId);

    if (!student) {
      return res.status(404).json({
        error: "Élève introuvable."
      });
    }

    const result = db
      .prepare(
        `
        UPDATE punishments
        SET
          student_id = ?,
          type = ?,
          motif = ?,
          date = ?,
          duree = ?
        WHERE id = ?
        `
      )
      .run(
        studentId,
        type,
        motif,
        date,
        duree,
        id
      );

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Punition introuvable."
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible de modifier la punition."
    });
  }
});

app.delete("/api/punishments/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID punition invalide."
      });
    }

    const result = db
      .prepare("DELETE FROM punishments WHERE id = ?")
      .run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Punition introuvable."
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible de supprimer la punition."
    });
  }
});

// =========================
// NOTIFICATIONS PUSH
// =========================

app.post("/api/push/subscribe", (req, res) => {
  try {
    const sub = req.body;

    if (!sub || !sub.endpoint) {
      return res.status(400).json({
        error: "Subscription invalide."
      });
    }

    db.prepare(
      `
      INSERT INTO push_subscriptions
        (endpoint, subscription_json)
      VALUES (?, ?)
      ON CONFLICT(endpoint)
      DO UPDATE SET
        subscription_json = excluded.subscription_json
      `
    ).run(
      sub.endpoint,
      JSON.stringify(sub)
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible d'enregistrer la notification."
    });
  }
});

app.get("/api/push/status", (req, res) => {
  try {
    const result = db
      .prepare(
        "SELECT COUNT(*) AS n FROM push_subscriptions"
      )
      .get();

    res.json({
      configured: vapidReady,
      subscribers: result.n
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible de récupérer le statut Push."
    });
  }
});

// =========================
// PAGE PRINCIPALE
// =========================

// IMPORTANT : cette syntaxe fonctionne avec les versions
// récentes d'Express et évite le problème de app.get("*").
app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// Gestionnaire d'erreurs
app.use((err, req, res, next) => {
  console.error("Erreur serveur :", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: "Erreur interne du serveur."
  });
});

// Démarrage
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Punitions ISL lancé sur le port ${PORT}`
  );
});
