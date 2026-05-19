const EGG_SIZES = [
  { key: "small", label: "Small", code: "S", defaultTrayPrice: 180 },
  { key: "medium", label: "Medium", code: "M", defaultTrayPrice: 200 },
  { key: "large", label: "Large", code: "L", defaultTrayPrice: 220 },
  { key: "xl", label: "XL", code: "XL", defaultTrayPrice: 240 },
  { key: "jumbo", label: "Jumbo", code: "J", defaultTrayPrice: 260 },
  { key: "rejects", label: "Cracked / rejects", code: "R", defaultTrayPrice: 0 },
];

const SALE_SIZES = EGG_SIZES.filter((size) => size.key !== "rejects");
const EXPENSE_CATEGORIES = ["feed", "salary", "medicine", "utilities", "maintenance", "other"];
const DEFAULT_SETTINGS = {
  traySize: 30,
  kgPerSack: 50,
  prices: Object.fromEntries(EGG_SIZES.map((size) => [size.key, size.defaultTrayPrice])),
};
const STORAGE_KEY = "egg-ledger-data-v2";
const LEGACY_STORAGE_KEY = "egg-ledger-data-v1";
const API_URL = "https://script.google.com/macros/s/AKfycbzQr91f-gDCYCBXIcJehiUuhTPzuefJYiCwo6eDUXwWxDyz8fgc4cpgvxxaZeKV6MOs/exec";

const state = {
  settings: structuredClone(DEFAULT_SETTINGS),
  productionLogs: [],
  expenseLogs: [],
  editingProductionId: null,
  editingExpenseId: null,
};

const elements = {
  productionForm: document.querySelector("#production-form"),
  salesForm: document.querySelector("#sales-form"),
  expenseForm: document.querySelector("#expense-form"),
  priceForm: document.querySelector("#price-form"),
  productionDate: document.querySelector("#production-date"),
  salesDate: document.querySelector("#sales-date"),
  expenseDate: document.querySelector("#expense-date"),
  flockName: document.querySelector("#flock-name"),
  feedUsedKg: document.querySelector("#feed-used-kg"),
  productionNotes: document.querySelector("#production-notes"),
  salesNotes: document.querySelector("#sales-notes"),
  harvestInputs: document.querySelector("#harvest-inputs"),
  soldInputs: document.querySelector("#sold-inputs"),
  priceInputs: document.querySelector("#price-inputs"),
  traySize: document.querySelector("#tray-size"),
  expenseCategory: document.querySelector("#expense-category"),
  expenseFrequency: document.querySelector("#expense-frequency"),
  expenseAmount: document.querySelector("#expense-amount"),
  feedSacks: document.querySelector("#feed-sacks"),
  kgPerSack: document.querySelector("#kg-per-sack"),
  expenseDescription: document.querySelector("#expense-description"),
  saveProduction: document.querySelector("#save-production"),
  saveSales: document.querySelector("#save-sales"),
  saveExpense: document.querySelector("#save-expense"),
  clearProduction: document.querySelector("#clear-production"),
  clearSales: document.querySelector("#clear-sales"),
  clearExpense: document.querySelector("#clear-expense"),
  productionStatus: document.querySelector("#production-status"),
  salesStatus: document.querySelector("#sales-status"),
  expenseStatus: document.querySelector("#expense-status"),
  priceStatus: document.querySelector("#price-status"),
  previewRevenue: document.querySelector("#preview-revenue"),
  previewSold: document.querySelector("#preview-sold"),
  previewFeedBought: document.querySelector("#preview-feed-bought"),
  previewExpense: document.querySelector("#preview-expense"),
  periodStart: document.querySelector("#period-start"),
  periodEnd: document.querySelector("#period-end"),
  netIncome: document.querySelector("#net-income"),
  netIncomeLabel: document.querySelector("#net-income-label"),
  totalRevenue: document.querySelector("#total-revenue"),
  totalSold: document.querySelector("#total-sold"),
  totalExpenses: document.querySelector("#total-expenses"),
  feedPurchased: document.querySelector("#feed-purchased"),
  feedBalance: document.querySelector("#feed-balance"),
  feedUsed: document.querySelector("#feed-used"),
  periodNet: document.querySelector("#period-net"),
  periodCount: document.querySelector("#period-count"),
  periodRevenue: document.querySelector("#period-revenue"),
  periodSold: document.querySelector("#period-sold"),
  periodExpenses: document.querySelector("#period-expenses"),
  periodCostPerEgg: document.querySelector("#period-cost-per-egg"),
  periodHarvest: document.querySelector("#period-harvest"),
  periodAverage: document.querySelector("#period-average"),
  feedTotalBought: document.querySelector("#feed-total-bought"),
  feedTotalUsed: document.querySelector("#feed-total-used"),
  feedPeriodBalance: document.querySelector("#feed-period-balance"),
  feedPurchaseCount: document.querySelector("#feed-purchase-count"),
  statementRevenue: document.querySelector("#statement-revenue"),
  statementFeed: document.querySelector("#statement-feed"),
  statementSalary: document.querySelector("#statement-salary"),
  statementMedicine: document.querySelector("#statement-medicine"),
  statementUtilities: document.querySelector("#statement-utilities"),
  statementMaintenance: document.querySelector("#statement-maintenance"),
  statementOther: document.querySelector("#statement-other"),
  statementNet: document.querySelector("#statement-net"),
  sizeBreakdown: document.querySelector("#size-breakdown"),
  periodTable: document.querySelector("#period-table"),
  periodEmpty: document.querySelector("#period-empty"),
  exportCsv: document.querySelector("#export-csv"),
  exportJson: document.querySelector("#export-json"),
  importJson: document.querySelector("#import-json"),
};

