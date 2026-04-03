const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= ROOT =================
app.get("/", (req, res) => res.send("🌾 RPG FARM ONLINE"));
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

// ================= SYSTEM =================
function narasi(type, text) {
  const garis = "━━━━━━━━━━━━━━━";
  const icon = {
    info: "📜",
    sukses: "✅",
    error: "❌",
    proses: "⏳",
    hasil: "🎉"
  };
  return `${icon[type] || "🎮"} ${garis}
${text}
${garis}`;
}

function hariSekarang() {
  return Math.floor(Date.now() / 86400000);
}

function cuaca() {
  const list = ["☀️ Cerah", "🌧 Hujan", "🌥 Mendung", "🌪 Angin"];
  return list[new Date().getHours() % list.length];
}

// ================= DATA =================
const tanaman = {
  jagung: { harga: 100, hari: 2, hasil: 300 },
  padi: { harga: 150, hari: 3, hasil: 500 },
  wortel: { harga: 200, hari: 2, hasil: 600 },
  tomat: { harga: 300, hari: 4, hasil: 900 },
  strawberry: { harga: 500, hari: 5, hasil: 1500 },
  apel: { harga: 800, hari: 6, hasil: 2500 }
};

const beratItem = {
  padi: 1,
  jagung: 1.2,
  wortel: 0.8,
  tomat: 0.7,
  strawberry: 0.3,
  apel: 1.5
};

// ================= USER =================
function getUser(id) {
  if (!db[id]) {
    db[id] = {
      uang: 1000,
      inv: {},
      tanam: null,
      kapasitas: 100,
      gender: null,
      nama: null,
      ternak: { sapi: 0, kenyang: 0 }
    };
  }
  return db[id];
}

// ================= BERAT =================
function totalBerat(inv) {
  let total = 0;
  for (let i in inv) {
    total += (beratItem[i] || 1) * inv[i];
  }
  return total;
}

function bisaBawa(u, item, jumlah) {
  return totalBerat(u.inv) + jumlah * (beratItem[item] || 1) <= u.kapasitas;
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

    // ===== SETUP PLAYER =====
    if (!u.gender || !u.nama) {
      if (msg.startsWith("pilih")) {
        let g = msg.split(" ")[1];
        u.gender = g;
        return send(res, narasi("sukses", `Gender dipilih: ${g}`));
      }
      if (msg.startsWith("nama")) {
        u.nama = msg.slice(5);
        return send(res, narasi("sukses", `Nama: ${u.nama}`));
      }

      return send(res, narasi("info",
`🎮 SELAMAT DATANG

pilih gender:
pilih cowok / cewek

buat nama:
nama kamu`));
    }

    // ===== MENU =====
    if (msg === "main") {
      r = narasi("info",
`👤 ${u.nama}
💰 ${u.uang}
🌤 ${cuaca()}

📜 Menu:
shop
tanam <tanaman>
panen
mancing
jual
inv
misi`);
    }

    // ===== SHOP =====
    else if (msg === "shop") {
      let list = Object.keys(tanaman)
        .map(i => `${i} - ${tanaman[i].harga}`)
        .join("\n");

      r = narasi("info", `🏪 TOKO\n\n${list}`);
    }

    // ===== BELI =====
    else if (msg.startsWith("beli")) {
      let [_, item, jumlah] = msg.split(" ");
      jumlah = parseInt(jumlah) || 1;
      if (jumlah > 99) jumlah = 99;

      if (!tanaman[item]) return send(res, "❌ tidak ada");

      if (!bisaBawa(u, item, jumlah)) {
        return send(res, narasi("error", "Tas penuh!"));
      }

      let harga = tanaman[item].harga * jumlah;
      if (u.uang < harga) return send(res, "💸 kurang");

      u.uang -= harga;
      u.inv[item] = (u.inv[item] || 0) + jumlah;

      r = narasi("sukses", `beli ${item} x${jumlah}`);
    }

    // ===== TANAM =====
    else if (msg.startsWith("tanam")) {
      let item = msg.split(" ")[1];

      if (!u.inv[item]) return send(res, "❌ tidak punya");

      u.inv[item]--;
      u.tanam = { jenis: item, hariMulai: hariSekarang() };

      r = narasi("proses", `menanam ${item}...\nsiap ${tanaman[item].hari} hari`);
    }

    // ===== PANEN =====
    else if (msg === "panen") {
      if (!u.tanam) return send(res, "❌ belum tanam");

      let data = tanaman[u.tanam.jenis];
      let selisih = hariSekarang() - u.tanam.hariMulai;

      if (selisih < data.hari) {
        return send(res, narasi("proses", `belum siap ${selisih}/${data.hari}`));
      }

      let hasil = data.hasil;
      u.uang += hasil;
      u.tanam = null;

      r = narasi("hasil", `panen +${hasil}`);
    }

    // ===== JUAL =====
    else if (msg === "jual") {
      let total = 0;

      for (let i in u.inv) {
        total += u.inv[i] * 100;
      }

      u.inv = {};
      u.uang += total;

      r = narasi("hasil", `jual semua +${total}`);
    }

    // ===== MANCING =====
    else if (msg === "mancing") {
      let rand = Math.random();
      r = narasi("proses", rand < 0.5 ? "dapat ikan" : "zonk");
    }

    // ===== INVENTORY =====
    else if (msg === "inv") {
      r = narasi("info",
JSON.stringify(u.inv, null, 2) +
`\n⚖️ ${totalBerat(u.inv)}/${u.kapasitas} kg`);
    }

    // ===== MISI =====
    else if (msg === "misi") {
      r = narasi("info", "panen 2x hari ini");
    }

    else {
      r = "ketik main";
    }

    saveDB();
    send(res, r);

  } catch (e) {
    console.log(e);
    send(res, "error");
  }
});

// ================= RUN =================
app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("🚀 jalan");
});
