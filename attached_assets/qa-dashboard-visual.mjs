import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const OUT_DIR = process.env.OUT_DIR || "attached_assets/qa";

const nowIso = new Date().toISOString();

const mockUser = {
  user: {
    id: 123,
    email: "qa@example.com",
    name: "QA Tester",
    role: "user",
    phone: "+54 9 11 1234 5678",
    businessName: "Yaguar Studio",
    profilePhotoUrl: null,
    createdAt: nowIso,
  },
  subscription: {
    planName: "Pro",
    planSlug: "pro",
    limits: { dtfQuotes: 100, mockupPngs: 50, pdfExports: 40 },
    status: "active",
    periodEnd: nowIso,
  },
};

const mockUsage = {
  usage: { dtfQuotes: 4, mockupPngs: 2, pdfExports: 1 },
  limits: { dtfQuotes: 100, mockupPngs: 50, pdfExports: 40 },
  remaining: { dtfQuotes: 96, mockupPngs: 48, pdfExports: 39 },
};

const mockUsageEvents = {
  events: [
    { id: 1, eventType: "dtf_quotes", metadata: null, createdAt: nowIso },
    { id: 2, eventType: "mockup_pngs", metadata: null, createdAt: nowIso },
  ],
};

const mockOrderStats = { activeOrders: 3, monthOrders: 6 };

const mockTransactions = {
  monthIncome: "450000",
  monthExpenses: "170000",
  balance: "280000",
  incomeByCategory: [],
  expenseByCategory: [],
  monthlyChart: [],
};

async function attachApiMocks(page) {
  await page.route("**/api/healthz/db", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockUser) });
  });

  await page.route("**/api/usage", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockUsage) });
  });

  await page.route("**/api/usage/events?*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockUsageEvents) });
  });

  await page.route("**/api/orders/stats", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockOrderStats) });
  });

  await page.route("**/api/transactions/summary", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockTransactions) });
  });
}

async function captureSet(label, contextOptions) {
  const browser = await chromium.launch();
  const context = await browser.newContext(contextOptions);

  await context.addInitScript(() => {
    window.localStorage.setItem("dtf:post-auth-welcome", JSON.stringify({ kind: "register", ts: Date.now() }));
    window.localStorage.removeItem("dtf:onboarding-checklist:123");
    window.localStorage.removeItem("dtf:dashboard-tour:123");
  });

  const page = await context.newPage();
  await attachApiMocks(page);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
  await page.getByText("Tour de inicio", { exact: false }).waitFor({ timeout: 8000 });

  const tourPath = join(OUT_DIR, `dashboard-tour-${label}.png`);
  await page.screenshot({ path: tourPath, fullPage: true });

  await page.keyboard.press("Escape");
  await page.getByText("Primeros pasos", { exact: false }).waitFor({ timeout: 8000 });

  const checklistPath = join(OUT_DIR, `dashboard-checklist-${label}.png`);
  await page.screenshot({ path: checklistPath, fullPage: true });

  await context.close();
  await browser.close();

  return { tourPath, checklistPath };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const desktop = await captureSet("desktop", { viewport: { width: 1440, height: 900 } });
  const mobile = await captureSet("mobile", { ...devices["iPhone 13"] });

  console.log("Visual QA screenshots created:");
  console.log(desktop.tourPath);
  console.log(desktop.checklistPath);
  console.log(mobile.tourPath);
  console.log(mobile.checklistPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
