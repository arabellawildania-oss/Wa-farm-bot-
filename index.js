const express = require("express");
const fs = require("fs");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ROOT
app.get("/", (req, res) => {
  res.send("Server hidup 🚀");
});

// WEBHOOK TEST
// TEST
app.get("/webhook", (req, res) => {
  res.send("Webhook ready ✅");
});

// WEBHOOK UTAMA (INI SAJA)
app.post("/webhook", (req, res) => {
  let msg = (req.body.Body || "").toLowerCase();

  let reply = "Halo";

  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${reply}</Message></Response>`);
});

// DATABASE
let db = {};
try {
  db = JSON.parse(fs.readFileSync("db.json"));
} catch {
  db = {};
}

function save() {
  fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

function user(id) {
  if (!db[id]) {
    db[id] = {
      uang: 1000,
      inv: {},
      ternak: 0,
      vip: false,
      lastDaily: 0
    };
  }
  return db[id];
}

// WEBHOOK
app.post("/webhook", (req, res) => {
  let msg = (req.body.Body || "").toLowerCase();
  let id = req.body.From;

  let u = user(id);
  let r = "";

  if (msg === "main") {
    r = `🌾 FARM GAME\n💰 ${u.uang}\n\nPerintah:\ntanam\nternak\ntas\njual\ndaily\ngacha`;
  } else if (msg === "tanam") {
    let hasil = Math.floor(Math.random() * 10) + 5;
    u.inv.padi = (u.inv.padi || 0) + hasil;
    r = `🌱 Panen ${hasil}`;
  } else if (msg === "ternak") {
    u.ternak++;
    r = "🐄 Beli sapi";
  } else if (msg === "tas") {
    r = JSON.stringify(u.inv);
  } else if (msg === "jual") {
    let uang = (u.inv.padi || 0) * 100;
    u.uang += uang;
    u.inv.padi = 0;
    r = `💰 ${uang}`;
  } else if (msg === "daily") {
    if (Date.now() - u.lastDaily < 86400000) {
      return send(res, "⏳ Sudah claim");
    }
    u.uang += 500;
    u.lastDaily = Date.now();
    r = "🎁 +500";
  } else if (msg === "gacha") {
    if (Math.random() < 0.3) {
      u.vip = true;
      r = "🌟 Dapat VIP!";
    } else {
      u.uang -= 100;
      r = "💀 Zonk -100";
    }
  } else {
    r = "❓ ketik main";
  }

  save();
  send(res, r);
});

// RESPONSE
function send(res, msg) {
  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${msg}</Message></Response>`);
}

// RUN
app.listen(process.env.PORT || 3000, () => {
  console.log("Server jalan 🚀");
});
