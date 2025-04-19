const axios = require("axios");
const { sendExchangeRateAlert } = require("./smsNotify");
require("dotenv").config();

// Environment variables with defaults for safety
const EXCHANGE_API = process.env.EXCHANGE_API;
const LIMIT = parseFloat(process.env.LIMIT || "0");
const SMS_RECIPIENT = process.env.SMS_RECIPIENT;
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

// Add retry logic with exponential backoff
async function fetchWithRetry(url, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            return await axios.get(url, {
                timeout: 10000, // 10s timeout
                headers: {
                    'User-Agent': USER_AGENT
                }
            });
        } catch (error) {
            retries++;
            if (retries === maxRetries) throw error;
            const delay = Math.pow(2, retries) * 1000; // Exponential backoff
            console.log(`Retry ${retries}/${maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

(async () => {
    try {
        console.log(`[${new Date().toISOString()}] Checking exchange rates...`);

        const res = await fetchWithRetry(EXCHANGE_API);
        if (!res?.data?.data || !Array.isArray(res.data.data)) {
            throw new Error("Invalid API response format");
        }

        const usdCurrency = res.data.data.find(currency => currency.CurrCode === "USD");
        if (!usdCurrency) {
            throw new Error("USD rate not found in API response");
        }

        const usdRate = parseFloat(usdCurrency.TTBUY);
        console.log(`Current USD TTBUY rate: ${usdRate}`);

        if (usdRate > LIMIT && LIMIT > 0) {
            console.log(`Rate ${usdRate} exceeds threshold ${LIMIT}, sending notification`);
            await sendExchangeRateAlert(SMS_RECIPIENT, usdRate);
            console.log("Notification sent successfully");
        } else {
            console.log(`No action needed. Current rate: ${usdRate}, Threshold: ${LIMIT}`);
        }
    } catch (err) {
        console.error("Monitor error:", err.message);
        process.exit(1);
    }
})();