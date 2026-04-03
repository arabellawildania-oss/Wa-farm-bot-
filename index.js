const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ROOT
app.get("/", (req, res) => res.send("🌾 RPG ONLINE 🚀"));
app.get("/health", (req, res) => res.send("OK"));

// ================= DATABASE =================
const DB_FILE = "./db.json";
let db = {};

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8") || "{}");
    } else {
      fs.writeFileSync(DB_FILE, "{}");
      db = {};
    }
  } catch {
    db = {};
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.log("SAVE ERROR:", e);
  }
}

loadDB();

// ================= USER =================
function getUser(id) {
  if (!db[id]) {
    db[id] = {
      uang: 1000,
      exp: 0,
      level: 1,
      inv: { benih: 0 },
      ternak: 0,
      lastDaily: 0,
      tanamTime: 0
    };
  }
  return db[id];
}

// ================= SYSTEM =================
function addExp(u, amount) {
  u.exp += amount;
  let need = u.level * 100;

  if (u.exp >= need) {
    u.level++;
    u.exp = 0;
    return "🎉 LEVEL UP!";
  }
  return "";
}

function cuaca() {
  const jam = new Date().getHours();
  if (jam < 12) return "🌤️ Pagi";
  if (jam < 18) return "☀️ Siang";
  return "🌙 Malam";
}

function isPagi() {
  let jam = new Date().getHours();
  return jam >= 5 && jam <= 10;
}

function isFestival() {
  return new Date().getDay() === 0;
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

    // MENU
    if (msg === "main") {
      r = `🎮 RPG FARM
👤 Lv ${u.level} | EXP ${u.exp}
💰 ${u.uang}
🌦️ ${cuaca()}

📜 Menu:
🛒 shop
🌱 tanam
🌾 panen
🎣 mancing
⛏️ mining
🎰 gacha
🕶️ maling
💰 jualgelap
🌅 pasarpagi
🎉 festival
📊 status`;

    // SHOP
    else if (msg === "shop") {
      r = `🛒 SHOP
🌱 benih = 100
🐄 sapi = 800
🎣 pancing = 500
⛏️ pickaxe = 700`;

    else if (msg === "beli benih") {
      if (u.uang < 100) return send(res, "💸 kurang");
      u.uang -= 100;
      u.inv.benih++;
      r = "🌱 beli benih";

    // TANAM
    else if (msg === "tanam") {
      if (!u.inv.benih) return send(res, "❌ tidak ada benih");
      u.inv.benih--;
      u.tanamTime = Date.now();
      r = "🌱 menanam...";

    else if (msg === "panen") {
      if (!u.tanamTime) return send(res, "❌ belum tanam");

      if (Date.now() - u.tanamTime < 60000)
        return send(res, "⏳ belum siap");

      let hasil = Math.floor(Math.random() * 10) + u.level;
      let bonus = "";

      if (Math.random() < 0.1) {
        u.uang += 500;
        bonus = "\n💎 SECRET BONUS!";
      }

      u.uang += hasil * 50;
      u.tanamTime = 0;

      r = `🌾 panen ${hasil}\n💰 +${hasil * 50}${bonus}\n${addExp(u, 20)}`;
    }

    // 🎣 MANCING
    else if (msg === "mancing") {
      let rand = Math.random();

      if (rand < 0.5) {
        r = `🎣 Strike! 🐟\n${addExp(u, 10)}`;
      } else if (rand < 0.9) {
        r = "🗑️ sampah 😭";
      } else {
        u.uang += 1000;
        r = `💎 TREASURE +1000!\n${addExp(u, 50)}`;
      }
    }

    // ⛏️ MINING
    else if (msg === "mining") {
      let rand = Math.random();

      if (rand < 0.6) {
        r = `🪨 batu\n${addExp(u, 10)}`;
      } else if (rand < 0.9) {
        u.uang += 200;
        r = `⛓️ besi +200\n${addExp(u, 20)}`;
      } else {
        u.uang += 1500;
        r = `💎 RELIC +1500\n${addExp(u, 60)}`;
      }
    }

    // 🎰 GACHA
    else if (msg === "gacha") {
      if (u.uang < 200) return send(res, "💸 kurang");

      u.uang -= 200;

      if (Math.random() < 0.1) {
        u.uang += 2000;
        r = "🌟 JACKPOT +2000!";
      } else {
        r = "💀 zonk";
      }
    }

    // 🕶️ MALING
    else if (msg === "maling") {
      let rand = Math.random();

      if (rand < 0.5) {
        u.inv.barang = (u.inv.barang || 0) + 1;
        r = "🕶️ barang gelap...";
      } else if (rand < 0.8) {
        u.inv.relic = (u.inv.relic || 0) + 1;
        r = "💎 RELIC!";
      } else {
        u.uang -= 300;
        r = "🚨 ketangkep! -300";
      }
    }

    // 💰 JUAL GELAP
    else if (msg === "jualgelap") {
      let total = 0;

      if (u.inv.barang) {
        total += u.inv.barang * 200;
        u.inv.barang = 0;
      }

      if (u.inv.relic) {
        total += u.inv.relic * 1000;
        u.inv.relic = 0;
      }

      if (total === 0) return send(res, "❌ kosong");

      if (Math.random() < 0.3) {
        total *= 2;
        r = `💰 DEAL x2\n+${total}`;
      } else {
        r = `💰 jual gelap\n+${total}`;
      }

      u.uang += total;
    }

    // 🌅 PASAR PAGI
    else if (msg === "pasarpagi") {
      if (!isPagi()) return send(res, "🌙 tutup");
      u.uang += 300;
      r = "🌅 bonus +300";
    }

    // 🎉 FESTIVAL
    else if (msg === "festival") {
      if (!isFestival()) return send(res, "📅 belum");
      u.uang += 1000;
      r = "🎉 FESTIVAL +1000!";
    }

    // STATUS
    else if (msg === "status") {
      r = `📊 STATUS
Lv ${u.level}
EXP ${u.exp}
💰 ${u.uang}`;
    }

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

// AUTO SAVE
setInterval(() => {
  saveDB();
  console.log("💾 autosave...");
}, 30000);

// RUN
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 jalan " + PORT);
});
