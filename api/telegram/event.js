async function readJsonBody(req) {
  if (req.body && Object.keys(req.body).length > 0) {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = await readJsonBody(req);
  const { type, promoCode } = body || {};

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Missing Telegram env vars");
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
    console.error("Invalid payload", body);
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
      const responseBody = await tgRes.text();
      console.error("Telegram API error:", tgRes.status, responseBody);
      return res
        .status(502)
        .json({ error: "Ошибка при отправке в Telegram" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Telegram request failed", err);
    res.status(502).json({ error: "Ошибка при запросе к Telegram" });
  }
}

