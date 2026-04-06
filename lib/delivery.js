/**
 * Send a photo directly to a Telegram chat using the Bot API.
 * Uses the native Node 22 fetch + FormData.
 *
 * @param {{ botToken: string, chatId: string, buffer: Buffer, caption?: string }} opts
 * @returns {Promise<boolean>} true if sendPhoto succeeded
 */
async function sendTelegramPhoto({ botToken, chatId, buffer, caption }) {
  const blob = new Blob([buffer], { type: "image/png" });

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("photo", blob, "image.png");
  if (caption) form.append("caption", caption);

  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const resp = await fetch(url, { method: "POST", body: form });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Telegram sendPhoto failed: ${resp.status} ${text}`);
  }
  return true;
}

module.exports = { sendTelegramPhoto };