function createId(prefix = "log") {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function firstDayOfMonth(dateString) {
  return `${dateString.slice(0, 7)}-01`;
}

function firstDayOfYear(dateString) {
  return `${dateString.slice(0, 4)}-01-01`;
}

function money(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function number(value, decimals = 0) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

function readNumber(input) {
  const value = Number.parseFloat(String(input.value).replaceAll(",", ""));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function inputName(prefix, key) {
  return `${prefix}-${key}`;
}

function apiIsConfigured() {
  return API_URL.startsWith("https://");
}

function pricePerEgg(sizeKey) {
  const traySize = Math.max(1, Number(state.settings.traySize) || DEFAULT_SETTINGS.traySize);
  return (Number(state.settings.prices[sizeKey]) || 0) / traySize;
}

function sumSizes(values, sizes = EGG_SIZES) {
  return sizes.reduce((total, size) => total + (Number(values?.[size.key]) || 0), 0);
}

function calculateProduction(log) {
  const harvestTotal = sumSizes(log.harvest);
  const soldTotal = sumSizes(log.sold, SALE_SIZES);
  const revenue = SALE_SIZES.reduce((total, size) => {
    return total + (Number(log.sold[size.key]) || 0) * pricePerEgg(size.key);
  }, 0);

  return {
    harvestTotal,
    soldTotal,
    revenue,
    feedUsedKg: Number(log.feedUsedKg) || 0,
  };
}

function calculateExpense(log) {
  const feedKgBought = (Number(log.feedSacks) || 0) * (Number(log.kgPerSack) || 0);
  return {
    amount: Number(log.amount) || 0,
    feedKgBought,
  };
}

function normalizeSettings(settings = {}) {
  return {
    traySize: Math.max(1, Number(settings.traySize) || DEFAULT_SETTINGS.traySize),
    kgPerSack: Math.max(1, Number(settings.kgPerSack) || DEFAULT_SETTINGS.kgPerSack),
    prices: {
      ...DEFAULT_SETTINGS.prices,
      ...Object.fromEntries(
        Object.entries(settings.prices || {}).map(([key, value]) => [key, Math.max(0, Number(value) || 0)])
      ),
    },
  };
}

function normalizeProductionLog(log = {}) {
  const harvest = Object.fromEntries(EGG_SIZES.map((size) => [size.key, Number(log.harvest?.[size.key]) || 0]));
  const sold = Object.fromEntries(SALE_SIZES.map((size) => [size.key, Number(log.sold?.[size.key]) || 0]));

  return {
    id: log.id || createId("production"),
    date: log.date || today(),
    flockName: String(log.flockName || "").trim(),
    harvest,
    sold,
    feedUsedKg: Number(log.feedUsedKg) || Number(log.feedBags) || 0,
    productionNotes: String(log.productionNotes || log.notes || "").trim(),
    salesNotes: String(log.salesNotes || "").trim(),
    createdAt: log.createdAt || new Date().toISOString(),
    updatedAt: log.updatedAt || new Date().toISOString(),
  };
}

function normalizeExpenseLog(log = {}) {
  const category = EXPENSE_CATEGORIES.includes(log.category) ? log.category : "other";
  const kgPerSack = Number(log.kgPerSack) || state.settings.kgPerSack || DEFAULT_SETTINGS.kgPerSack;

  return {
    id: log.id || createId("expense"),
    date: log.date || today(),
    category,
    frequency: ["one-time", "daily", "monthly"].includes(log.frequency) ? log.frequency : "one-time",
    amount: Number(log.amount) || 0,
    feedSacks: category === "feed" ? Number(log.feedSacks) || 0 : 0,
    kgPerSack,
    description: String(log.description || "").trim(),
    createdAt: log.createdAt || new Date().toISOString(),
    updatedAt: log.updatedAt || new Date().toISOString(),
  };
}

function legacyEntriesToLogs(entries = []) {
  const productionLogs = [];
  const expenseLogs = [];

  entries.forEach((entry) => {
    const production = normalizeProductionLog({
      id: entry.id,
      date: entry.date,
      flockName: entry.flockName,
      harvest: entry.harvest,
      sold: entry.sold,
      feedUsedKg: entry.feedUsedKg || 0,
      productionNotes: entry.notes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
    productionLogs.push(production);

    const expenseLines = entry.expenses || {};
    const categoryMap = {
      feedCost: "feed",
      salaryCost: "salary",
      medicineCost: "medicine",
      utilitiesCost: "utilities",
      otherCost: "other",
    };

    Object.entries(categoryMap).forEach(([key, category]) => {
      const amount = Number(expenseLines[key]) || 0;
      if (!amount) return;

      expenseLogs.push(normalizeExpenseLog({
        id: `${entry.id}-${category}`,
        date: entry.date,
        category,
        frequency: "one-time",
        amount,
        description: "Migrated from daily log",
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }));
    });
  });

  return { productionLogs, expenseLogs };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.settings = normalizeSettings(parsed.settings);
    state.productionLogs = Array.isArray(parsed.productionLogs)
      ? parsed.productionLogs.map(normalizeProductionLog)
      : [];
    state.expenseLogs = Array.isArray(parsed.expenseLogs)
      ? parsed.expenseLogs.map(normalizeExpenseLog)
      : [];

    if (!state.productionLogs.length && !state.expenseLogs.length) {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "{}");
      if (Array.isArray(legacy.entries)) {
        state.settings = normalizeSettings(legacy.settings);
        const migrated = legacyEntriesToLogs(legacy.entries);
        state.productionLogs = migrated.productionLogs;
        state.expenseLogs = migrated.expenseLogs;
        saveState();
      }
    }
  } catch {
    state.settings = structuredClone(DEFAULT_SETTINGS);
    state.productionLogs = [];
    state.expenseLogs = [];
  }

  sortLogs();
}

function sortLogs() {
  state.productionLogs.sort((a, b) => b.date.localeCompare(a.date));
  state.expenseLogs.sort((a, b) => b.date.localeCompare(a.date));
}

function saveState() {
  sortLogs();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings: state.settings,
      productionLogs: state.productionLogs,
      expenseLogs: state.expenseLogs,
    })
  );
}

