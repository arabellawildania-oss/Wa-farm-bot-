const express = require("express");
const fs = require("fs");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = 3000;
const TOKEN = "ISI_TOKEN_KAMU";

// ===== DATABASE =====
const DB = "./db.json";

function loadDB() {
  if (!fs.existsSync(DB)) {
    fs.writeFileSync(DB, JSON.stringify({ users: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB));
}

function saveDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// ===== DATA =====
const crops = {
  turnip: { buy: 5, sell: 7, time: 60000, exp: 10 },
  tomato: { buy: 8, sell: 12, time: 120000, exp: 15 },
  corn: { buy: 10, sell: 15, time: 180000, exp: 20 },
};

// ===== USER =====
function createUser() {
  return {
    level: 1,
    exp: 0,
    saldo: 100,
    energi: 10,
    inventory: {},
    farming: [],
  };
}

// ===== GAME =====
function handleGame(id, msg) {
  let db = loadDB();

  if (!db.users[id]) {
    db.users[id] = createUser();
    saveDB(db);
    return "🌾 Selamat datang di Harvest Moon: Back to Desa!\nKetik: desa info";
  }

  let user = db.users[id];

  if (msg === "desa info") {
    return `🌾 HARVEST MOON: BACK TO DESA

Level: ${user.level}
Saldo: ${user.saldo}
Energi: ${user.energi}

Menu:
desa pasar
desa tanam <item>
desa panen`;
  }

  if (msg === "desa pasar") {
    let teks = "🛒 PASAR\n";
    for (let i in crops) {
      teks += `${i} - ${crops[i].buy}\n`;
    }
    return teks;
  }

  if (msg.startsWith("desa tanam")) {
    let nama = msg.split(" ")[2];

    if (!crops[nama]) return "❌ Tanaman tidak ada";

    user.farming.push({ nama, waktu: Date.now() });
    saveDB(db);

    return "🌱 Menanam " + nama;
  }

  if (msg === "desa panen") {
    let now = Date.now();
    let hasil = 0;

    user.farming = user.farming.filter((t) => {
      let c = crops[t.nama];
      if (now - t.waktu >= c.time) {
        hasil += c.sell;
        return false;
      }
      return true;
    });

    if (hasil === 0) return "⏳ Belum siap panen";

    user.saldo += hasil;
    saveDB(db);

    return "🌾 Panen berhasil + " + hasil;
  }

  return "❓ Perintah tidak dikenal";
}

// ===== WEBHOOK =====
app.post("/webhook", async (req, res) => {
  const sender = req.body.sender;
  const msg = req.body.message?.toLowerCase() || "";

  const reply = handleGame(sender, msg);

  await axios.post(
    "https://api.fonnte.com/send",
    {
      target: sender,
      message: reply,
    },
    {
      headers: {
        Authorization: TOKEN,
      },
    }
  );

  res.send("OK");
});

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("🌾 HARVEST MOON BOT AKTIF");
});

app.listen(PORT, () => {
  console.log("Server jalan");
});
