# Egg Ledger Setup

Egg Ledger is a mobile-friendly installable web app for a layer egg business.

## What It Tracks

- Harvested eggs by size: small, medium, large, XL, jumbo, and rejects
- Feeds eaten by chickens in kilograms
- Sold eggs by size
- Price per tray for each egg size
- Feed purchases by sacks and kilograms per sack
- One-time, daily, and monthly expenses
- Salaries, medicine, utilities, maintenance, and other costs
- Revenue, expenses, net income, total harvest, cost per egg, and feed balance
- Feed inventory for any selected period: kilos bought, kilos used/eaten, and period balance
- CSV export and JSON backup/import

## Run Locally

Open a terminal in this folder and run:

```powershell
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Install On A Phone

For Android Chrome:

1. Open the hosted app URL.
2. Tap the browser menu.
3. Tap `Add to Home screen` or `Install app`.

For iPhone Safari:

1. Open the hosted app URL.
2. Tap Share.
3. Tap `Add to Home Screen`.

The app stores data on the device using browser storage. Use `Backup JSON` regularly if the phone is the main record keeper.

## Sharing Data Across People With Google Sheets

The app is local-first by default: each phone saves its own records. To let all staff phones write to one shared sheet:

1. Create a new Google Sheet.
2. Open `Extensions > Apps Script`.
3. Copy the contents of `google-apps-script.gs` into Apps Script.
4. Click `Deploy > New deployment`.
5. Choose `Web app`.
6. Set `Execute as` to yourself.
7. Set `Who has access` to `Anyone`.
8. Deploy and copy the web app URL.
9. Open `src/app.js`.
10. Replace `PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with the web app URL.

After that, every phone using the same hosted app will read and write to the shared Google Sheet.

The shared sheet uses three tabs:

- `Production Logs` for harvest, sold eggs, and feeds eaten
- `Expense Logs` for feed purchases and other expenses
- `Settings` for tray size, kilos per sack, and selling prices

If you already deployed an older Egg Ledger Apps Script, replace it with the current `google-apps-script.gs` and create a new deployment version so Netlify phones use the updated two-log format.
