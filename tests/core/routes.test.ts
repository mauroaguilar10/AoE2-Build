import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardPath, parseRoute } from "../../src/core/routes";
import { MAP_IDS, type GameDataset } from "../../src/core/types";

const CIVS = ["Franks", "Britons", "Spanish", "Incas"];
const parse = (url: string) => {
  const { pathname, search } = new URL(url, "https://guia.example");
  return parseRoute(pathname, search, CIVS);
};

describe("T19 rutas: URL ↔ (civilización, mapa)", () => {
  describe("RF-10 dirección compartible de cada tarjeta", () => {
    it("RF-10 (Franks, arena) → /civ/franks?map=arena", () => {
      expect(cardPath("Franks", "arena")).toBe("/civ/franks?map=arena");
    });

    it("RF-10 /civ/franks?map=arena → (Franks, arena)", () => {
      expect(parse("/civ/franks?map=arena")).toEqual({ kind: "card", civ: "Franks", map: "arena" });
    });

    it("RF-10 ida y vuelta para cada civilización y mapa", () => {
      for (const civ of CIVS) {
        for (const map of MAP_IDS) {
          expect(parse(cardPath(civ, map))).toEqual({ kind: "card", civ, map });
        }
      }
    });

    it("RF-10 ida y vuelta con las 56 civilizaciones reales del juego", () => {
      const game = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "data", "game.json"), "utf8")) as GameDataset;
      const ids = Object.keys(game.civs);
      for (const civ of ids) {
        const { pathname, search } = new URL(cardPath(civ, "arabia"), "https://guia.example");
        expect(parseRoute(pathname, search, ids)).toEqual({ kind: "card", civ, map: "arabia" });
      }
    });

    it("RF-10 la dirección no lleva idioma ni nomenclatura", () => {
      expect(cardPath("Spanish", "black_forest")).toBe("/civ/spanish?map=black_forest");
    });

    it("RF-10 se ignoran parámetros que no son el mapa (p. ej. lang=en o los que añaden las redes)", () => {
      expect(parse("/civ/franks?lang=en&map=arena&utm_source=x")).toEqual({ kind: "card", civ: "Franks", map: "arena" });
    });

    it("RF-10 tolera mayúsculas y la barra final", () => {
      expect(parse("/civ/FRANKS/?map=Arena")).toEqual({ kind: "card", civ: "Franks", map: "arena" });
    });

    it("RF-10 sin mapa en la dirección, la tarjeta usa el mapa seleccionado en la pantalla principal (map: null)", () => {
      expect(parse("/civ/franks")).toEqual({ kind: "card", civ: "Franks", map: null });
    });

    it("la raíz es la pantalla principal", () => {
      expect(parse("/")).toEqual({ kind: "home" });
      expect(parse("/?map=arena")).toEqual({ kind: "home" });
    });
  });

  describe("RF-11 direcciones inválidas → pantalla principal con aviso", () => {
    it("RF-11 civilización inexistente", () => {
      expect(parse("/civ/atlanteans?map=arena")).toEqual({ kind: "notFound" });
    });

    it("RF-11 mapa inexistente (map=nomad)", () => {
      expect(parse("/civ/franks?map=nomad")).toEqual({ kind: "notFound" });
    });

    it("RF-11 mapa vacío", () => {
      expect(parse("/civ/franks?map=")).toEqual({ kind: "notFound" });
    });

    it("RF-11 rutas desconocidas o mal formadas", () => {
      expect(parse("/civ")).toEqual({ kind: "notFound" });
      expect(parse("/civ/")).toEqual({ kind: "notFound" });
      expect(parse("/civ/franks/arena")).toEqual({ kind: "notFound" });
      expect(parse("/otra-cosa")).toEqual({ kind: "notFound" });
      expect(parseRoute("/civ/%E0%A4%A", "", CIVS)).toEqual({ kind: "notFound" }); // codificación rota
    });
  });
});
