const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= ROOT =================
app.get("/", (req, res) => res.send("🌾 RPG FARM ONLINE 🚀"));
app.get("/health", (req, res) => res.send("OK"));

// ================= DATABASE =================
const DB_FILE = "./db.json";
let db = {};

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE)) || {};
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

// ================= USER =================
function getUser(id) {
  if (!db[id]) {
    db[id] = {
      uang: 1000,
      exp: 0,
      level: 1,
      inv: {},
      tanam: null
    };
  }
  return db[id];
}

// ================= TANAMAN =================
const tanaman = {
  padi: { harga: 100, waktu: 10000, hasil: 200 },
  jagung: { harga: 200, waktu: 15000, hasil: 400 },
  wortel: { harga: 300, waktu: 8000, hasil: 500 },
  tomat: { harga: 400, waktu: 20000, hasil: 800 },
  strawberry: { harga: 800, waktu: 30000, hasil: 1500 }
};

// ================= SYSTEM =================
function addExp(u, amount) {
  u.exp += amount;
  if (u.exp >= u.level * 100) {
    u.level++;
    u.exp = 0;
    return "✨ LEVEL UP!";
  }
  return "";
}

function cuaca() {
  let jam = new Date().getHours();
  if (jam < 12) return "🌤️ Pagi";
  if (jam < 18) return "🌇 Sore";
  return "🌙 Malam";
}

function header(t) {
  return `🎮 ${t}\n━━━━━━━━━━━━━━━`;
}

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
      r = `${header("RPG FARM")}

👤 Lv ${u.level} | EXP ${u.exp}
💰 ${u.uang}
${cuaca()}

📜 Menu:
🛒 shop
🌱 tanam [tanaman]
🌾 panen
🎣 mancing
⛏️ mining
🎰 gacha
🕶️ maling
🎒 tas
📊 status`;
    }

    // SHOP
    else if (msg === "shop") {
      r = `${header("TOKO")}

🌾 padi = 100
🌽 jagung = 200
🥕 wortel = 300
🍅 tomat = 400
🍓 strawberry = 800

ketik: beli padi`;
    }

    // BELI
    else if (msg.startsWith("beli")) {
      let item = msg.split(" ")[1];

      if (!tanaman[item]) return send(res, "❌ tidak ada");

      let harga = tanaman[item].harga;
      if (u.uang < harga) return send(res, "💸 kurang");

      u.uang -= harga;
      u.inv[item] = (u.inv[item] || 0) + 1;

      r = `🌱 beli ${item}`;
    }

    // TANAM
    else if (msg.startsWith("tanam")) {
      let item = msg.split(" ")[1];

      if (!tanaman[item]) return send(res, "❌ tidak ada");
      if (!u.inv[item]) return send(res, "❌ tidak punya");

      u.inv[item]--;
      u.tanam = { jenis: item, waktu: Date.now() };

      r = `🌱 menanam ${item}...`;
    }

    // PANEN
    else if (msg === "panen") {
      if (!u.tanam) return send(res, "❌ belum tanam");

      let data = tanaman[u.tanam.jenis];

      if (Date.now() - u.tanam.waktu < data.waktu) {
        return send(res, "⏳ belum siap");
      }

      let bonus = 1;
      let jam = new Date().getHours();
      if (jam >= 6 && jam <= 9) bonus = 1.5;

      let hasil = Math.floor((data.hasil + Math.random() * 100) * bonus);

      if (Math.random() < 0.1) {
        hasil += 500;
        r += "\n💎 BONUS LANGKA!";
      }

      u.uang += hasil;
      let up = addExp(u, 20);

      r = `${header("PANEN")}

🌾 ${u.tanam.jenis}
💰 +${hasil}
${up}`;

      u.tanam = null;
    }

    // MANCING
    else if (msg === "mancing") {
      let rand = Math.random();

      r = `${header("MANCING")}

🎣 Menunggu...`;

      if (rand < 0.5) {
        u.uang += 200;
        r += "\n🐟 ikan +200";
      } else if (rand < 0.85) {
        r += "\n💀 sampah";
      } else {
        u.uang += 700;
        r += "\n🐋 LEGENDARY +700";
      }
    }

    // MINING
    else if (msg === "mining") {
      let rand = Math.random();

      if (rand < 0.7) {
        u.uang += 150;
        r = "⛏ batu +150";
      } else {
        u.uang += 500;
        r = "💎 diamond +500";
      }
    }

    // GACHA
    else if (msg === "gacha") {
      if (u.uang < 200) return send(res, "💸 kurang");

      u.uang -= 200;

      if (Math.random() < 0.1) {
        u.uang += 2000;
        r = "🌟 JACKPOT +2000";
      } else {
        r = "💀 zonk";
      }
    }

    // MALING
    else if (msg === "maling") {
      if (Math.random() < 0.5) {
        u.uang += 300;
        r = "🕶️ sukses +300";
      } else {
        u.uang -= 200;
        r = "🚨 ketangkep -200";
      }
    }

    // TAS
    else if (msg === "tas") {
      r = `${header("INVENTORY")}

${JSON.stringify(u.inv, null, 2)}`;
    }

    // STATUS
    else if (msg === "status") {
      r = `${header("STATUS")}

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

// RUN
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 jalan " + PORT);
});
