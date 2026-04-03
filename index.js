const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ROOT
app.get("/", (req, res) => res.send("RPG ONLINE 🚀"));
app.get("/health", (req, res) => res.send("OK"));

// ================= DATABASE =================
const DB_FILE = "./db.json";
let db = {};

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE));
    } else {
      fs.writeFileSync(DB_FILE, "{}");
      db = {};
    }
  } catch {
    db = {};
  }
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

loadDB();

function getUser(id) {
  if (!db[id]) {
    db[id] = {
      uang: 1000,
      inv: { benih: 0 },
      tanamTime: 0
    };
  }
  return db[id];
}

// ================= RESPONSE =================
function send(res, msg) {
  res.type("text/xml");
  res.send(`<Response><Message>${msg}</Message></Response>`);
}

// ================= WEBHOOK =================
app.post("/webhook", (req, res) => {
  try {
    let msg = (req.body.Body || "").toLowerCase();
    let id = req.body.From;

    let u = getUser(id);
    let r = "";

    // ===== MENU =====
    if (msg === "main") {
      r = `🎮 RPG FARM
💰 ${u.uang}

📜 Menu:
🛒 shop
🌱 tanam
🌾 panen`;
    }

    // ===== SHOP =====
    else if (msg === "shop") {
      r = `🛒 SHOP
🌱 benih = 100

Ketik:
beli benih`;
    }

    // ===== BELI =====
    else if (msg === "beli benih") {
      if (u.uang < 100) return send(res, "💸 uang kurang");

      u.uang -= 100;
      u.inv.benih++;
      r = "🌱 berhasil beli benih";
    }

    // ===== TANAM =====
    else if (msg === "tanam") {
      if (u.inv.benih <= 0) {
        return send(res, "❌ tidak punya benih");
      }

      u.inv.benih--;
      u.tanamTime = Date.now();
      r = "🌱 menanam...";
    }

    // ===== PANEN =====
    else if (msg === "panen") {
      if (!u.tanamTime) {
        return send(res, "❌ belum tanam");
      }

      if (Date.now() - u.tanamTime < 10000) {
        return send(res, "⏳ belum siap");
      }

      u.uang += 200;
      u.tanamTime = 0;
      r = "🌾 panen berhasil +200";
    }

    // ===== DEFAULT =====
    else {
      r = "❓ ketik main";
    }

    saveDB();
    send(res, r);

  } catch (err) {
    console.log(err);
    send(res, "😵 error");
  }
});

// RUN
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});
