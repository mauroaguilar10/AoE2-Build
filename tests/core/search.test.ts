import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { filterCivs, normalizeSearch } from "../../src/core/search";
import { groupAndSortCivs } from "../../src/core/sort";
import { CARD_CIVS } from "../../src/core/scope";
import type { GameDataset } from "../../src/core/types";

const game = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "data", "game.json"), "utf8")) as GameDataset;
const { civs } = game;
const ALL = Object.keys(civs);

describe("T18 búsqueda y orden de civilizaciones", () => {
  describe("RF-5 búsqueda sin distinguir mayúsculas ni tildes, en las 3 variantes", () => {
    it("RF-5 normaliza quitando tildes y mayúsculas", () => {
      expect(normalizeSearch("  ESPAÑOLES Búlgaros ")).toBe("espanoles bulgaros");
    });

    it('RF-5 "espanoles", "SPANISH" y "españoles" encuentran la misma civilización', () => {
      expect(filterCivs(ALL, civs, "espanoles")).toEqual(["Spanish"]);
      expect(filterCivs(ALL, civs, "SPANISH")).toEqual(["Spanish"]);
      expect(filterCivs(ALL, civs, "españoles")).toEqual(["Spanish"]);
    });

    it("RF-5 busca por parte del nombre", () => {
      expect(filterCivs(ALL, civs, "franc")).toEqual(["Franks"]);
    });

    it("RF-5 encuentra por el nombre de España aunque la nomenclatura sea otra (Yurchen / Jurchens)", () => {
      expect(filterCivs(ALL, civs, "yurchen")).toEqual(["Jurchens"]);
      expect(filterCivs(ALL, civs, "borgoneses")).toEqual(["Burgundians"]);
      expect(filterCivs(ALL, civs, "borgoñones")).toEqual(["Burgundians"]);
    });

    it("RF-5 busca en los nombres oficiales, no en la clave interna", () => {
      expect(filterCivs(ALL, civs, "mayas")).toEqual(["Mayans"]); // Latinoamérica: "Mayas"
      expect(filterCivs(ALL, civs, "mayans")).toEqual([]); // clave interna; los nombres son "Maya" / "Mayas"
    });

    it("RF-5 conserva el orden recibido (el de la cuadrícula)", () => {
      expect(filterCivs(["Turks", "Tatars", "Teutons"], civs, "t")).toEqual(["Turks", "Tatars", "Teutons"]);
    });

    it("RF-5 con el buscador vacío no se filtra nada", () => {
      expect(filterCivs(ALL, civs, "")).toEqual(ALL);
      expect(filterCivs(ALL, civs, "   ")).toEqual(ALL);
    });
  });

  describe("RF-6 búsqueda sin coincidencias", () => {
    it("RF-6 un texto que no coincide con ninguna civilización devuelve una lista vacía", () => {
      expect(filterCivs(ALL, civs, "zzz")).toEqual([]);
    });
  });

  describe("RF-2 grupos: primero las civilizaciones con ficha, después las de solo datos", () => {
    const groups = groupAndSortCivs(civs, CARD_CIVS, "en", "mx");

    it("RF-2 las 10 civilizaciones con ficha forman el primer grupo", () => {
      expect([...groups.withCard].sort()).toEqual([...CARD_CIVS].sort());
    });

    it("RF-2 el resto (46) va en el grupo de solo datos, sin repetir ninguna", () => {
      expect(groups.dataOnly).toHaveLength(ALL.length - CARD_CIVS.length);
      expect(groups.dataOnly.some((civ) => CARD_CIVS.includes(civ))).toBe(false);
      expect(new Set([...groups.withCard, ...groups.dataOnly]).size).toBe(ALL.length);
    });

    it("RF-2 una civilización con ficha que ya no existe en el juego no aparece", () => {
      const result = groupAndSortCivs(civs, [...CARD_CIVS, "Atlanteans"], "en", "mx");
      expect(result.withCard).not.toContain("Atlanteans");
      expect(result.withCard).toHaveLength(CARD_CIVS.length);
    });
  });

  describe("RF-4 orden alfabético según el idioma y la nomenclatura", () => {
    it("RF-4 en inglés", () => {
      expect(groupAndSortCivs(civs, CARD_CIVS, "en", "mx").withCard).toEqual([
        "Aztecs",
        "Britons",
        "Franks",
        "Goths",
        "Khmer",
        "Mayans",
        "Mongols",
        "Persians",
        "Spanish",
        "Turks",
      ]);
    });

    it("RF-4 en español el orden cambia (Españoles pasa delante de Francos)", () => {
      expect(groupAndSortCivs(civs, CARD_CIVS, "es", "mx").withCard).toEqual([
        "Aztecs", // Aztecas
        "Britons", // Britanos
        "Spanish", // Españoles
        "Franks", // Francos
        "Goths", // Godos
        "Khmer", // Jemeres
        "Mayans", // Mayas
        "Mongols", // Mongoles
        "Persians", // Persas
        "Turks", // Turcos
      ]);
    });

    it("RF-4 la nomenclatura también reordena (Jurchens en Latinoamérica, Yurchen en España)", () => {
      const mx = groupAndSortCivs(civs, CARD_CIVS, "es", "mx").dataOnly;
      const es = groupAndSortCivs(civs, CARD_CIVS, "es", "es").dataOnly;
      expect(mx.indexOf("Jurchens")).toBeLessThan(mx.indexOf("Khitans")); // Jurchens < Kitáns
      expect(es.indexOf("Jurchens")).toBeGreaterThan(es.indexOf("Khitans")); // Kitán < Yurchen
      expect(es.indexOf("Jurchens")).toBeGreaterThan(es.indexOf("Wu")); // Wu < Yurchen
    });

    it("RF-4 las tildes no rompen el orden (Tártaros va antes que Teutones)", () => {
      const dataOnly = groupAndSortCivs(civs, CARD_CIVS, "es", "mx").dataOnly;
      const t = dataOnly.filter((civ) => civs[civ]?.name.mx.startsWith("T"));
      expect(t).toEqual(["Tatars", "Teutons", "Tupi"]); // Tártaros, Teutones, Tupíes
    });
  });
});
