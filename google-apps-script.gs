const PRODUCTION_SHEET = "Production Logs";
const EXPENSE_SHEET = "Expense Logs";
const SETTINGS_SHEET = "Settings";

const PRODUCTION_HEADERS = [
  "id",
  "date",
  "flockName",
  "harvest_small",
  "harvest_medium",
  "harvest_large",
  "harvest_xl",
  "harvest_jumbo",
  "harvest_rejects",
  "sold_small",
  "sold_medium",
  "sold_large",
  "sold_xl",
  "sold_jumbo",
  "feedUsedKg",
  "productionNotes",
  "salesNotes",
  "createdAt",
  "updatedAt",
];

const EXPENSE_HEADERS = [
  "id",
  "date",
  "category",
  "frequency",
  "amount",
  "feedSacks",
  "kgPerSack",
  "description",
  "createdAt",
  "updatedAt",
];

const DEFAULT_SETTINGS = {
  traySize: 30,
  kgPerSack: 50,
  prices: {
    small: 180,
    medium: 200,
    large: 220,
    xl: 240,
    jumbo: 260,
    rejects: 0,
  },
};

function doGet() {
  return jsonResponse(readState_());
}

function doPost(event) {
  const payload = JSON.parse((event.postData && event.postData.contents) || "{}");
  const action = payload.action || "upsertProductionLog";

  if (payload.settings) writeSettings_(payload.settings);

  if (action === "saveSettings") {
    writeSettings_(payload.settings);
  }

  if (action === "upsertProductionLog") {
    upsertProductionLog_(payload.productionLog);
  }

  if (action === "upsertExpenseLog") {
    upsertExpenseLog_(payload.expenseLog);
  }

  if (action === "deleteProductionLog") {
    deleteById_(PRODUCTION_SHEET, PRODUCTION_HEADERS, payload.id);
  }

  if (action === "deleteExpenseLog") {
    deleteById_(EXPENSE_SHEET, EXPENSE_HEADERS, payload.id);
  }

  if (action === "replaceAll") {
    writeSettings_(payload.settings);
    replaceProductionLogs_(payload.productionLogs || []);
    replaceExpenseLogs_(payload.expenseLogs || []);
  }

  return jsonResponse(readState_());
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);

  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (headers && sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  return sheet;
}

function readState_() {
  return {
    settings: readSettings_(),
    productionLogs: readProductionLogs_(),
    expenseLogs: readExpenseLogs_(),
  };
}

function readSettings_() {
  const sheet = getSheet_(SETTINGS_SHEET, ["key", "value"]);
  const values = sheet.getDataRange().getValues();
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

  values.slice(1).forEach((row) => {
    if (row[0] === "traySize") settings.traySize = Number(row[1]) || DEFAULT_SETTINGS.traySize;
    if (row[0] === "kgPerSack") settings.kgPerSack = Number(row[1]) || DEFAULT_SETTINGS.kgPerSack;
    if (row[0] === "prices") {
      try {
        settings.prices = Object.assign({}, settings.prices, JSON.parse(row[1]));
      } catch (error) {
        settings.prices = DEFAULT_SETTINGS.prices;
      }
    }
  });

  return settings;
}

function writeSettings_(settings) {
  const sheet = getSheet_(SETTINGS_SHEET, ["key", "value"]);
  const next = settings || DEFAULT_SETTINGS;
  sheet.clearContents();
  sheet.getRange(1, 1, 4, 2).setValues([
    ["key", "value"],
    ["traySize", Number(next.traySize) || DEFAULT_SETTINGS.traySize],
    ["kgPerSack", Number(next.kgPerSack) || DEFAULT_SETTINGS.kgPerSack],
    ["prices", JSON.stringify(Object.assign({}, DEFAULT_SETTINGS.prices, next.prices || {}))],
  ]);
}

