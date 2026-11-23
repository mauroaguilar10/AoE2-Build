import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveText, segmentsToString } from "../../src/core/tokens";
import type { GameDataset } from "../../src/core/types";

const game = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "data", "game.json"), "utf8")) as GameDataset;
const { entities } = game;
const TEXT = "Ataca con [[unit:7]] y [[unit:448]]";

describe("T17 referencias a entidades en el texto táctico (RF-25)", () => {
  describe("RF-25 el mismo texto resuelto en cada idioma y nomenclatura", () => {
    it("RF-25 en: nombres en inglés", () => {
      expect(resolveText(TEXT, entities, "en", "mx")).toEqual([
        { kind: "text", text: "Ataca con " },
        { kind: "entity", ref: "unit:7", name: "Skirmisher" },
        { kind: "text", text: " y " },
        { kind: "entity", ref: "unit:448", name: "Scout Cavalry" },
      ]);
    });

    it("RF-25 es con nomenclatura de Latinoamérica (mx)", () => {
      expect(segmentsToString(resolveText(TEXT, entities, "es", "mx"))).toBe(
        "Ataca con Hostigador y Caballería de exploración",
      );
    });

    it("RF-25 es con nomenclatura de España (es): nombres oficiales tal cual, en minúscula dentro de la frase", () => {
      expect(segmentsToString(resolveText(TEXT, entities, "es", "es"))).toBe(
        "Ataca con guerrillero y caballería de exploración",
      );
    });

    it("RF-25 la nomenclatura no afecta al inglés", () => {
      expect(resolveText(TEXT, entities, "en", "es")).toEqual(resolveText(TEXT, entities, "en", "mx"));
    });
  });

  describe("mayúscula al inicio de frase", () => {
    it("un nombre en minúscula al principio del texto se muestra con mayúscula", () => {
      expect(segmentsToString(resolveText("[[unit:7]] primero", entities, "es", "es"))).toBe("Guerrillero primero");
    });

    it("también después de un punto, dos puntos, signo de exclamación o interrogación", () => {
      expect(segmentsToString(resolveText("Espera. [[unit:7]] después", entities, "es", "es"))).toBe(
        "Espera. Guerrillero después",
      );
      expect(segmentsToString(resolveText("Núcleo: [[unit:7]]", entities, "es", "es"))).toBe("Núcleo: Guerrillero");
    });

    it("dentro de la frase se respeta la minúscula", () => {
      expect(segmentsToString(resolveText("con [[unit:7]]", entities, "es", "es"))).toBe("con guerrillero");
    });
  });

  describe("casos límite", () => {
    it("un texto sin referencias es un único segmento de texto", () => {
      expect(resolveText("Sube a Feudal", entities, "es", "mx")).toEqual([{ kind: "text", text: "Sube a Feudal" }]);
    });

    it("un texto vacío no produce segmentos", () => {
      expect(resolveText("", entities, "es", "mx")).toEqual([]);
    });

    it("dos referencias seguidas no generan segmentos de texto vacíos", () => {
      expect(resolveText("[[unit:7]][[unit:448]]", entities, "en", "mx").map((s) => s.kind)).toEqual([
        "entity",
        "entity",
      ]);
    });

    it("una referencia mal escrita se deja como texto (la validación del build ya la habría rechazado)", () => {
      expect(segmentsToString(resolveText("con [[knight]]", entities, "en", "mx"))).toBe("con [[knight]]");
    });

    it("una entidad desconocida se deja como texto en lugar de romper la tarjeta", () => {
      expect(resolveText("con [[unit:999999]]", entities, "en", "mx")).toEqual([
        { kind: "text", text: "con [[unit:999999]]" },
      ]);
    });
  });
});
