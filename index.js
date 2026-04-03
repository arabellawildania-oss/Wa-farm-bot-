const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

let users = {};

function getTime() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "🌅 Pagi";
  if (h >= 12 && h < 18) return "☀️ Siang";
  return "🌙 Malam";
}

function checkHarvest(user) {
  const now = Date.now();
  user.farm.forEach(p => {
    const d = Math.floor((now - p.time) / (1000*60*60*24));
    if (d >= p.duration) p.ready = true;
  });
}

app.post("/webhook", (req, res) => {
  const msg = req.body.Body.toLowerCase();
  const from = req.body.From;

  if (!users[from]) {
    users[from] = {
      uang: 1000,
      farm: [],
      inventory: { jagung:0, padi:0, wortel:0 },
      state: null
    };
  }

  let u = users[from];
  checkHarvest(u);

  let reply = `${getTime()}\n\n`;

  if (msg === "main") {
    reply += `🌾 FARM GAME\n💰 Rp${u.uang}\n\n1. 🌱 Tanam\n2. 🎒 Tas\n3. 🌾 Panen\n4. 🏪 Jual`;
  }

  else if (msg === "1") {
    reply += `🌱 Pilih:\n1. 🌽 Jagung\n2. 🌾 Padi\n3. 🥕 Wortel`;
    u.state = "tanam";
  }

  else if (u.state === "tanam") {
    let data = [
      {name:"jagung",d:2},
      {name:"padi",d:3},
      {name:"wortel",d:1}
    ];

    let pilih = data[msg-1];
    if (pilih) {
      u.farm.push({
        name: pilih.name,
        duration: pilih.d,
        time: Date.now(),
        ready:false
      });
      reply += `✅ Tanam ${pilih.name}! ⏳ ${pilih.d} hari`;
      u.state = null;
    }
  }

  else if (msg === "3") {
    let panen = false;
    u.farm = u.farm.filter(p=>{
      if(p.ready){
        u.inventory[p.name]++;
        panen = true;
        return false;
      }
      return true;
    });
    reply += panen ? "🌾 Panen berhasil! 🎉" : "❌ Belum siap panen";
  }

  else if (msg === "2") {
    reply += `🎒 Tas:\n🌽 ${u.inventory.jagung}\n🌾 ${u.inventory.padi}\n🥕 ${u.inventory.wortel}`;
  }

  else if (msg === "4") {
    reply += `🏪 Jual:\n1. 🌽 300\n2. 🌾 500\n3. 🥕 200`;
    u.state = "jual";
  }

  else if (u.state === "jual") {
    let harga = [300,500,200];
    let nama = ["jagung","padi","wortel"];
    let i = msg-1;

    if (u.inventory[nama[i]] > 0) {
      u.inventory[nama[i]]--;
      u.uang += harga[i];
      reply += `💰 Uang sekarang: Rp${u.uang}`;
    } else {
      reply += "❌ Tidak punya item";
    }
    u.state = null;
  }

  else {
    reply += "Ketik *main* untuk mulai 🌾";
  }

  res.set("Content-Type","text/xml");
  res.send(`<Response><Message>${reply}</Message></Response>`);
});

app.listen(3000, () => console.log("Server jalan 🚀"));
