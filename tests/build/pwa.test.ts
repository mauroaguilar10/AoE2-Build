import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const outDir = mkdtempSync(join(tmpdir(), "guia-age-pwa-"));
const read = (file: string) => readFileSync(join(outDir, file), "utf8");

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

/** Ancho × alto de un PNG (cabecera IHDR). */
function pngSize(file: string): string {
  const png = readFileSync(join(outDir, file));
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

beforeAll(() => {
  // Build de borrador (el de producción exige las 30 fichas): genera las fichas y compila la app.
  const content = spawnSync(process.execPath, [join(ROOT, "tools", "build-content.ts"), "--allow-incomplete"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(content.status, content.stderr).toBe(0);
  const vite = spawnSync(process.execPath, [join(ROOT, "node_modules", "vite", "bin", "vite.js"), "build", "--outDir", outDir, "--emptyOutDir"], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production" }, // Vitest pone NODE_ENV=test; el build real no
  });
  expect(vite.status, vite.stderr + vite.stdout).toBe(0);
}, 120_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("T30 PWA: service worker, precache y manifiesto", () => {
  describe("el build genera el service worker y el manifiesto", () => {
    it("existen sw.js y manifest.webmanifest", () => {
      expect(existsSync(join(outDir, "sw.js"))).toBe(true);
      expect(existsSync(join(outDir, "manifest.webmanifest"))).toBe(true);
    });

    it("index.html enlaza el manifiesto, el ícono y el color de la barra", () => {
      const html = read("index.html");
      expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"/);
      expect(html).toMatch(/<link rel="icon" href="\/icon\.svg"/);
      expect(html).toMatch(/<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png"/);
      expect(html).toMatch(/<meta name="theme-color" content="#8a4a0b"/);
    });
  });

  describe("la app es instalable", () => {
    const manifest = () => JSON.parse(read("manifest.webmanifest")) as Record<string, unknown> & { icons: ManifestIcon[] };

    it("nombre, inicio, ámbito y modo de pantalla de una app", () => {
      const m = manifest();
      expect(m.name).toBe("Guía Age");
      expect(m.short_name).toBe("Guía Age");
      expect(m.start_url).toBe("/");
      expect(m.scope).toBe("/");
      expect(m.display).toBe("standalone");
      expect(m.theme_color).toBe("#8a4a0b");
      expect(m.background_color).toBe("#f6f3ee");
    });

    it("el nombre no sugiere que la publica Microsoft (Game Content Usage Rules)", () => {
      expect(String(manifest().name)).not.toMatch(/Age of Empires|Microsoft/i);
    });

    it("íconos PNG de 192 y 512 px, y uno adaptable (maskable), con su tamaño real", () => {
      const icons = manifest().icons;
      const find = (sizes: string, purpose = "any") => icons.find((i) => i.sizes === sizes && (i.purpose ?? "any") === purpose);
      for (const [sizes, purpose] of [["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"]] as const) {
        const icon = find(sizes, purpose);
        expect(icon, `${sizes} ${purpose}`).toBeDefined();
        expect(icon!.type).toBe("image/png");
        expect(pngSize(icon!.src.replace(/^\//, ""))).toBe(sizes);
      }
    });
  });

  describe("RF-38 precache completo: todo funciona sin conexión tras la primera visita", () => {
    const sw = () => read("sw.js");
    const precached = () => [...sw().matchAll(/url:"([^"]+)"/g)].map((m) => m[1]!);

    it("RF-38 la página, el código, los estilos y el manifiesto", () => {
      const urls = precached();
      expect(urls).toContain("index.html");
      expect(urls).toContain("manifest.webmanifest");
      expect(urls.some((u) => /^assets\/index-.*\.js$/.test(u))).toBe(true);
      expect(urls.some((u) => /^assets\/index-.*\.css$/.test(u))).toBe(true);
    });

    it("RF-38 los 56 escudos y los íconos", () => {
      const urls = precached();
      const shields = readdirSync(join(outDir, "assets")).filter((f) => f.endsWith(".png"));
      expect(shields).toHaveLength(56);
      for (const shield of shields) expect(urls).toContain(`assets/${shield}`);
      for (const icon of ["icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"]) {
        expect(urls).toContain(icon);
      }
    });

    it("cada archivo aparece una sola vez en el precache", () => {
      const urls = precached();
      expect(urls.length).toBe(new Set(urls).size);
    });

    it("RF-38 todo lo que genera el build está en el precache (nada se pide a la red)", () => {
      const urls = new Set(precached());
      const files = readdirSync(outDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => join(entry.parentPath, entry.name).slice(outDir.length + 1).replaceAll("\\", "/"))
        .filter((file) => !/^(sw\.js|workbox-.*\.js)$/.test(file));
      expect(files.filter((file) => !urls.has(file))).toEqual([]);
    });

    it("RF-38 las direcciones de tarjeta (/civ/…) también abren sin conexión", () => {
      expect(sw()).toMatch(/NavigationRoute\([^)]*createHandlerBoundToURL\("index\.html"\)/);
    });
  });

  describe("RF-40 una versión nueva espera a que se vuelva a abrir la app", () => {
    it("RF-40 una versión nueva no se activa mientras haya una pestaña abierta (sin skipWaiting)", () => {
      const sw = read("sw.js");
      // Solo se activaría antes de tiempo si la página se lo pidiera (SKIP_WAITING), y la app nunca lo pide.
      expect(sw.match(/skipWaiting\(\)/g) ?? []).toHaveLength(1);
      expect(sw).toMatch(/SKIP_WAITING"[^;]*skipWaiting\(\)/);
    });

    it("NFR Rapidez la primera instalación toma el control de la página abierta (clientsClaim)", () => {
      // Solo actúa al activarse; como una versión nueva espera a que no quede ninguna pestaña abierta,
      // nunca toma el control de una página que se está leyendo (comprobado en e2e/update.spec.ts).
      expect(read("sw.js")).toMatch(/clientsClaim\(\)/);
    });

    it("RF-40 la app registra el service worker sin avisos ni recargas", () => {
      const source = readFileSync(join(ROOT, "src", "platform", "sw.ts"), "utf8");
      expect(source).toMatch(/registerSW\(/);
      expect(source).not.toMatch(/onNeedRefresh|updateServiceWorker|location\.reload/);
    });
  });
});
