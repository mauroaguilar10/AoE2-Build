import { defineConfig, devices } from "@playwright/test";

const PORT = 4174; // distinto del de `npm run serve` (4173) para no chocar con una vista previa abierta

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-AR", // primera visita en español (RF-22)
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    // TODO(T44): pasar a `npm run build` cuando estén las 30 fichas. Hasta entonces el build de borrador,
    // que solo se diferencia en que tolera las fichas que faltan.
    command: `npm run build:draft && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
