import nodemailer, { type Transporter } from "nodemailer";

/** Отправка писем «урок дня». Порядок выбора канала:
 *  1. SMTP_HOST задан — свой SMTP (Unisender Go, Yandex Cloud Postbox, Mailganer, любой другой);
 *  2. иначе RESEND_API_KEY — Resend (зарубежный канал, только на время переезда);
 *  3. иначе письмо пропускается.
 *  Ошибка отправки одному получателю не должна ронять рассылку остальным, поэтому sendMail её не бросает. */

const globalForMail = globalThis as unknown as { __smtp?: Transporter };

const SMTP_TIMEOUT_MS = 20_000;

function smtp(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!globalForMail.__smtp) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    // Тот же сервер прописывают в Supabase (SMTP_PASS), поэтому принимаем оба имени.
    const pass = process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS;
    if (user && !pass) throw new Error("Задан SMTP_USER, но нет SMTP_PASSWORD (или SMTP_PASS).");
    // 465 — TLS с первого байта, остальные порты — STARTTLS. SMTP_SECURE=true/false задаёт режим явно.
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
    globalForMail.__smtp = nodemailer.createTransport({
      host,
      port,
      secure,
      // Внутренний релей без STARTTLS: SMTP_REQUIRE_TLS=false.
      requireTLS: !secure && process.env.SMTP_REQUIRE_TLS !== "false",
      auth: user ? { user, pass } : undefined,
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });
  }
  return globalForMail.__smtp;
}

/** Почта в логах маскируется: логи хранит хостинг, и персональные данные туда попадать не должны. */
function mask(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}

export async function sendMail(to: string, subject: string, html: string): Promise<"sent" | "skipped" | "failed"> {
  const from = process.env.MAIL_FROM ?? "To Dual Learn <learn@to-dual.education>";
  try {
    const transport = smtp();
    if (transport) {
      await transport.sendMail({ from, to, subject, html });
      return "sent";
    }

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.info(`[mail] пропущено (нет SMTP_HOST и RESEND_API_KEY): ${mask(to)}`);
      return "skipped";
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`[mail] Resend ${res.status}: ${mask(to)}`);
      return "failed";
    }
    return "sent";
  } catch (e) {
    // Текст ошибки SMTP содержит адрес получателя, поэтому в лог идёт только код.
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "ERROR";
    const responseCode = typeof e === "object" && e !== null && "responseCode" in e ? String((e as { responseCode: unknown }).responseCode) : "";
    console.error(`[mail] не отправлено: ${mask(to)} ${code} ${responseCode}`.trim());
    return "failed";
  }
}
