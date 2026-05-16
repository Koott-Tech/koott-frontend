/**
 * Send outbound WhatsApp via WASenderApi (same integration as backend/utils/whatsappService.js).
 * Used by Next.js API routes where we cannot require() the backend bundle.
 */

import https from "https";
import { URL } from "url";

function sanitizeHeaderValue(value) {
  if (value == null || typeof value !== "string") return "";
  return value.replace(/[\r\n\t]/g, "").trim();
}

/**
 * Build E.164-ish number from country code (+91) and local digits.
 */
export function buildRegistrantWhatsApp(countryCode, phone) {
  const cc = String(countryCode || "")
    .trim()
    .replace(/\s/g, "");
  const digits = String(phone || "").replace(/\D/g, "");
  if (!cc || !digits) return null;
  const withPlus = cc.startsWith("+") ? cc : `+${cc}`;
  return `${withPlus}${digits}`;
}

function formatNotifyDestination(phoneE164) {
  if (!phoneE164 || typeof phoneE164 !== "string") return null;
  const cleaned = phoneE164.trim().replace(/\s/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) {
    return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null;
  }
  if (/^\d{10,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return null;
}

/**
 * @param {string} toPhoneE164 - e.g. +919876543210
 * @param {string} message
 * @returns {Promise<{ success: boolean, skipped?: boolean, reason?: string, error?: unknown }>}
 */
export function sendWasenderText(toPhoneE164, message) {
  return new Promise((resolve) => {
    try {
      const rawKey = process.env.WASENDER_API_KEY;
      const apiKey = rawKey ? sanitizeHeaderValue(rawKey) : "";

      if (!apiKey) {
        console.warn("[wasenderNotify] WASENDER_API_KEY not set; skipping send.");
        return resolve({ success: false, skipped: true, reason: "missing_env" });
      }

      const formattedPhone = formatNotifyDestination(toPhoneE164);
      if (!formattedPhone) {
        console.warn("[wasenderNotify] Invalid notify phone:", toPhoneE164);
        return resolve({ success: false, skipped: true, reason: "invalid_phone" });
      }

      const apiUrl = "https://wasenderapi.com/api/send-message";
      const url = new URL(apiUrl);
      const postData = JSON.stringify({
        to: formattedPhone,
        text: message,
      });

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          Authorization: `Bearer ${apiKey}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data || "{}");
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log("[wasenderNotify] Sent:", jsonData);
              resolve({ success: true, data: jsonData });
            } else {
              console.error("[wasenderNotify] API error:", jsonData);
              resolve({ success: false, error: jsonData });
            }
          } catch (parseErr) {
            console.error("[wasenderNotify] Parse error:", parseErr, data);
            resolve({ success: false, error: { message: "Invalid response", data } });
          }
        });
      });

      req.on("error", (err) => {
        console.error("[wasenderNotify] Request error:", err);
        resolve({ success: false, error: err });
      });

      req.write(postData);
      req.end();
    } catch (err) {
      console.error("[wasenderNotify] Exception:", err);
      resolve({ success: false, error: err });
    }
  });
}
