/**
 * T34 — NFR Rapidez sobre el build (dist/, generado por el webServer de Playwright):
 *  (1) tras la primera carga, navegar no hace ninguna petición de red;
 *  (2) con la app guardada, ≤ 1 s hasta ver la pantalla principal o la última tarjeta,
 *      en un móvil de gama media emulado con la CPU 4 veces más lenta (solo Chromium permite limitar la CPU);
 *  (3) presupuesto de tamaño: código ≤ 60 KB y datos ≤ 300 KB comprimidos.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { devices, expect, test, type Page } from "@playwright/test";
import { startStaticServer, type StaticServer } from "./support/static-server";

const DIST = join(import.meta.dirname, "..", "dist");
let server: StaticServer;

test.beforeAll(async () => {
  server = await startStaticServer(0, DIST);
});
test.afterAll(async () => {
  await server.close();
});

/** Espera a que la copia local esté completa y activa. */
async function waitForOfflineCopy(page: Page) {
  await page.evaluate(async () => {
    const worker = (await navigator.serviceWorker.ready).active!;
    if (worker.state !== "activated") {
      await new Promise<void>((resolve) => worker.addEventListener("statechange", () => worker.state === "activated" && resolve()));
    }
  });
}

/**
 * Peticiones al servidor provocadas por la navegación. No cuenta la comprobación de versión nueva del
 * service worker (sw.js y su biblioteca workbox-*.js): la hace el propio navegador cuando él decide
 * (WebKit, por ejemplo, al usar la app) y es justamente RF-40, no contenido que pida la navegación.
 */
const navigationRequests = (requests: string[]) => requests.filter((url) => !/^\/(sw|workbox-[\w-]+)\.js$/.test(url));

/** Abrir tarjetas, cambiar idioma, nomenclatura y mapa, buscar y volver: el uso normal de la app. */
async function browseEverything(page: Page) {
  await page.getByRole("link", { name: /^Francos/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Francos");
  await page.locator(".map-selector label", { hasText: "Arena" }).click();
  await page.locator(".map-selector label", { hasText: "Arabia" }).click();
  await page.getByRole("button", { name: "Ver build order paso a paso" }).click();
  await page.getByRole("combobox", { name: "Nombres oficiales" }).selectOption("es");
  await page.getByRole("button", { name: "Cambiar idioma" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Franks");
  await page.getByRole("link", { name: "Home" }).click();
  await page.getByRole("searchbox").fill("wu");
  await page.getByRole("link", { name: /^Wu/ }).click(); // la última de la cuadrícula
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wu");
  await page.goBack();
  await page.getByRole("button", { name: "Change language" }).click();
}

test.describe("NFR Rapidez (1): ninguna petición de red al navegar tras la carga", () => {
  test("en una visita siguiente (la app se abre desde la copia guardada)", async ({ page }) => {
    await page.goto(server.url);
    await waitForOfflineCopy(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Con ficha táctica" })).toBeVisible();

    server.requests.length = 0;
    await browseEverything(page);
    expect(navigationRequests(server.requests)).toEqual([]);
  });

  test("en la primera visita, una vez cargada", async ({ page }) => {
    await page.goto(server.url);
    await expect(page.getByRole("heading", { name: "Con ficha táctica" })).toBeVisible();
    await waitForOfflineCopy(page); // la copia local se descarga en segundo plano

    server.requests.length = 0;
    await browseEverything(page);
    expect(navigationRequests(server.requests)).toEqual([]);
  });
});

test.describe("NFR Rapidez (2): ≤ 1 s hasta ver contenido, móvil de gama media emulado", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "limitar la CPU solo es posible en Chromium");
  // Pantalla, escala y táctil de un Pixel 7 (sin su navegador por defecto, que forzaría otro proceso).
  const { defaultBrowserType: _browser, ...pixel7 } = devices["Pixel 7"];
  test.use({ ...pixel7, locale: "es-AR" });

  /** Milisegundos desde que se empieza a abrir la página hasta que hay contenido de la app en pantalla. */
  async function timeToContent(page: Page, path: string, selector: string): Promise<number> {
    await page.addInitScript(() => {
      new MutationObserver((_, observer) => {
        if (document.querySelector("#app main")) {
          (window as unknown as { __contentAt: number }).__contentAt = performance.now();
          observer.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(server.url + path);
    await expect(page.locator(selector).first()).toBeVisible();
    return page.evaluate(() => (window as unknown as { __contentAt: number }).__contentAt);
  }

  for (const [screen, path, selector] of [
    ["pantalla principal", "/", ".civ-grid"],
    ["última tarjeta", "/civ/franks?map=arabia", ".economy"],
  ] as const) {
    test(`${screen}: con la app guardada y la CPU ×4 más lenta`, async ({ page }) => {
      // Primera visita (sin limitar): se guarda la app en el dispositivo.
      await page.goto(server.url);
      await waitForOfflineCopy(page);

      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const ms = await timeToContent(page, path, selector);
      console.log(`${screen}: ${Math.round(ms)} ms hasta ver contenido (CPU ×4, Pixel 7)`);
      expect(ms).toBeLessThanOrEqual(1000);
    });
  }
});

test.describe("NFR Rapidez (3): presupuesto de tamaño", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "se mide sobre los archivos del build: basta una vez");

  const gz = (file: string) => gzipSync(readFileSync(join(DIST, "assets", file))).length / 1024;
  const assets = readdirSync(join(DIST, "assets"));

  test("código JS ≤ 60 KB comprimido", () => {
    const code = assets.filter((f) => f.endsWith(".js") && !f.startsWith("data-"));
    expect(code.length).toBeGreaterThan(0);
    const kb = code.reduce((sum, f) => sum + gz(f), 0);
    console.log(`código: ${kb.toFixed(1)} KB comprimido (${code.join(", ")})`);
    expect(kb).toBeLessThanOrEqual(60);
  });

  test("datos (juego y fichas) ≤ 300 KB comprimidos", () => {
    const data = assets.filter((f) => f.startsWith("data-") && f.endsWith(".js"));
    expect(data).toHaveLength(1);
    const kb = gz(data[0]!);
    console.log(`datos: ${kb.toFixed(1)} KB comprimido`);
    expect(kb).toBeLessThanOrEqual(300);
  });
});
