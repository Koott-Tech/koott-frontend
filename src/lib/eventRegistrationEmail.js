/**
 * Optional confirmation email via Resend (no extra npm dependency).
 * Set RESEND_API_KEY and RESEND_FROM (e.g. "MyKoott <hello@yourdomain.com>").
 */

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/'/g, "&#39;");
}

/**
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function sendEventRegistrationConfirmationEmail({ to, fullName, eventTitle, sessionJoinUrl }) {
  const key = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    "MyKoott <onboarding@resend.dev>";

  if (!key) {
    console.warn("[eventRegistrationEmail] RESEND_API_KEY not set; skipping confirmation email.");
    return { ok: false, skipped: true };
  }

  const join = String(sessionJoinUrl || "").trim();
  const subject = `You're registered — ${eventTitle}`;
  const safeName = escapeHtml(fullName);
  const safeTitle = escapeHtml(eventTitle);
  const safeJoinText = escapeHtml(join);
  const safeJoinHref = escapeHtmlAttr(join);
  const linkBlock = join
    ? `<p style="margin-top: 1rem;"><strong>Your session link</strong><br /><a href="${safeJoinHref}" style="color: #025545;">${safeJoinText}</a></p><p style="margin-top: 0.75rem; font-size: 14px; color: #555;">Use this same link to join; we will not send a different meeting link.</p>`
    : `<p>We've saved your spot. Joining details will follow separately.</p>`;
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #012f23;">
  <p>Hi ${safeName},</p>
  <p>Thank you for registering for <strong>${safeTitle}</strong>.</p>
  <p>Your spot is reserved.</p>
  ${linkBlock}
  <p style="margin-top: 1.5rem; color: #666; font-size: 14px;">— MyKoott</p>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[eventRegistrationEmail] Resend error:", data);
      return { ok: false, error: data?.message || res.statusText };
    }
    return { ok: true };
  } catch (e) {
    console.error("[eventRegistrationEmail]", e);
    return { ok: false, error: e?.message || "send failed" };
  }
}
