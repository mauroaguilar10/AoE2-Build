/**
 * T33 — Sin conexión (RF-38, RF-39) en navegadores reales, con el service worker del build.
 */
import { expect, test, type Page } from "@playwright/test";

const title = (page: Page) => page.getByRole("heading", { level: 1 });
/** Párrafos visibles del aviso de primera carga (solo el del idioma del navegador). */
const visibleNotice = (page: Page) => page.locator("#first-load-offline [data-lang]:visible");

/** Primera visita con conexión: espera a que el service worker esté activo con toda la app guardada. */
async function firstVisit(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Con ficha táctica" })).toBeVisible();
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active?.state !== "activated") {
      await new Promise<void>((resolve) =>
        registration.active?.addEventListener("statechange", () => registration.active?.state === "activated" && resolve()),
      );
    }
  });
}

test.describe("RF-38 sin conexión tras la primera visita", () => {
  test("RF-38 se puede consultar cualquier tarjeta, en ambos idiomas y nomenclaturas", async ({ page, context }) => {
    await firstVisit(page);
    await context.setOffline(true);

    // Una dirección de tarjeta abierta directamente, sin conexión
    await page.goto("/civ/franks?map=arabia");
    await expect(title(page)).toHaveText("Francos");
    await expect(page.getByRole("region", { name: "Economía" })).toBeVisible();
    await expect(page.locator(".card-header img")).toHaveJSProperty("complete", true);
    expect(await page.locator(".card-header img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    // Nomenclatura de España
    await page.getByRole("combobox", { name: "Nombres oficiales" }).selectOption("es");
    await expect(page.getByRole("region", { name: "Ataque" })).toContainText("caballería de exploración");

    // Inglés
    await page.getByRole("button", { name: "Cambiar idioma" }).click();
    await expect(page.getByRole("region", { name: "Attack" })).toContainText("Scout Cavalry");

    // Otra civilización y otro mapa, recargando la página sin conexión
    await page.goto("/civ/persians?map=black_forest");
    await expect(title(page)).toHaveText("Persians");
    await expect(page.getByRole("region", { name: "Own buildings" })).toBeVisible();

    // La pantalla principal con todos los escudos
    await page.goto("/");
    const shields = page.locator(".civ-grid img");
    await expect(shields).toHaveCount(56);
    await shields.last().scrollIntoViewIfNeeded();
    const broken = await shields.evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).filter((img) => img.complete && img.naturalWidth === 0).length,
    );
    expect(broken).toBe(0);
  });
});

test.describe("RF-39 primera visita sin conexión", () => {
  test("RF-39 si el código de la app no llega, se muestra el mensaje en el idioma del navegador", async ({ page }) => {
    // La página llega pero el resto no (conexión que se corta): primera visita, sin service worker.
    await page.route(/\/assets\/.*\.(js|css)$/, (route) => route.abort("internetdisconnected"));
    await page.goto("/");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(visibleNotice(page)).toHaveText(["Se necesita conexión para la primera carga"]);
    await expect(page.locator("#app")).toBeEmpty();
  });

  test("RF-39 en inglés si el navegador no está en español", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    await page.route(/\/assets\/.*\.(js|css)$/, (route) => route.abort("internetdisconnected"));
    await page.goto("/");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(visibleNotice(page)).toHaveText(["A connection is needed for the first load"]);
    await context.close();
  });
});
