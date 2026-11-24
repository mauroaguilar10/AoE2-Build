/**
 * T32 — Recorrido principal en navegadores reales (Chromium y WebKit), sobre el build.
 * Usa el contenido real del build de producción: las 10 civilizaciones del MVP tienen ficha en los 3 mapas;
 * las demás (p. ej. Bengalíes) no.
 */
import { expect, test, type Page } from "@playwright/test";

const title = (page: Page) => page.getByRole("heading", { level: 1 });
const mapLabel = (page: Page, name: string) => page.locator(".map-selector label", { hasText: name });
const checkedMap = (page: Page) => page.locator(".map-selector input:checked");

/** Marca la página: si sigue ahí al final, no hubo recarga. */
async function markPage(page: Page) {
  await page.evaluate(() => ((window as unknown as { __sinRecarga: boolean }).__sinRecarga = true));
}
async function expectSamePage(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga)).toBe(true);
}

test("RF-7 RF-8 RF-21 inicio → mapa → civilización → ES/EN → cambio de mapa, sin recargar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Con ficha táctica" })).toBeVisible();
  await expect(checkedMap(page)).toHaveValue("arabia"); // RF-3 primera visita
  await markPage(page);

  // Mapa y buscador
  await mapLabel(page, "Arena").click();
  await expect(checkedMap(page)).toHaveValue("arena");
  await page.getByRole("searchbox", { name: "Buscar civilización" }).fill("franc");
  await expect(page.locator(".civ-grid .civ-name")).toHaveText(["Francos"]);

  // RF-7 Civilización: su tarjeta con el mapa elegido
  await page.getByRole("link", { name: /^Francos/ }).click();
  await expect(page).toHaveURL("/civ/franks?map=arena");
  await expect(title(page)).toHaveText("Francos");
  await expect(checkedMap(page)).toHaveValue("arena");
  await expect(page.getByRole("region", { name: "Economía" })).toContainText("Subir a Feudal con");

  // RF-8 Cambio de mapa dentro de la tarjeta
  await mapLabel(page, "Arabia").click();
  await expect(page).toHaveURL("/civ/franks?map=arabia");
  await expect(title(page)).toHaveText("Francos");
  await expect(page.getByRole("region", { name: "Economía" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ataque" })).toContainText("Caballería de exploración");

  // RF-13 build order desplegado
  await page.getByRole("button", { name: "Ver build order paso a paso" }).click();
  await expect(page.getByRole("list", { name: "Build order" })).toBeVisible();

  // RF-21 ES → EN conservando civilización, mapa y plegado
  await page.getByRole("button", { name: "Cambiar idioma" }).click();
  await expect(title(page)).toHaveText("Franks");
  await expect(page).toHaveURL("/civ/franks?map=arabia");
  await expect(checkedMap(page)).toHaveValue("arabia");
  await expect(page.getByRole("button", { name: "Hide build order" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Attack" })).toContainText("Scout Cavalry");

  // Atrás: el inicio conserva el texto del buscador, ahora en inglés
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("searchbox", { name: "Search civilization" })).toHaveValue("franc");
  await expect(page.locator(".civ-grid .civ-name")).toHaveText(["Franks"]);

  await expectSamePage(page);
});

test("RF-10 una URL directa abre la tarjeta", async ({ page }) => {
  await page.goto("/civ/britons?map=black_forest");
  await expect(title(page)).toHaveText("Britanos");
  await expect(checkedMap(page)).toHaveValue("black_forest");
  await expect(page.getByRole("region", { name: "Datos del juego" })).toBeVisible();
});

test("RF-10 una URL directa a una tarjeta con ficha muestra su plan", async ({ page }) => {
  await page.goto("/civ/franks?map=arena");
  await expect(page.getByRole("region", { name: "Economía" })).toContainText("Subir a Feudal con");
});

test("RF-10 una URL directa a una civilización sin ficha avisa que aún no está disponible", async ({ page }) => {
  await page.goto("/civ/bengalis?map=arena");
  await expect(title(page)).toHaveText("Bengalíes");
  await expect(page.getByText("Ficha táctica aún no disponible para esta civilización")).toBeVisible();
  await expect(page.getByRole("region", { name: "Datos del juego" })).toBeVisible();
});

for (const address of ["/civ/atlanteans?map=arena", "/civ/franks?map=nomad", "/otra-cosa"]) {
  test(`RF-11 una URL inválida muestra el inicio con aviso: ${address}`, async ({ page }) => {
    await page.goto(address);
    await expect(page.getByRole("alert")).toHaveText("No se encontró la tarjeta");
    await expect(page.locator(".civ-grid .civ-name").first()).toBeVisible();
    await expect(page.getByRole("searchbox")).toBeVisible();
  });
}