function readRemotePayload(data) {
  state.settings = normalizeSettings(data.settings);

  if (Array.isArray(data.productionLogs) || Array.isArray(data.expenseLogs)) {
    state.productionLogs = Array.isArray(data.productionLogs) ? data.productionLogs.map(normalizeProductionLog) : [];
    state.expenseLogs = Array.isArray(data.expenseLogs) ? data.expenseLogs.map(normalizeExpenseLog) : [];
  } else if (Array.isArray(data.entries)) {
    const migrated = legacyEntriesToLogs(data.entries);
    state.productionLogs = migrated.productionLogs;
    state.expenseLogs = migrated.expenseLogs;
  }

  saveState();
}

async function loadRemoteState() {
  if (!apiIsConfigured()) return;

  const response = await fetch(API_URL);
  if (!response.ok) throw new Error("Shared farm records could not be loaded.");
  readRemotePayload(await response.json());
}

async function syncRemote(payload) {
  if (!apiIsConfigured()) return;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("The shared sheet did not save the latest change.");
  readRemotePayload(await response.json());
}

function makeNumberInput({ id, value = "", step = "1" }) {
  const input = document.createElement("input");
  input.id = id;
  input.name = id;
  input.type = "text";
  input.inputMode = step === "1" ? "numeric" : "decimal";
  input.placeholder = "0";
  input.value = value;
  return input;
}