function readProductionLogs_() {
  const sheet = getSheet_(PRODUCTION_SHEET, PRODUCTION_HEADERS);
  const values = sheet.getDataRange().getValues();

  return values
    .slice(1)
    .filter((row) => row[0])
    .map(rowToProductionLog_)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function readExpenseLogs_() {
  const sheet = getSheet_(EXPENSE_SHEET, EXPENSE_HEADERS);
  const values = sheet.getDataRange().getValues();

  return values
    .slice(1)
    .filter((row) => row[0])
    .map(rowToExpenseLog_)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function upsertProductionLog_(log) {
  if (!log || !log.id) throw new Error("Missing production log id.");
  upsertRow_(PRODUCTION_SHEET, PRODUCTION_HEADERS, log.id, productionLogToRow_(log));
}

function upsertExpenseLog_(log) {
  if (!log || !log.id) throw new Error("Missing expense log id.");
  upsertRow_(EXPENSE_SHEET, EXPENSE_HEADERS, log.id, expenseLogToRow_(log));
}

function upsertRow_(sheetName, headers, id, row) {
  const sheet = getSheet_(sheetName, headers);
  const values = sheet.getDataRange().getValues();
  const ids = values.slice(1).map((item) => item[0]);
  const index = ids.indexOf(id);

  if (index >= 0) {
    sheet.getRange(index + 2, 1, 1, headers.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function deleteById_(sheetName, headers, id) {
  if (!id) return;

  const sheet = getSheet_(sheetName, headers);
  const values = sheet.getDataRange().getValues();

  for (let index = values.length - 1; index >= 1; index -= 1) {
    if (values[index][0] === id) {
      sheet.deleteRow(index + 1);
      return;
    }
  }
}

function replaceProductionLogs_(logs) {
  const sheet = getSheet_(PRODUCTION_SHEET, PRODUCTION_HEADERS);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, PRODUCTION_HEADERS.length).setValues([PRODUCTION_HEADERS]);
  if (logs.length) sheet.getRange(2, 1, logs.length, PRODUCTION_HEADERS.length).setValues(logs.map(productionLogToRow_));
}

function replaceExpenseLogs_(logs) {
  const sheet = getSheet_(EXPENSE_SHEET, EXPENSE_HEADERS);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, EXPENSE_HEADERS.length).setValues([EXPENSE_HEADERS]);
  if (logs.length) sheet.getRange(2, 1, logs.length, EXPENSE_HEADERS.length).setValues(logs.map(expenseLogToRow_));
}

function rowToProductionLog_(row) {
  return {
    id: row[0],
    date: asDateString_(row[1]),
    flockName: row[2] || "",
    harvest: {
      small: Number(row[3]) || 0,
      medium: Number(row[4]) || 0,
      large: Number(row[5]) || 0,
      xl: Number(row[6]) || 0,
      jumbo: Number(row[7]) || 0,
      rejects: Number(row[8]) || 0,
    },
    sold: {
      small: Number(row[9]) || 0,
      medium: Number(row[10]) || 0,
      large: Number(row[11]) || 0,
      xl: Number(row[12]) || 0,
      jumbo: Number(row[13]) || 0,
    },
    feedUsedKg: Number(row[14]) || 0,
    productionNotes: row[15] || "",
    salesNotes: row[16] || "",
    createdAt: row[17] || "",
    updatedAt: row[18] || "",
  };
}

function rowToExpenseLog_(row) {
  return {
    id: row[0],
    date: asDateString_(row[1]),
    category: row[2] || "other",
    frequency: row[3] || "one-time",
    amount: Number(row[4]) || 0,
    feedSacks: Number(row[5]) || 0,
    kgPerSack: Number(row[6]) || DEFAULT_SETTINGS.kgPerSack,
    description: row[7] || "",
    createdAt: row[8] || "",
    updatedAt: row[9] || "",
  };
}

function productionLogToRow_(log) {
  const harvest = log.harvest || {};
  const sold = log.sold || {};

  return [
    log.id,
    log.date,
    log.flockName || "",
    Number(harvest.small) || 0,
    Number(harvest.medium) || 0,
    Number(harvest.large) || 0,
    Number(harvest.xl) || 0,
    Number(harvest.jumbo) || 0,
    Number(harvest.rejects) || 0,
    Number(sold.small) || 0,
    Number(sold.medium) || 0,
    Number(sold.large) || 0,
    Number(sold.xl) || 0,
    Number(sold.jumbo) || 0,
    Number(log.feedUsedKg) || 0,
    log.productionNotes || "",
    log.salesNotes || "",
    log.createdAt || new Date().toISOString(),
    new Date().toISOString(),
  ];
}

function expenseLogToRow_(log) {
  return [
    log.id,
    log.date,
    log.category || "other",
    log.frequency || "one-time",
    Number(log.amount) || 0,
    Number(log.feedSacks) || 0,
    Number(log.kgPerSack) || DEFAULT_SETTINGS.kgPerSack,
    log.description || "",
    log.createdAt || new Date().toISOString(),
    new Date().toISOString(),
  ];
}

function asDateString_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return String(value || "");
}
