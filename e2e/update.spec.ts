/**
 * T33 — RF-40: una versión nueva se descarga en segundo plano, no cambia la página abierta
 * y se aplica la siguiente vez que se abre la app. Dos builds reales (A y B) servidos por un
 * servidor propio que cambia de uno a otro, como al publicar.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { startStaticServer, type StaticServer } from "./support/static-server";

const ROOT = join(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "guia-age-update-"));
const dirs = { A: join(work, "A"), B: join(work, "B") };
let server: StaticServer;

function build(id: "A" | "B") {
  const result = spawnSync(process.execPath, [join(ROOT, "node_modules", "vite", "bin", "vite.js"), "build", "--outDir", dirs[id], "--emptyOutDir"], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", GUIA_BUILD_ID: id },
  });
  if (result.status !== 0) throw new Error(result.stderr + result.stdout);
}

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(120_000); // dos builds; con todos los e2e en paralelo pueden pasar de los 30 s por defecto
  build("A");
  build("B");
  server = await startStaticServer(0, dirs.A);
});

test.afterAll(async () => {
  await server.close();
  rmSync(work, { recursive: true, force: true });
});

const buildId = (page: Page) => page.evaluate(() => document.documentElement.dataset.build);

test("RF-40 la versión nueva espera en segundo plano y se aplica al volver a abrir la app", async ({ context }) => {
  test.setTimeout(90_000);
  const url = `${server.url}/civ/franks?map=arabia`;

  // 1. Versión A instalada y abierta; el usuario está leyendo con el build order desplegado.
  let page = await context.newPage();
  await page.goto(url);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active!;
    if (worker.state !== "activated") {
      await new Promise<void>((resolve) => worker.addEventListener("statechange", () => worker.state === "activated" && resolve()));
    }
  });
  // Visita siguiente: la app se abre desde la copia guardada (la página la controla la versión A).
  await page.reload();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  expect(await buildId(page)).toBe("A");
  await page.getByRole("button", { name: "Ver build order paso a paso" }).click();
  await page.evaluate(() => ((window as unknown as { __sinRecarga: boolean }).__sinRecarga = true));

  // 2. Se publica la versión B; el navegador la busca (lo hace solo al navegar o cada cierto tiempo).
  server.serve(dirs.B);
  const waiting = await page.evaluate(async () => {
    const registration = (await navigator.serviceWorker.getRegistration())!;
    await registration.update();
    for (let i = 0; i < 100 && !registration.waiting; i++) await new Promise((r) => setTimeout(r, 100));
    return registration.waiting?.state ?? null;
  });
  expect(waiting, "la versión nueva queda descargada y en espera").toBe("installed");

  // 3. La página abierta no cambia: misma versión, sin recarga, mismo estado, sin avisos.
  await page.waitForTimeout(1000);
  expect(await buildId(page)).toBe("A");
  expect(await page.evaluate(() => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga)).toBe(true);
  await expect(page.getByRole("button", { name: "Ocultar build order" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);

  // 4. Se cierra la app y se vuelve a abrir: ahora es la versión B.
  //    (Al cerrarse la última pestaña, el navegador activa la versión en espera; puede tardar un instante.)
  let reopened: string | undefined;
  for (let attempt = 0; attempt < 10 && reopened !== "B"; attempt++) {
    await page.close();
    const blank = await context.newPage(); // mantiene vivo el contexto sin ser una pestaña de la app
    await blank.waitForTimeout(500);
    page = await context.newPage();
    await page.goto(url);
    reopened = await buildId(page);
    await blank.close();
  }
  expect(reopened).toBe("B");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Francos");
});