function buildSizeInputs() {
  EGG_SIZES.forEach((size) => {
    const harvestInput = document.querySelector(`#${inputName("harvest", size.key)}`);
    if (harvestInput) {
      harvestInput.inputMode = "numeric";
      harvestInput.placeholder = "0";
    }
  });
  SALE_SIZES.forEach((size) => {
    const soldInput = document.querySelector(`#${inputName("sold", size.key)}`);
    if (soldInput) {
      soldInput.inputMode = "numeric";
      soldInput.placeholder = "0";
    }
  });
}

function buildPriceInputs() {
  const cards = EGG_SIZES.map((size) => {
    const card = document.createElement("label");
    card.className = "price-card";
    card.innerHTML = `<span>${size.label}<b class="size-code">${size.code}</b></span>`;
    card.append(makeNumberInput({
      id: inputName("price", size.key),
      value: state.settings.prices[size.key],
      step: "0.01",
    }));
    return card;
  });

  elements.priceInputs.replaceChildren(...cards);
}

function readProductionForm() {
  return normalizeProductionLog({
    id: state.editingProductionId,
    date: elements.productionDate.value || today(),
    flockName: elements.flockName.value,
    harvest: Object.fromEntries(
      EGG_SIZES.map((size) => [size.key, readNumber(document.querySelector(`#${inputName("harvest", size.key)}`))])
    ),
    feedUsedKg: readNumber(elements.feedUsedKg),
    productionNotes: elements.productionNotes.value,
  });
}

function readSalesForm() {
  return normalizeProductionLog({
    id: state.editingProductionId,
    date: elements.salesDate.value || today(),
    sold: Object.fromEntries(
      SALE_SIZES.map((size) => [size.key, readNumber(document.querySelector(`#${inputName("sold", size.key)}`))])
    ),
    salesNotes: elements.salesNotes.value,
  });
}

function readExpenseForm() {
  return normalizeExpenseLog({
    id: state.editingExpenseId,
    date: elements.expenseDate.value || today(),
    category: elements.expenseCategory.value,
    frequency: elements.expenseFrequency.value,
    amount: readNumber(elements.expenseAmount),
    feedSacks: readNumber(elements.feedSacks),
    kgPerSack: readNumber(elements.kgPerSack) || state.settings.kgPerSack,
    description: elements.expenseDescription.value,
  });
}

function mergeProductionLog(incoming, mode) {
  const existingIndex = state.productionLogs.findIndex((log) => log.date === incoming.date);
  const existing = existingIndex >= 0 ? state.productionLogs[existingIndex] : normalizeProductionLog({ date: incoming.date });
  const merged = {
    ...existing,
    id: existing.id || incoming.id,
    date: incoming.date,
    updatedAt: new Date().toISOString(),
  };

  if (mode === "production") {
    merged.flockName = incoming.flockName;
    merged.harvest = incoming.harvest;
    merged.feedUsedKg = incoming.feedUsedKg;
    merged.productionNotes = incoming.productionNotes;
  }

  if (mode === "sales") {
    merged.sold = incoming.sold;
    merged.salesNotes = incoming.salesNotes;
  }

  if (existingIndex >= 0) {
    state.productionLogs[existingIndex] = normalizeProductionLog(merged);
  } else {
    state.productionLogs.unshift(normalizeProductionLog(merged));
  }

  saveState();
  return normalizeProductionLog(merged);
}

