import { describe, expect, it } from "vitest";
import { resolveGameText, TranslationReport, TranslationError, FALLBACK_ORDER } from "../../tools/lib/translations";
import type { GameLocale, RawStrings } from "../../src/core/types";

/** Cadena 10272 = nombre de los Francos, presente en las 3 variantes. */
const ID = "10272";

function strings(overrides: Partial<Record<GameLocale, RawStrings>> = {}): Record<GameLocale, RawStrings> {
  return {
    en: { [ID]: "Franks" },
    es: { [ID]: "Francos (ES)" },
    mx: { [ID]: "Francos (MX)" },
    ...overrides,
  };
}

describe("T5 traducciones con respaldo (RF-35)", () => {
  it("RF-35 sin faltantes: devuelve cada variante y el informe queda vacío", () => {
    const report = new TranslationReport();
    expect(resolveGameText(ID, strings(), report, "civ Franks: name")).toEqual({
      en: "Franks",
      es: "Francos (ES)",
      mx: "Francos (MX)",
    });
    expect(report.entries).toEqual([]);
  });

  it("RF-35 falta mx → usa es", () => {
    const report = new TranslationReport();
    const text = resolveGameText(ID, strings({ mx: {} }), report, "civ Franks: name");
    expect(text.mx).toBe("Francos (ES)");
    expect(report.entries).toEqual([{ stringId: ID, locale: "mx", usedLocale: "es", context: "civ Franks: name" }]);
  });

  it("RF-35 falta es → usa mx", () => {
    const report = new TranslationReport();
    const text = resolveGameText(ID, strings({ es: {} }), report, "civ Franks: name");
    expect(text.es).toBe("Francos (MX)");
    expect(report.entries).toEqual([{ stringId: ID, locale: "es", usedLocale: "mx", context: "civ Franks: name" }]);
  });

  it("RF-35 faltan es y mx → ambas usan en", () => {
    const report = new TranslationReport();
    const text = resolveGameText(ID, strings({ es: {}, mx: {} }), report, "civ Franks: name");
    expect(text).toEqual({ en: "Franks", es: "Franks", mx: "Franks" });
    expect(report.entries.map((e) => [e.locale, e.usedLocale])).toEqual([
      ["es", "en"],
      ["mx", "en"],
    ]);
  });

  it("RF-35 falta en → usa mx (el disponible más cercano)", () => {
    const report = new TranslationReport();
    const text = resolveGameText(ID, strings({ en: {} }), report, "x");
    expect(text.en).toBe("Francos (MX)");
    expect(report.entries[0]).toMatchObject({ locale: "en", usedLocale: "mx" });
  });

  it("RF-35 una cadena vacía o solo con espacios cuenta como faltante", () => {
    const report = new TranslationReport();
    const text = resolveGameText(ID, strings({ mx: { [ID]: "   " } }), report, "x");
    expect(text.mx).toBe("Francos (ES)");
    expect(report.entries).toHaveLength(1);
  });

  it("RF-35 si no existe en ninguna variante, falla con TranslationError indicando id y contexto", () => {
    const report = new TranslationReport();
    const none = strings({ en: {}, es: {}, mx: {} });
    expect(() => resolveGameText(ID, none, report, "civ Franks: name")).toThrow(TranslationError);
    expect(() => resolveGameText(ID, none, report, "civ Franks: name")).toThrow(/10272.*civ Franks: name/);
  });

  it("RF-35 el orden de respaldo es el acordado en la constitución (enmienda 1)", () => {
    expect(FALLBACK_ORDER).toEqual({ mx: ["es", "en"], es: ["mx", "en"], en: ["mx", "es"] });
  });

  describe("RF-35 informe de faltantes", () => {
    it("acumula una entrada por cada cadena y variante que falta, a lo largo de varias resoluciones", () => {
      const report = new TranslationReport();
      resolveGameText(ID, strings({ mx: {} }), report, "civ Franks: name");
      resolveGameText(ID, strings({ es: {}, mx: {} }), report, "unit 281: name");
      expect(report.entries).toHaveLength(3);
      expect(report.entries.map((e) => e.context)).toEqual(["civ Franks: name", "unit 281: name", "unit 281: name"]);
    });

    it("se serializa para data/reports/missing-translations.json y genera un resumen legible", () => {
      const report = new TranslationReport();
      resolveGameText(ID, strings({ mx: {} }), report, "civ Franks: name");
      expect(JSON.parse(JSON.stringify(report))).toEqual({
        count: 1,
        missing: [{ stringId: ID, locale: "mx", usedLocale: "es", context: "civ Franks: name" }],
      });
      expect(report.summary()).toContain("1 traducción faltante");
      expect(report.summary()).toContain("mx ← es · 10272 · civ Franks: name");
    });

    it("el resumen indica cuando no falta nada", () => {
      expect(new TranslationReport().summary()).toBe("Sin traducciones faltantes.");
    });
  });
});
