/** Отправка писем через Resend одним fetch. Без RESEND_API_KEY письма только логируются. */
export async function sendMail(to: string, subject: string, html: string): Promise<"sent" | "skipped"> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "To Dual Learn <learn@to-dual.education>";
  if (!key) {
    console.info(`[mail] пропущено (нет RESEND_API_KEY): ${to} — ${subject}`);
    return "skipped";
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend: ${res.status} ${await res.text()}`);
  return "sent";
}
