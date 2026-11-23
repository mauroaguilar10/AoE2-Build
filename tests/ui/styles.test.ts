import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(import.meta.dirname, "..", "..", "src", "ui", "styles.css"), "utf8");

/** Variables `--nombre: #rrggbb` de un bloque concreto de la hoja de estilos. */
function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1]!, m[2]!]));
}

function blockAfter(marker: string): string {
  const start = CSS.indexOf(marker);
  expect(start, `falta ${marker}`).toBeGreaterThanOrEqual(0);
  const open = CSS.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === "{") depth++;
    if (CSS[i] === "}" && --depth === 0) return CSS.slice(open, i + 1);
  }
  throw new Error(`bloque sin cerrar: ${marker}`);
}

/** Contraste WCAG 2 entre dos colores #rrggbb. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const THEMES = {
  claro: tokens(blockAfter(":root")),
  oscuro: tokens(blockAfter("@media (prefers-color-scheme: dark)")),
};

/** Pares texto/fondo que aparecen en la app. 4,5:1 para texto (WCAG AA); 3:1 para el anillo de foco. */
const TEXT_PAIRS: [string, string][] = [
  ["text", "bg"],
  ["text", "surface"],
  ["muted", "bg"],
  ["muted", "surface"],
  ["accent", "surface"],
  ["notice-text", "notice-bg"],
  ["badge-text", "badge-bg"],
  ["selected-text", "selected-bg"], // mapa elegido y acceso "Continuar"
];

describe("T29 estilos: contraste, foco visible y controles táctiles", () => {
  describe.each(Object.entries(THEMES))("NFR Accesibilidad: contraste en el tema %s", (_theme, colors) => {
    it.each(TEXT_PAIRS)("%s sobre %s ≥ 4,5:1", (fg, bg) => {
      expect(colors[fg], `falta --${fg}`).toBeDefined();
      expect(colors[bg], `falta --${bg}`).toBeDefined();
      expect(contrast(colors[fg]!, colors[bg]!)).toBeGreaterThanOrEqual(4.5);
    });

    it("anillo de foco ≥ 3:1 sobre el fondo y sobre las tarjetas", () => {
      expect(contrast(colors.focus!, colors.bg!)).toBeGreaterThanOrEqual(3);
      expect(contrast(colors.focus!, colors.surface!)).toBeGreaterThanOrEqual(3);
    });
  });

  it("NFR Accesibilidad: foco visible en todo lo enfocable", () => {
    expect(blockAfter(":focus-visible")).toMatch(/outline:\s*3px solid var\(--focus\)/);
    // Los radios del selector de mapa se ocultan a la vista pero siguen siendo enfocables:
    // el foco se dibuja en su etiqueta.
    expect(CSS).toMatch(/label:has\(input:focus-visible\)/);
    expect(CSS).not.toMatch(/outline:\s*(none|0)/);
  });

  it("los radios ocultos no usan display:none (dejarían de ser enfocables)", () => {
    expect(blockAfter(".visually-hidden")).not.toMatch(/display:\s*none/);
    expect(blockAfter(".visually-hidden")).toMatch(/clip/);
  });

  it("NFR Escaneabilidad: controles táctiles de al menos 44 px (2.75rem)", () => {
    expect(CSS).toMatch(/--touch:\s*2\.75rem/);
    for (const selector of [".civ", ".map-selector label", "button", "select", ".search-box"]) {
      expect(CSS, selector).toMatch(new RegExp(`${selector.replace(".", "\\.")}[^{]*\\{[^}]*min-height:\\s*var\\(--touch\\)`));
    }
  });

  it("NFR Escaneabilidad: una columna centrada y sin desbordes horizontales en móvil", () => {
    expect(CSS).toMatch(/max-width:\s*40rem/);
    expect(CSS).toMatch(/overflow-wrap:\s*anywhere/);
  });
});