async function saveProduction(event) {
  event.preventDefault();
  const log = mergeProductionLog(readProductionForm(), "production");
  clearProductionForm();
  render();
  elements.productionStatus.textContent = `Saved harvest for ${log.date}.`;

  try {
    await syncRemote({ action: "upsertProductionLog", productionLog: log, settings: state.settings });
    render();
    elements.productionStatus.textContent = `Saved and synced harvest for ${log.date}.`;
  } catch (error) {
    elements.productionStatus.textContent = `${error.message} The phone copy was still saved.`;
  }
}

async function saveSales(event) {
  event.preventDefault();
  const log = mergeProductionLog(readSalesForm(), "sales");
  clearSalesForm();
  render();
  elements.salesStatus.textContent = `Saved sales for ${log.date}.`;

  try {
    await syncRemote({ action: "upsertProductionLog", productionLog: log, settings: state.settings });
    render();
    elements.salesStatus.textContent = `Saved and synced sales for ${log.date}.`;
  } catch (error) {
    elements.salesStatus.textContent = `${error.message} The phone copy was still saved.`;
  }
}

async function saveExpense(event) {
  event.preventDefault();
  const log = readExpenseForm();
  const existingIndex = state.expenseLogs.findIndex((item) => item.id === log.id);

  if (existingIndex >= 0) {
    state.expenseLogs[existingIndex] = log;
  } else {
    state.expenseLogs.unshift(log);
  }

  state.settings.kgPerSack = log.kgPerSack || state.settings.kgPerSack;
  saveState();
  clearExpenseForm();
  render();
  elements.expenseStatus.textContent = `Saved ${log.category} expense for ${log.date}.`;

  try {
    await syncRemote({ action: "upsertExpenseLog", expenseLog: log, settings: state.settings });
    render();
    elements.expenseStatus.textContent = `Saved and synced ${log.category} expense for ${log.date}.`;
  } catch (error) {
    elements.expenseStatus.textContent = `${error.message} The phone copy was still saved.`;
  }
}

function clearProductionForm() {
  state.editingProductionId = null;
  elements.productionForm.reset();
  elements.productionDate.value = today();
  elements.saveProduction.textContent = "Save Harvest";
  elements.productionStatus.textContent = "";
  renderProductionPreview();
}

function clearSalesForm() {
  elements.salesForm.reset();
  elements.salesDate.value = today();
  elements.saveSales.textContent = "Save Sales";
  elements.salesStatus.textContent = "";
  renderSalesPreview();
}

function clearExpenseForm() {
  state.editingExpenseId = null;
  elements.expenseForm.reset();
  elements.expenseDate.value = today();
  elements.kgPerSack.value = state.settings.kgPerSack;
  elements.saveExpense.textContent = "Save Expense";
  elements.expenseStatus.textContent = "";
  renderExpensePreview();
}

function renderSalesPreview() {
  const log = readSalesForm();
  const totals = calculateProduction(log);
  elements.previewRevenue.textContent = money(totals.revenue);
  elements.previewSold.textContent = number(totals.soldTotal);
}

function renderProductionPreview() {}

function renderExpensePreview() {
  const log = readExpenseForm();
  const totals = calculateExpense(log);
  elements.previewFeedBought.textContent = `${number(totals.feedKgBought, 2)} kg`;
  elements.previewExpense.textContent = money(totals.amount);
}

function periodProductionLogs() {
  const start = elements.periodStart.value;
  const end = elements.periodEnd.value;

  return state.productionLogs.filter((log) => {
    if (start && log.date < start) return false;
    if (end && log.date > end) return false;
    return true;
  });
}

function periodExpenseLogs() {
  const start = elements.periodStart.value;
  const end = elements.periodEnd.value;

  return state.expenseLogs.filter((log) => {
    if (start && log.date < start) return false;
    if (end && log.date > end) return false;
    return true;
  });
}

