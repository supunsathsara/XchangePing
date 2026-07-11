import "dotenv/config";

// Token management
let token = "";
let expiration = 0;

const ESMS_BASE = "https://esms.dialog.lk";
const SOURCE_ADDRESS = process.env.SMS_SOURCE_ADDRESS || "Chutte";

/**
 * Sends an SMS alert with the current exchange rate.
 * @param {string} number - Recipient phone number
 * @param {string|number} rate - Current exchange rate
 * @returns {Promise<object|null>} API response or null on failure
 */
export async function sendExchangeRateAlert(number, rate) {
  if (!number) {
    console.error("Error: No recipient number provided");
    return null;
  }

  const message = `USD → LKR exchange rate has reached ${rate}.`;

  try {
    // Check and refresh token if needed
    if (!token || Date.now() > expiration) {
      const loginSuccess = await login();
      if (!loginSuccess) {
        throw new Error("Failed to obtain authentication token");
      }
    }

    const formattedNumber = formatMobileNumber(number);

    const body = {
      msisdn: [{ mobile: formattedNumber }],
      sourceAddress: SOURCE_ADDRESS,
      message,
      transaction_id: generateTransactionId(),
      payment_method: 0,
    };

    const response = await fetch(`${ESMS_BASE}/api/v2/sms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`SMS API returned ${response.status}: ${await response.text()}`);
    }

    console.log("SMS sent successfully");
    return await response.json();
  } catch (error) {
    console.error("SMS Error:", error.message);
    return null;
  }
}

/**
 * Login to SMS service to get authentication token.
 * @returns {Promise<boolean>} True if login successful
 */
async function login() {
  try {
    const response = await fetch(`${ESMS_BASE}/api/v1/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.ESMS_USERNAME,
        password: process.env.ESMS_PASSWORD,
      }),
    });

    const data = await response.json();

    if (data.status === "success") {
      token = data.token;
      expiration = data.expiration * 1000 + Date.now();
      return true;
    } else {
      console.error("Login failed:", data.comment);
      return false;
    }
  } catch (err) {
    console.error("Login error:", err.message);
    return false;
  }
}

/**
 * Generate a unique transaction ID.
 * @returns {number} Unique transaction ID
 */
function generateTransactionId() {
  return (Date.now() % (10 ** 15 - 1)) + 1;
}

/**
 * Format mobile number to the required format (94XXXXXXXXX).
 * Accepts numbers with or without leading 0, +94 prefix, etc.
 * @param {string} number - Mobile number in any format
 * @returns {string} Formatted mobile number
 */
export function formatMobileNumber(number) {
  number = number.toString();
  const digits = number.replace(/\D/g, "");

  // If already starts with 94 and is long enough, take first 11 digits
  if (digits.startsWith("94") && digits.length >= 11) {
    return digits.substring(0, 11);
  }

  // Otherwise strip leading 0 if present and prepend 94
  return `94${digits.slice(-9)}`;
}
