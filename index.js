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
    let raw = (req.body.Body || "").trim();
    let msg = raw.toLowerCase();
    let id = req.body.From;

    let u = getUser(id);
    let r = "";

    // ===== GENDER =====
    if (!u.gender) {
      if (msg.includes("cowok") || msg.includes("cewek")) {
        u.gender = msg.includes("cowok") ? "cowok" : "cewek";

        saveDB();
        return send(res, narasi("sukses",
`🧬 Gender dipilih: ${u.gender}

✨ Dunia mulai terasa nyata...

👉 Sekarang, siapa namamu?`));
      }

      return send(res, narasi("info",
`🌾 Kamu terbangun di desa asing...

👤 Pilih gender:
👉 cowok / cewek`));
    }

    // ===== NAMA =====
    if (!u.nama) {
      if (raw.length >= 3) {
        u.nama = raw;

        saveDB();
        return send(res, narasi("sukses",
`👤 Halo ${u.nama}...

🌿 Angin desa menyambutmu...
🌤 ${cuaca()}

💭 "Ini awal kehidupan baruku..."

👉 ketik *main* untuk mulai`));
      }

      return send(res, narasi("info",
`✏️ Masukkan namamu

💬 ketik saja nama`));
    }

    // ===== MENU =====
    if (msg.includes("main") || msg.includes("menu")) {
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
inv`);
    }

    // ===== SHOP =====
    else if (msg.includes("shop")) {
      let list = Object.keys(tanaman)
        .map(i => `🌱 ${i} - ${tanaman[i].harga}`)
        .join("\n");

      r = narasi("info",
`🏪 Kamu masuk ke toko desa...

${list}

💬 beli <item> jumlah`);
    }

    // ===== BELI =====
    else if (msg.startsWith("beli")) {
      let [_, item, jumlah] = msg.split(" ");
      jumlah = parseInt(jumlah) || 1;
      if (jumlah > 99) jumlah = 99;

      if (!tanaman[item]) return send(res, "❌ tidak ada");

      let harga = tanaman[item].harga * jumlah;
      if (u.uang < harga) return send(res, "💸 uang kurang");

      u.uang -= harga;
      u.inv[item] = (u.inv[item] || 0) + jumlah;

      r = narasi("sukses",
`🛒 Kamu membeli ${item} x${jumlah}

💰 -${harga}
😊 Pedagang tersenyum`);
    }

    // ===== TANAM =====
    else if (msg.startsWith("tanam")) {
      let item = msg.split(" ")[1];

      if (!tanaman[item]) {
        return send(res, narasi("error",
`❌ Tanaman tidak tersedia

💡 cek di shop`));
      }

      if (!u.inv[item]) {
        return send(res, narasi("error",
`😅 Kamu belum punya ${item}`));
      }

      u.inv[item]--;
      u.tanam = { jenis: item, mulai: hari() };

      let kata = random([
        "Tanah terasa subur hari ini...",
        "Angin sejuk menemani...",
        "Burung berkicau di kejauhan..."
      ]);

      let data = tanaman[item];

      r = narasi("proses",
`🌱 Kamu menanam ${item}...

${kata}
💧 Disiram perlahan
🌤 ${cuaca()}

⏳ Siap dalam ${data.hari} hari`);
    }

    // ===== PANEN =====
    else if (msg.includes("panen")) {
      if (!u.tanam) {
        return send(res, narasi("error",
`❌ Belum ada tanaman`));
      }

      let data = tanaman[u.tanam.jenis];
      let selisih = hari() - u.tanam.mulai;

      if (selisih < data.hari) {
        return send(res, narasi("proses",
`⏳ Belum siap

📅 ${selisih}/${data.hari} hari`));
      }

      u.uang += data.hasil;
      u.tanam = null;

      let kata = random([
        "Panen melimpah!",
        "Hasil luar biasa!",
        "Kerja keras terbayar!"
      ]);

      r = narasi("hasil",
`🌾 Panen berhasil!

${kata}

💰 +${data.hasil}`);
    }

    // ===== MANCING =====
    else if (msg.includes("mancing")) {
      let rand = Math.random();

      let hasil =
        rand < 0.5 ? "🐟 Ikan kecil!"
        : rand < 0.8 ? "🐠 Ikan besar!"
        : "💀 Sampah...";

      r = narasi("proses",
`🎣 Kamu melempar kail...

🌊 Air bergelombang...
⏳ menunggu...

${hasil}`);
    }

    // ===== JUAL =====
    else if (msg.includes("jual")) {
      let total = 0;
      for (let i in u.inv) {
        total += u.inv[i] * 100;
      }

      u.inv = {};
      u.uang += total;

      r = narasi("hasil",
`🏪 Kamu menjual hasil panen...

💰 +${total}`);
    }

    // ===== INVENTORY =====
    else if (msg.includes("inv")) {
      let isi = Object.keys(u.inv).length
        ? Object.entries(u.inv)
            .map(([k,v]) => `🌱 ${k}: ${v}`)
            .join("\n")
        : "Kosong";

      r = narasi("info", isi);
    }

    else {
      r = "ketik main";
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
