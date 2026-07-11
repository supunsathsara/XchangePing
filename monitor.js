import "dotenv/config";
import { sendExchangeRateAlert } from "./smsNotify.js";

// ── Required environment variables ──────────────────────────────
const REQUIRED_ENV = [
  "EXCHANGE_API",
  "SMS_RECIPIENT",
  "ESMS_USERNAME",
  "ESMS_PASSWORD",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ── Config ──────────────────────────────────────────────────────
const EXCHANGE_API = process.env.EXCHANGE_API;
const LIMIT = parseFloat(process.env.LIMIT || "0");
const SMS_RECIPIENT = process.env.SMS_RECIPIENT;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Fetch with retry and exponential backoff.
 * @param {string} url
 * @param {number} [maxRetries=3]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, maxRetries = 3) {
  let retries = 0;
  while (true) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      const delay = Math.pow(2, retries) * 1000;
      console.log(`Retry ${retries}/${maxRetries} after ${delay}ms — ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// ── Main ────────────────────────────────────────────────────────

try {
  console.log(`[${new Date().toISOString()}] Checking exchange rates...`);

  const res = await fetchWithRetry(EXCHANGE_API);
  /** @type {{ data: Array<{ CurrCode: string, TTBUY: string }> }} */
  const body = await res.json();

  if (!body?.data || !Array.isArray(body.data)) {
    throw new Error("Invalid API response format — expected { data: [...] }");
  }

  const usdCurrency = body.data.find(
    (currency) => currency.CurrCode === "USD"
  );
  if (!usdCurrency) {
    throw new Error("USD rate not found in API response");
  }

  const usdRate = parseFloat(usdCurrency.TTBUY);
  console.log(`Current USD TTBUY rate: ${usdRate}`);

  // LIMIT <= 0 means "no threshold set" — never alert
  if (LIMIT > 0 && usdRate > LIMIT) {
    console.log(
      `Rate ${usdRate} exceeds threshold ${LIMIT}, sending notification`
    );
    await sendExchangeRateAlert(SMS_RECIPIENT, usdRate);
    console.log("Notification sent successfully");
  } else if (LIMIT > 0) {
    console.log(
      `Rate ${usdRate} is within threshold (limit: ${LIMIT}). No action.`
    );
  } else {
    console.log(
      `Rate: ${usdRate}. No threshold set (LIMIT is 0 or unset) — monitoring only.`
    );
  }
} catch (err) {
  console.error("Monitor error:", err.message);
  process.exit(1);
}