function emptyPeriodTotals() {
  return {
    revenue: 0,
    expenses: 0,
    net: 0,
    harvest: 0,
    sold: 0,
    feedUsedKg: 0,
    feedBoughtKg: 0,
    feedPurchaseLogs: 0,
    expenseLines: Object.fromEntries(EXPENSE_CATEGORIES.map((category) => [category, 0])),
    harvestBySize: Object.fromEntries(EGG_SIZES.map((size) => [size.key, 0])),
    soldBySize: Object.fromEntries(SALE_SIZES.map((size) => [size.key, 0])),
  };
}

function calculatePeriod(productionLogs, expenseLogs) {
  const totals = emptyPeriodTotals();

  productionLogs.forEach((log) => {
    const logTotals = calculateProduction(log);
    totals.revenue += logTotals.revenue;
    totals.harvest += logTotals.harvestTotal;
    totals.sold += logTotals.soldTotal;
    totals.feedUsedKg += logTotals.feedUsedKg;

    EGG_SIZES.forEach((size) => {
      totals.harvestBySize[size.key] += Number(log.harvest[size.key]) || 0;
    });
    SALE_SIZES.forEach((size) => {
      totals.soldBySize[size.key] += Number(log.sold[size.key]) || 0;
    });
  });

  expenseLogs.forEach((log) => {
    const expense = calculateExpense(log);
    totals.expenses += expense.amount;
    totals.expenseLines[log.category] += expense.amount;
    totals.feedBoughtKg += expense.feedKgBought;
    if (log.category === "feed") totals.feedPurchaseLogs += 1;
  });

  totals.net = totals.revenue - totals.expenses;
  return totals;
}

function renderPrices() {
  elements.traySize.value = state.settings.traySize;
  elements.kgPerSack.value = state.settings.kgPerSack;
  EGG_SIZES.forEach((size) => {
    const input = document.querySelector(`#${inputName("price", size.key)}`);
    if (input) input.value = state.settings.prices[size.key];
  });
}

