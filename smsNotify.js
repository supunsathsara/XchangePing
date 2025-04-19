const axios = require("axios");
require("dotenv").config();

// Token management
let token = '';
let expiration = 0;

/**
 * Sends an SMS alert with the current exchange rate
 * @param {string} number - Recipient phone number
 * @param {string|number} rate - Current exchange rate
 * @returns {Promise<object|null>} - API response or null on failure
 */
async function sendExchangeRateAlert(number, rate) {
    if (!number) {
        console.error("Error: No recipient number provided");
        return null;
    }

    const message = `USD → LKR exchange rate has reached ${rate}.`;

    try {
        // Check and refresh token if needed
        if (!token || Date.now() > expiration) {
            //console.log("Token expired or not available, logging in...");
            const loginSuccess = await login();
            if (!loginSuccess) {
                throw new Error("Failed to obtain authentication token");
            }
        }

        const formattedNumber = formatMobileNumber(number);

        const data = {
            msisdn: [{ mobile: formattedNumber }],
            sourceAddress: "Chutte",
            message: message,
            transaction_id: generateTransactionId(),
            payment_method: 0,
        };

        const headers = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        };

        const response = await axios.post(
            "https://e-sms.dialog.lk/api/v2/sms",
            data,
            {
                headers,
                timeout: 10000 // 10 second timeout
            }
        );

        console.log(`SMS sent successfully`);
        return response.data;
    } catch (error) {
        console.error("SMS Error:", error.message);
        return null;
    }
}

/**
 * Login to SMS service to get authentication token
 * @returns {Promise<boolean>} - True if login successful
 */
async function login() {
    try {
        const res = await axios.post(
            "https://esms.dialog.lk/api/v1/login",
            {
                username: process.env.ESMS_USERNAME,
                password: process.env.ESMS_PASSWORD,
            },
            {
                timeout: 10000, // 10 second timeout
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        if (res.data.status === "success") {
            token = res.data.token;
            expiration = res.data.expiration * 1000 + Date.now();
            //console.log("Logged in to eSMS API successfully");
            return true;
        } else {
            console.error("Login failed:", res.data.comment);
            return false;
        }
    } catch (err) {
        console.error("Login error:", err.message);
        return false;
    }
}

/**
 * Generate a unique transaction ID
 * @returns {number} - Unique transaction ID
 */
function generateTransactionId() {
    return Date.now() % (10 ** 15 - 1) + 1;
}

/**
 * Format mobile number to the required format (94XXXXXXXXX)
 * @param {string} number - Mobile number in any format
 * @returns {string} - Formatted mobile number
 */
function formatMobileNumber(number) {
    number = number.toString();
    const digits = number.replace(/\D/g, '');

    // Handle case where number might already start with 94
    if (digits.startsWith('94') && digits.length >= 11) {
        return digits.substring(0, 11);
    }

    // Otherwise add 94 prefix to last 9 digits
    return `94${digits.slice(-9)}`;
}

module.exports = {
    sendExchangeRateAlert,
};