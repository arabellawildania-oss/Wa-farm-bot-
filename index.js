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

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hari() {
  return Math.floor(Date.now() / 86400000);
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

// ===== USER =====
function getUser(id) {
  if (!db[id]) {
    db[id] = {
      uang: 1000,
      inv: {},
      tanam: null,
      gender: null,
      nama: null
    };
  }
  return db[id];
}

// ===== RESPONSE =====
function send(res, msg) {
  res.type("text/xml");
  res.send(`<Response><Message>${msg}</Message></Response>`);
}

// ===== WEBHOOK =====
app.post("/webhook", (req, res) => {
  try {
    let raw = (req.body.Body || "").toString().trim();
    let msg = raw.toLowerCase();
    let id = req.body.From;

    let u = getUser(id);
    let r = "";

    // ===== GENDER =====
    if (!u.gender) {
      if (msg === "cowok" || msg === "cewek") {
        u.gender = msg;
        saveDB();
        return send(res, narasi("sukses",
`🧬 Gender dipilih: ${msg}

👉 Sekarang ketik nama kamu`));
      }

      return send(res, narasi("info",
`🌾 Kamu terbangun di desa...

👤 Pilih gender:
cowok / cewek`));
    }

    // ===== NAMA =====
    if (!u.nama) {
      if (raw.length >= 3) {
        u.nama = raw;
        saveDB();
        return send(res, narasi("sukses",
`👤 Halo ${u.nama}

🌾 Petualangan dimulai!

👉 ketik main`));
      }

      return send(res, "ketik nama kamu");
    }

    // ===== MENU =====
    if (msg === "main" || msg === "menu") {
      r = narasi("info",
`👤 ${u.nama}
💰 ${u.uang}

📜 Menu:
shop
tanam <tanaman>
panen
mancing
jual
inv`);
    }

    // ===== SHOP =====
    else if (msg === "shop") {
      let list = Object.keys(tanaman)
        .map(i => `🌱 ${i} - ${tanaman[i].harga}`)
        .join("\n");

      r = narasi("info",
`🏪 SHOP:

${list}

ketik:
beli <item> jumlah`);
    }

    // ===== BELI =====
    else if (msg.startsWith("beli ")) {
      let [_, item, jumlah] = msg.split(" ");
      jumlah = parseInt(jumlah) || 1;
      if (jumlah > 99) jumlah = 99;

      if (!tanaman[item]) return send(res, "❌ item tidak ada");

      let harga = tanaman[item].harga * jumlah;
      if (u.uang < harga) return send(res, "💸 uang kurang");

      u.uang -= harga;
      u.inv[item] = (u.inv[item] || 0) + jumlah;

      r = narasi("sukses",
`🛒 beli ${item} x${jumlah}
💰 -${harga}`);
    }

    // ===== TANAM HELP =====
    else if (msg === "tanam") {
      return send(res,
`🌱 mau tanam apa?

contoh:
tanam jagung`);
    }

    // ===== TANAM =====
    else if (msg.startsWith("tanam ")) {
      let item = msg.split(" ")[1];

      if (!tanaman[item]) {
        return send(res, "❌ tanaman tidak ada");
      }

      if (!u.inv[item]) {
        return send(res, `❌ tidak punya ${item}`);
      }

      u.inv[item]--;
      u.tanam = { jenis: item, mulai: hari() };

      r = narasi("proses",
`🌱 menanam ${item}

⏳ siap dalam ${tanaman[item].hari} hari`);
    }

    // ===== PANEN =====
    else if (msg === "panen") {
      if (!u.tanam) return send(res, "❌ belum tanam");

      let data = tanaman[u.tanam.jenis];
      let selisih = hari() - u.tanam.mulai;

      if (selisih < data.hari) {
        return send(res, `⏳ ${selisih}/${data.hari} hari`);
      }

      u.uang += data.hasil;
      u.tanam = null;

      r = narasi("hasil",
`🌾 panen berhasil
💰 +${data.hasil}`);
    }

    // ===== MANCING =====
    else if (msg === "mancing") {
      let hasil = ["🐟 ikan kecil", "🐠 ikan besar", "💀 sampah"];
      r = narasi("proses",
`🎣 memancing...

${random(hasil)}`);
    }

    // ===== JUAL =====
    else if (msg === "jual") {
      let total = 0;
      for (let i in u.inv) total += u.inv[i] * 100;

      u.inv = {};
      u.uang += total;

      r = narasi("hasil",
`💰 semua hasil terjual
+${total}`);
    }

    // ===== INVENTORY =====
    else if (msg === "inv") {
      let isi = Object.keys(u.inv).length
        ? Object.entries(u.inv)
            .map(([k,v]) => `${k}: ${v}`)
            .join("\n")
        : "kosong";

      r = narasi("info", isi);
    }

    // ===== FALLBACK =====
    else {
      r = narasi("info",
`🤔 Tidak paham: "${raw}"

coba:
main / shop / tanam`);
    }

    saveDB();
    send(res, r);

  } catch (err) {
    console.log(err);
    send(res, "error");
  }
});

// ===== RUN =====
app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("🚀 Server jalan");
});
