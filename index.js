const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== ROOT =====
app.get("/", (req, res) => res.send("🌾 RPG FARM ONLINE"));
app.get("/health", (req, res) => res.send("OK"));

// ===== DATABASE =====
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

// ===== UTIL =====
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

function hari() {
  return Math.floor(Date.now() / 86400000);
}

function cuaca() {
  const list = ["☀️ Cerah", "🌧 Hujan", "🌥 Mendung", "🌪 Angin"];
  return list[new Date().getHours() % list.length];
}

// ===== DATA =====
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

// ===== USER =====
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

// ===== BERAT =====
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

// ===== RESPONSE =====
function send(res, msg) {
  res.type("text/xml");
  res.send(`<Response><Message>${msg}</Message></Response>`);
}

// ===== WEBHOOK =====
app.post("/webhook", (req, res) => {
  try {
    let msg = (req.body.Body || "").toLowerCase().trim();
    let raw = (req.body.Body || "").trim();
    let id = req.body.From;
    let u = getUser(id);

    // ===== GENDER =====
    if (!u.gender) {
      if (msg === "cowok" || msg === "cewek") {
        u.gender = msg;
        saveDB();
        return send(res, narasi("sukses",
`🧬 Gender dipilih: ${msg}

✨ Dunia mulai terbuka...

👉 Siapa namamu?`));
      }

      return send(res, narasi("info",
`🌾 Kamu terbangun di desa kecil...

👤 Pilih gender:
👉 cowok / cewek`));
    }

    // ===== NAMA AUTO =====
    if (!u.nama) {
      if (raw.length >= 3) {
        u.nama = raw;
        saveDB();

        return send(res, narasi("sukses",
`👤 Halo ${u.nama}...

🌾 Kamu memulai hidup baru...
🌤 ${cuaca()}

💭 "Aku harus bertahan hidup disini..."

👉 ketik *main* untuk mulai`));
      }

      return send(res, narasi("info",
`✏️ Siapa nama kamu?

💬 ketik saja namamu`));
    }

    let r = "";

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
ternak
misi`);
    }

    // ===== SHOP =====
    else if (msg === "shop") {
      let list = Object.keys(tanaman)
        .map(i => `🌱 ${i} - ${tanaman[i].harga}`)
        .join("\n");

      r = narasi("info",
`🏪 Kamu masuk ke toko desa...

${list}

💬 ketik: beli <item> jumlah`);
    }

    // ===== BELI =====
    else if (msg.startsWith("beli")) {
      let [_, item, jumlah] = msg.split(" ");
      jumlah = parseInt(jumlah) || 1;
      if (jumlah > 99) jumlah = 99;

      if (!tanaman[item]) return send(res, "❌ tidak ada");

      if (!bisaBawa(u, item, jumlah)) {
        return send(res, narasi("error", "🎒 Tas terlalu berat!"));
      }

      let harga = tanaman[item].harga * jumlah;
      if (u.uang < harga) return send(res, "💸 uang kurang");

      u.uang -= harga;
      u.inv[item] = (u.inv[item] || 0) + jumlah;

      r = narasi("sukses",
`🛒 Kamu membeli ${item} x${jumlah}

💰 -${harga}
⚖️ ${totalBerat(u.inv).toFixed(1)} kg`);
    }

    // ===== TANAM =====
    else if (msg.startsWith("tanam")) {
      let item = msg.split(" ")[1];

      if (!u.inv[item]) return send(res, narasi("error", "❌ tidak punya bibit"));

      u.inv[item]--;
      u.tanam = { jenis: item, mulai: hari() };

      let data = tanaman[item];

      r = narasi("proses",
`🌱 ${u.nama} menanam ${item}...

🌿 Tanah digemburkan...
💧 Disiram perlahan...
🌤 ${cuaca()}

⏳ Siap dalam ${data.hari} hari`);
    }

    // ===== PANEN =====
    else if (msg === "panen") {
      if (!u.tanam) return send(res, narasi("error", "❌ belum tanam"));

      let data = tanaman[u.tanam.jenis];
      let selisih = hari() - u.tanam.mulai;

      if (selisih < data.hari) {
        return send(res, narasi("proses",
`⏳ Belum siap...
📅 ${selisih}/${data.hari} hari`));
      }

      u.uang += data.hasil;
      u.tanam = null;

      r = narasi("hasil",
`🌾 Panen berhasil!

💰 +${data.hasil}
🌤 ${cuaca()}

✨ kerja keras terbayar!`);
    }

    // ===== JUAL =====
    else if (msg === "jual") {
      let total = 0;
      for (let i in u.inv) total += u.inv[i] * 100;

      u.inv = {};
      u.uang += total;

      r = narasi("hasil",
`🏪 Kamu menjual semua hasil...

💰 +${total}

🙂 Pedagang tersenyum puas`);
    }

    // ===== MANCING =====
    else if (msg === "mancing") {
      let rand = Math.random();

      r = narasi("proses",
`🎣 ${u.nama} melempar kail...

🌊 Air bergetar...
⏳ menunggu...

${rand < 0.5 ? "🐟 dapat ikan!" : "💀 zonk..."}`);
    }

    // ===== TERNAK =====
    else if (msg === "ternak") {
      r = narasi("info",
`🐄 Peternakan

Sapi: ${u.ternak.sapi}

👉 beli sapi`);
    }

    else if (msg === "beli sapi") {
      if (u.uang < 500) return send(res, "💸 kurang");

      u.uang -= 500;
      u.ternak.sapi++;

      r = narasi("sukses",
`🐄 Kamu membeli sapi...

😊 Dia terlihat senang`);
    }

    // ===== INVENTORY =====
    else if (msg === "inv") {
      let isi = Object.keys(u.inv).length
        ? Object.entries(u.inv)
            .map(([k,v]) => `🌱 ${k}: ${v}`)
            .join("\n")
        : "Kosong";

      r = narasi("info",
`${isi}

⚖️ ${totalBerat(u.inv).toFixed(1)}/${u.kapasitas} kg`);
    }

    // ===== MISI =====
    else if (msg === "misi") {
      r = narasi("info",
`📜 Misi hari ini:

🌾 panen 1x
🎣 mancing 1x

🎁 hadiah menanti`);
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

// ===== RUN =====
app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("🚀 jalan");
});
