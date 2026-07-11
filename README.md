# XchangePing

Monitors USD/LKR exchange rates and sends an SMS alert via Dialog eSMS when the rate crosses a configured threshold.

## How it works

1. Fetches the current USD buying rate (TTBUY) from a configured exchange rate API
2. Compares it against a threshold (`LIMIT`)
3. If the rate exceeds the threshold, sends an SMS notification via the Dialog eSMS API

Designed to run as a **GitHub Actions cron job** (twice daily by default) or locally.

## Prerequisites

- Node.js 18+
- A Dialog eSMS account (Sri Lanka)
- An exchange rate API endpoint

## Setup

```bash
# Clone and install
npm install

# Copy the environment file and fill in your values
cp .env.example .env

# Run manually
npm start
```

## Environment Variables

| Variable           | Required | Description                                      |
|--------------------|----------|--------------------------------------------------|
| `EXCHANGE_API`     | ✅       | Full URL to the exchange rate JSON endpoint      |
| `LIMIT`            | ❌       | Rate threshold (e.g. `300.00`). Unset = no alert |
| `SMS_RECIPIENT`    | ✅       | Phone number to receive the SMS alert            |
| `ESMS_USERNAME`    | ✅       | Dialog eSMS API username                         |
| `ESMS_PASSWORD`    | ✅       | Dialog eSMS API password                         |
| `SMS_SOURCE_ADDRESS` | ❌     | Sender name shown on the SMS (default: `Chutte`) |

## GitHub Actions

The workflow runs automatically at **4:00 UTC** and **14:00 UTC** daily.

You can also trigger it manually via the GitHub UI with an optional `limit` override.

### Required repository secrets

- `EXCHANGE_API`
- `SMS_RECIPIENT`
- `ESMS_USERNAME`
- `ESMS_PASSWORD`

### Optional repository variable

- `EXCHANGE_RATE_LIMIT` — used as the default threshold when `LIMIT` is not overridden manually
