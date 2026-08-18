// Thin wrapper shared by every outbound email in the app (RFQ send, and now
// negotiation send). Real delivery via Resend when RESEND_API_KEY is
// configured; otherwise logs instead of silently pretending to send — the
// same honesty tradeoff documented in KNOWN_LIMITATIONS.md for RFQ email.
export async function sendEmail(params: { to: string; subject: string; text: string; logPrefix: string }): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: params.to, subject: params.subject, text: params.text }),
    });
  } else {
    console.log(`[${params.logPrefix}] (no RESEND_API_KEY) would email ${params.to}:\n${params.subject}\n${params.text}`);
  }
}