function renderFinancials() {
  const productionLogs = periodProductionLogs().sort((a, b) => b.date.localeCompare(a.date));
  const expenseLogs = periodExpenseLogs().sort((a, b) => b.date.localeCompare(a.date));
  const totals = calculatePeriod(productionLogs, expenseLogs);
  const dayCount = productionLogs.length || 1;
  const activityCount = productionLogs.length + expenseLogs.length;
  const feedBalance = totals.feedBoughtKg - totals.feedUsedKg;

  elements.netIncome.textContent = money(totals.net);
  elements.netIncomeLabel.textContent = `${activityCount} period logs`;
  elements.totalRevenue.textContent = money(totals.revenue);
  elements.totalSold.textContent = `${number(totals.sold)} eggs sold`;
  elements.totalExpenses.textContent = money(totals.expenses);
  elements.feedPurchased.textContent = `${number(totals.feedBoughtKg, 2)} kg feed bought`;
  elements.feedBalance.textContent = `${number(feedBalance, 2)} kg`;
  elements.feedUsed.textContent = `${number(totals.feedUsedKg, 2)} kg feed used`;

  elements.periodNet.textContent = money(totals.net);
  elements.periodCount.textContent = `${activityCount} ${activityCount === 1 ? "log" : "logs"}`;
  elements.periodRevenue.textContent = money(totals.revenue);
  elements.periodSold.textContent = `${number(totals.sold)} eggs sold`;
  elements.periodExpenses.textContent = money(totals.expenses);
  elements.periodCostPerEgg.textContent = `Cost per egg: ${money(totals.harvest ? totals.expenses / totals.harvest : 0)}`;
  elements.periodHarvest.textContent = `${number(totals.harvest)} ${totals.harvest === 1 ? "egg" : "eggs"}`;
  elements.periodAverage.textContent = `Daily average: ${number(Math.round(totals.harvest / dayCount))} eggs`;
  elements.feedTotalBought.textContent = `${number(totals.feedBoughtKg, 2)} kg`;
  elements.feedTotalUsed.textContent = `${number(totals.feedUsedKg, 2)} kg`;
  elements.feedPeriodBalance.textContent = `${number(feedBalance, 2)} kg`;
  elements.feedPurchaseCount.textContent = `${totals.feedPurchaseLogs} ${totals.feedPurchaseLogs === 1 ? "log" : "logs"}`;

  elements.statementRevenue.textContent = money(totals.revenue);
  elements.statementFeed.textContent = money(totals.expenseLines.feed);
  elements.statementSalary.textContent = money(totals.expenseLines.salary);
  elements.statementMedicine.textContent = money(totals.expenseLines.medicine);
  elements.statementUtilities.textContent = money(totals.expenseLines.utilities);
  elements.statementMaintenance.textContent = money(totals.expenseLines.maintenance);
  elements.statementOther.textContent = money(totals.expenseLines.other);
  elements.statementNet.textContent = money(totals.net);

  elements.sizeBreakdown.replaceChildren(...EGG_SIZES.map((size) => {
    const row = document.createElement("div");
    const sold = size.key === "rejects" ? "not sold" : `${number(totals.soldBySize[size.key])} sold`;
    row.className = "breakdown-row";
    row.innerHTML = `<span>${size.label}</span><strong>${number(totals.harvestBySize[size.key])} harvested, ${sold}</strong>`;
    return row;
  }));

  const activityRows = [
    ...productionLogs.map((log) => ({ type: "Harvest/Sales", date: log.date, log })),
    ...expenseLogs.map((log) => ({ type: "Expense", date: log.date, log })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  elements.periodTable.replaceChildren(...activityRows.map(createActivityRow));
  elements.periodEmpty.classList.toggle("is-visible", activityRows.length === 0);
}

function createActivityRow(item) {
  const row = document.createElement("div");
  row.className = "period-row";

  if (item.type === "Harvest/Sales") {
    const totals = calculateProduction(item.log);
    row.innerHTML = `
      <strong>${item.date}</strong>
      <span>${item.type}</span>
      <span>${number(totals.harvestTotal)} harvested</span>
      <span>${number(totals.soldTotal)} sold</span>
      <span>${number(totals.feedUsedKg, 2)} kg feed used</span>
      <span>${money(totals.revenue)} revenue</span>
    `;
    return row;
  }

  const totals = calculateExpense(item.log);
  row.innerHTML = `
    <strong>${item.date}</strong>
    <span>${item.log.category} (${item.log.frequency})</span>
    <span>${item.log.description || "No description"}</span>
    <span>${number(totals.feedKgBought, 2)} kg feed bought</span>
    <span>${money(totals.amount)} expense</span>
    <span></span>
  `;
  return row;
}

async function savePrices(event) {
  event.preventDefault();
  state.settings = normalizeSettings({
    traySize: readNumber(elements.traySize) || DEFAULT_SETTINGS.traySize,
    kgPerSack: readNumber(elements.kgPerSack) || state.settings.kgPerSack,
    prices: Object.fromEntries(
      EGG_SIZES.map((size) => [size.key, readNumber(document.querySelector(`#${inputName("price", size.key)}`))])
    ),
  });
  saveState();
  elements.priceStatus.textContent = "Prices saved.";
  render();

  try {
    await syncRemote({ action: "saveSettings", settings: state.settings });
    render();
    elements.priceStatus.textContent = "Prices saved and synced.";
  } catch (error) {
    elements.priceStatus.textContent = `${error.message} The phone copy was still saved.`;
  }
}

function resetPrices() {
  state.settings = structuredClone(DEFAULT_SETTINGS);
  saveState();
  elements.priceStatus.textContent = "Default prices restored.";
  render();
}

function exportFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv() {
  const productionRows = state.productionLogs.map((log) => {
    const totals = calculateProduction(log);
    return [
      "production",
      log.date,
      log.flockName,
      ...EGG_SIZES.map((size) => log.harvest[size.key]),
      ...SALE_SIZES.map((size) => log.sold[size.key]),
      totals.feedUsedKg,
      "",
      "",
      "",
      totals.revenue.toFixed(2),
      log.productionNotes || log.salesNotes,
    ].map(csvValue).join(",");
  });
  const expenseRows = state.expenseLogs.map((log) => {
    const totals = calculateExpense(log);
    return [
      "expense",
      log.date,
      "",
      ...EGG_SIZES.map(() => ""),
      ...SALE_SIZES.map(() => ""),
      "",
      log.category,
      log.frequency,
      totals.feedKgBought,
      `-${totals.amount.toFixed(2)}`,
      log.description,
    ].map(csvValue).join(",");
  });
  const headers = [
    "type",
    "date",
    "flock",
    ...EGG_SIZES.map((size) => `harvest_${size.key}`),
    ...SALE_SIZES.map((size) => `sold_${size.key}`),
    "feed_used_kg",
    "expense_category",
    "expense_type",
    "feed_bought_kg",
    "amount",
    "notes",
  ];

  exportFile(`egg-ledger-${today()}.csv`, "text/csv;charset=utf-8", [headers.join(","), ...productionRows, ...expenseRows].join("\n"));
}

function exportJson() {
  exportFile(
    `egg-ledger-backup-${today()}.json`,
    "application/json",
    JSON.stringify({
      settings: state.settings,
      productionLogs: state.productionLogs,
      expenseLogs: state.expenseLogs,
    }, null, 2)
  );
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    state.settings = normalizeSettings(parsed.settings);

    if (Array.isArray(parsed.productionLogs) || Array.isArray(parsed.expenseLogs)) {
      state.productionLogs = Array.isArray(parsed.productionLogs) ? parsed.productionLogs.map(normalizeProductionLog) : [];
      state.expenseLogs = Array.isArray(parsed.expenseLogs) ? parsed.expenseLogs.map(normalizeExpenseLog) : [];
    } else if (Array.isArray(parsed.entries)) {
      const migrated = legacyEntriesToLogs(parsed.entries);
      state.productionLogs = migrated.productionLogs;
      state.expenseLogs = migrated.expenseLogs;
    }

    saveState();
    render();
    await syncRemote({
      action: "replaceAll",
      settings: state.settings,
      productionLogs: state.productionLogs,
      expenseLogs: state.expenseLogs,
    });
    render();
  } catch {
    alert("The selected file could not be imported.");
  } finally {
    event.target.value = "";
  }
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === viewId);
  });
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewId);
  });
}

