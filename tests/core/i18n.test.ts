import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectInitialLang, displayName, gameLocale, officialName, t, MESSAGES } from "../../src/core/i18n";
import type { GameDataset } from "../../src/core/types";

const game = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "data", "game.json"), "utf8")) as GameDataset;

describe("T16 idioma de la app (RF-22, RF-24)", () => {
  describe("RF-22 idioma inicial según el idioma preferido del navegador", () => {
    it("RF-22 es-AR → ES", () => {
      expect(detectInitialLang(["es-AR", "en"])).toBe("es");
    });

    it("RF-22 cualquier variante de español → ES (es, es-MX, mayúsculas)", () => {
      expect(detectInitialLang(["es"])).toBe("es");
      expect(detectInitialLang(["ES-mx"])).toBe("es");
    });

    it("RF-22 fr → EN", () => {
      expect(detectInitialLang(["fr"])).toBe("en");
    });

    it("RF-22 solo cuenta el idioma PREFERIDO (el primero): fr y después es → EN", () => {
      expect(detectInitialLang(["fr-FR", "es-ES"])).toBe("en");
    });

    it("RF-22 sin información de idioma → EN", () => {
      expect(detectInitialLang([])).toBe("en");
    });

    it("no confunde otros idiomas que empiezan por 'es' en el texto (p. ej. estonio 'et') ni 'eu'", () => {
      expect(detectInitialLang(["et"])).toBe("en");
      expect(detectInitialLang(["eu"])).toBe("en");
    });
  });

  describe("RF-24 nomenclatura oficial del juego", () => {
    it("en inglés siempre se usa en, sin importar la nomenclatura", () => {
      expect(gameLocale("en", "mx")).toBe("en");
      expect(gameLocale("en", "es")).toBe("en");
    });

    it("en español se usa la nomenclatura elegida", () => {
      expect(gameLocale("es", "mx")).toBe("mx");
      expect(gameLocale("es", "es")).toBe("es");
    });

    it("RF-24 caso real: tecnología única de los Armenios → 'Feretorios' (mx) frente a 'Relicarios' (es)", () => {
      const fereters = game.civs.Armenians!.uniqueTechs.find((tech) => game.entities[tech.id]?.name.en === "Fereters")!;
      const name = game.entities[fereters.id]!.name;
      expect(displayName(name, "es", "mx")).toBe("Feretorios");
      expect(displayName(name, "es", "es")).toBe("Relicarios");
      expect(displayName(name, "en", "es")).toBe("Fereters");
    });

    it("officialName devuelve el nombre oficial tal cual (dentro de una frase se respeta la minúscula del juego)", () => {
      const fereters = game.entities["tech:921"]!.name;
      expect(officialName(fereters, "es", "mx")).toBe("feretorios");
      expect(officialName(game.entities["unit:7"]!.name, "es", "es")).toBe("guerrillero");
    });

    it("displayName pone la primera letra en mayúscula para mostrar el nombre solo (listas, etiquetas)", () => {
      expect(displayName(game.entities["unit:7"]!.name, "es", "es")).toBe("Guerrillero");
      expect(displayName(game.entities["unit:7"]!.name, "es", "mx")).toBe("Hostigador");
      expect(displayName({ en: "x", es: "élite", mx: "x" }, "es", "es")).toBe("Élite");
    });
  });

  describe("textos de la interfaz", () => {
    it("t() devuelve el texto en el idioma pedido y sustituye los parámetros", () => {
      expect(t("es", "gamePatch", { patch: "188329" })).toBe("Datos del juego: parche 188329");
      expect(t("en", "gamePatch", { patch: "188329" })).toBe("Game data: patch 188329");
    });

    it("t() incluye los textos exactos de la spec (RF-16, RF-19, RF-28, RF-39)", () => {
      expect(t("es", "noTacticalCard")).toBe("Ficha táctica aún no disponible para esta civilización");
      expect(t("es", "techTreeOffline")).toBe("Necesitas conexión para ver el árbol completo");
      expect(t("es", "staleNotice", { patch: "188329" })).toBe("Revisada en el parche 188329; ha habido cambios después");
      expect(t("es", "firstLoadOffline")).toBe("Se necesita conexión para la primera carga");
    });

    it("t() falla si falta un parámetro, para no mostrar '{patch}' al jugador", () => {
      expect(() => t("es", "gamePatch")).toThrow(/patch/);
    });

    it("constitución §6: es y en tienen exactamente las mismas claves y ningún texto vacío", () => {
      expect(Object.keys(MESSAGES.es).sort()).toEqual(Object.keys(MESSAGES.en).sort());
      for (const lang of ["es", "en"] as const) {
        for (const [key, value] of Object.entries(MESSAGES[lang])) expect(value.trim(), `${lang}.${key}`).not.toBe("");
      }
    });

    it("constitución §6: cada texto usa los mismos parámetros en ambos idiomas", () => {
      const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      for (const key of Object.keys(MESSAGES.es) as (keyof typeof MESSAGES.es)[]) {
        expect(params(MESSAGES.en[key]), key).toEqual(params(MESSAGES.es[key]));
      }
    });
  });
});
