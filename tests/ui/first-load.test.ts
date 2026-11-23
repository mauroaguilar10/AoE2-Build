// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MESSAGES } from "../../src/core/i18n";

const HTML = readFileSync(join(import.meta.dirname, "..", "..", "index.html"), "utf8");
const SCRIPT = HTML.match(/<script id="first-load-offline-script">([\s\S]*?)<\/script>/)?.[1] ?? "";
const NOTICE = HTML.match(/<div\s+id="first-load-offline"[\s\S]*?<\/div>/)?.[0] ?? "";

let originalLanguages: PropertyDescriptor | undefined;

/** Carga el HTML inicial (sin la app) y ejecuta su script en línea, como haría el navegador. */
function loadPage(languages: string[]) {
  Object.defineProperty(navigator, "languages", { value: languages, configurable: true });
  document.head.innerHTML = "";
  document.body.innerHTML = `<div id="app"></div>${NOTICE}`;
  new Function(SCRIPT)();
}

/** El navegador no pudo descargar un archivo de la app (sin conexión). */
function failToLoad(tag: "script" | "link") {
  const element = document.createElement(tag);
  document.head.appendChild(element);
  element.dispatchEvent(new Event("error")); // no burbujea: el script lo captura en window
}

const notice = () => document.getElementById("first-load-offline")!;
const visibleText = () =>
  [...notice().querySelectorAll<HTMLElement>("[data-lang]")]
    .filter((p) => !p.hidden)
    .map((p) => p.textContent)
    .join("");

beforeEach(() => {
  originalLanguages = Object.getOwnPropertyDescriptor(navigator, "languages");
});
afterEach(() => {
  if (originalLanguages) Object.defineProperty(navigator, "languages", originalLanguages);
  else delete (navigator as { languages?: unknown }).languages;
});

describe("T31 primera visita sin conexión (RF-39)", () => {
  it("el HTML inicial incluye el mensaje y el script que lo muestra, antes del código de la app", () => {
    expect(SCRIPT).not.toBe("");
    expect(NOTICE).toMatch(/hidden/);
    expect(HTML.indexOf('id="first-load-offline-script"')).toBeLessThan(HTML.indexOf('src="/src/main.tsx"'));
  });

  it("RF-39 si el código de la app no se descarga, se muestra el mensaje", () => {
    loadPage(["es-AR"]);
    expect(notice().hidden).toBe(true);
    failToLoad("script");
    expect(notice().hidden).toBe(false);
    expect(notice().getAttribute("role")).toBe("alert");
  });

  it("RF-39 también si fallan los estilos", () => {
    loadPage(["es-AR"]);
    failToLoad("link");
    expect(notice().hidden).toBe(false);
  });

  it("RF-39 el texto es el de la spec, en el idioma del navegador (español)", () => {
    loadPage(["es-MX", "en"]);
    failToLoad("script");
    expect(visibleText()).toBe(MESSAGES.es.firstLoadOffline);
  });

  it("RF-39 en inglés en cualquier otro idioma (misma regla que RF-22)", () => {
    loadPage(["fr-FR", "es"]);
    failToLoad("script");
    expect(visibleText()).toBe(MESSAGES.en.firstLoadOffline);
  });

  it("los textos del HTML coinciden con los de la interfaz (content/ui)", () => {
    loadPage(["es"]);
    const texts = Object.fromEntries(
      [...notice().querySelectorAll<HTMLElement>("[data-lang]")].map((p) => [p.dataset.lang, p.textContent]),
    );
    expect(texts).toEqual({ es: MESSAGES.es.firstLoadOffline, en: MESSAGES.en.firstLoadOffline });
  });

  it("si todo carga, el mensaje no aparece", () => {
    loadPage(["es"]);
    expect(notice().hidden).toBe(true);
  });

  it("si la app ya se mostró, un error posterior (p. ej. una imagen) no muestra el mensaje", () => {
    loadPage(["es"]);
    document.getElementById("app")!.innerHTML = "<main>app</main>";
    failToLoad("script");
    expect(notice().hidden).toBe(true);
  });

  it("los errores de imágenes no cuentan (un escudo que falla no es la primera carga)", () => {
    loadPage(["es"]);
    const img = document.createElement("img");
    document.body.appendChild(img);
    img.dispatchEvent(new Event("error"));
    expect(notice().hidden).toBe(true);
  });

  it("el mensaje se ve aunque no carguen los estilos de la app (estilo en línea)", () => {
    expect(NOTICE).toMatch(/style="/);
  });

  it("la app oculta el mensaje al arrancar (por si se mostró antes de que cargara)", () => {
    const main = readFileSync(join(import.meta.dirname, "..", "..", "src", "main.tsx"), "utf8");
    expect(main).toMatch(/first-load-offline/);
  });
});
