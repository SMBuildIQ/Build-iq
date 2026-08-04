import { LEGAL, legalEmailFooter } from "@/lib/legal";

type Mail = { to: string; subject: string; text: string; html?: string };

function withFooter(text: string) {
  return `${text.trim()}\n\n${legalEmailFooter()}`;
}

/**
 * Email provider. Production requires RESEND_API_KEY or SMTP_URL.
 * Development logs messages and returns ok so auth flows are testable.
 */
export async function sendEmail(mail: Mail): Promise<{ ok: boolean; provider: string; id?: string }> {
  const text = withFooter(mail.text);
  const html =
    mail.html ||
    `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${text.replace(/</g, "&lt;")}</pre>`;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const from =
      process.env.EMAIL_FROM || `${LEGAL.productName} <noreply@supplymonkeyco.com>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: mail.to,
        subject: mail.subject,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Email send failed: ${body}`);
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, provider: "resend", id: data.id };
  }

  if (process.env.NODE_ENV === "production" && process.env.REQUIRE_EMAIL === "true") {
    throw new Error("Email is not configured (set RESEND_API_KEY)");
  }

  console.info("[email:dev]", { to: mail.to, subject: mail.subject, text });
  return { ok: true, provider: "console" };
}

export function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