function applyPeriodPreset(preset) {
  const current = today();

  if (preset === "this-month") {
    elements.periodStart.value = firstDayOfMonth(current);
    elements.periodEnd.value = current;
  }

  if (preset === "last-30") {
    elements.periodStart.value = addDays(current, -29);
    elements.periodEnd.value = current;
  }

  if (preset === "year-to-date") {
    elements.periodStart.value = firstDayOfYear(current);
    elements.periodEnd.value = current;
  }

  if (preset === "all") {
    elements.periodStart.value = "";
    elements.periodEnd.value = "";
  }

  renderFinancials();
}

function render() {
  renderPrices();
  renderSalesPreview();
  renderExpensePreview();
  renderFinancials();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.view) showView(button.dataset.view);
  });
});
document.querySelectorAll("[data-period-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPeriodPreset(button.dataset.periodPreset));
});

elements.productionForm.addEventListener("submit", saveProduction);
elements.salesForm.addEventListener("submit", saveSales);
elements.expenseForm.addEventListener("submit", saveExpense);
elements.priceForm.addEventListener("submit", savePrices);
elements.salesForm.addEventListener("input", renderSalesPreview);
elements.expenseForm.addEventListener("input", renderExpensePreview);
elements.clearProduction.addEventListener("click", clearProductionForm);
elements.clearSales.addEventListener("click", clearSalesForm);
elements.clearExpense.addEventListener("click", clearExpenseForm);
document.querySelector("#reset-prices").addEventListener("click", resetPrices);
elements.periodStart.addEventListener("input", renderFinancials);
elements.periodEnd.addEventListener("input", renderFinancials);
elements.exportCsv.addEventListener("click", exportCsv);
elements.exportJson.addEventListener("click", exportJson);
elements.importJson.addEventListener("change", importJson);

async function init() {
  buildSizeInputs();
  loadState();
  buildPriceInputs();
  elements.productionDate.value = today();
  elements.salesDate.value = today();
  elements.expenseDate.value = today();
  elements.kgPerSack.value = state.settings.kgPerSack;
  applyPeriodPreset("this-month");
  render();

  try {
    await loadRemoteState();
    render();
  } catch (error) {
    elements.productionStatus.textContent = `${error.message} Showing this phone's saved records.`;
  }

  registerServiceWorker();
}

init();
