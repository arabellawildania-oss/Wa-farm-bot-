const express = require("express");

const app = express();

// IMPORTANT (biar Twilio kebaca)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.text({ type: "*/*" }));

// ROOT
app.get("/", (req, res) => {
  res.send("Server hidup 🚀");
});

// HEALTH
app.get("/health", (req, res) => {
  res.send("OK");
});

// WEBHOOK PALING SIMPLE
app.post("/webhook", (req, res) => {
  console.log("MASUK 🔥");

  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>Bot aktif 🚀</Message></Response>`);
});

// RUN (WAJIB)
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});
