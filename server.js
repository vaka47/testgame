import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/telegram/event", async (req, res) => {
  const { type, promoCode } = req.body || {};

  console.log("Incoming game event:", { type, promoCode });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res
      .status(500)
      .json({ error: "TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы" });
  }

  let text;
  if (type === "win" && promoCode) {
    text = `Победа! Промокод выдан: ${promoCode}`;
  } else if (type === "lose") {
    text = "Проигрыш";
  } else {
    return res.status(400).json({ error: "Неверные параметры" });
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const tgRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    if (!tgRes.ok) {
      const body = await tgRes.text();
      console.error("Telegram API error:", tgRes.status, body);
      return res
        .status(502)
        .json({ error: "Ошибка при отправке в Telegram" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Ошибка при запросе к Telegram" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
