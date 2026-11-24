import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { parseCard, CardSchemaError } from "../../tools/lib/card-schema";

const FILE = "franks.arabia.1v1.yaml";
const validYaml = readFileSync(join(import.meta.dirname, "..", "fixtures", "cards", FILE), "utf8");

/** Copia del fixture modificada por `mutate`, serializada otra vez a YAML. */
function variant(mutate: (card: any) => void): string {
  const card = parse(validYaml);
  mutate(card);
  return stringify(card);
}

function errorOf(yamlText: string, fileName = FILE): CardSchemaError {
  try {
    parseCard(yamlText, fileName);
  } catch (error) {
    if (error instanceof CardSchemaError) return error;
    throw error;
  }
  throw new Error("Se esperaba un CardSchemaError y la ficha se aceptó");
}

describe("T9 esquema de la ficha táctica y carga de YAML (RF-12, RF-13, RF-14, RF-34)", () => {
  describe("ficha válida", () => {
    it("RF-12 RF-13 RF-14 acepta la ficha y devuelve todos sus campos tipados", () => {
      const card = parseCard(validYaml, FILE);
      expect(card.civ).toBe("Franks");
      expect(card.map).toBe("arabia");
      expect(card.role).toBe("1v1");
      expect(card.economy.ageUpPop).toEqual({ feudal: 21, castle: 29 });
      expect(card.economy.villagers.castle).toEqual({ food: 14, wood: 9, gold: 6, stone: 0 });
      expect(card.economy.buildOrder).toHaveLength(2);
      expect(card.attack.core).toEqual(["unit:448"]);
      expect(card.attack.transition.note?.en).toBe("Switch to knights on reaching Castle Age");
      expect(card.attack.upgrades).toEqual(["tech:39", "tech:67", "tech:81"]);
      expect(card.sources).toHaveLength(1);
    });

    it("la nota de transición es opcional", () => {
      expect(() => parseCard(variant((c) => delete c.attack.transition.note), FILE)).not.toThrow();
    });

    it("acepta 2 mejoras (mínimo)", () => {
      expect(() => parseCard(variant((c) => (c.attack.upgrades = ["tech:435", "tech:67"])), FILE)).not.toThrow();
    });
  });

  describe("RF-34 fuentes obligatorias", () => {
    it("rechaza una ficha sin fuentes, indicando el campo", () => {
      const error = errorOf(variant((c) => (c.sources = [])));
      expect(error.message).toContain(FILE);
      expect(error.message).toMatch(/sources: .*al menos una fuente/);
    });

    it("rechaza una ficha sin el campo sources", () => {
      expect(errorOf(variant((c) => delete c.sources)).message).toMatch(/sources/);
    });

    it("rechaza una fuente con URL inválida", () => {
      expect(errorOf(variant((c) => (c.sources[0].url = "no-es-una-url"))).message).toMatch(/sources\.0\.url/);
    });
  });

  describe("RF-34 texto en español e inglés", () => {
    it("rechaza una ficha sin texto en inglés, indicando el campo", () => {
      const error = errorOf(variant((c) => delete c.attack.when.en));
      expect(error.message).toMatch(/attack\.when\.en/);
    });

    it("rechaza un texto que solo tiene espacios", () => {
      expect(errorOf(variant((c) => (c.economy.opening.es = "   "))).message).toMatch(/economy\.opening\.es/);
    });

    it("rechaza un paso de build order sin texto en español", () => {
      expect(errorOf(variant((c) => delete c.economy.buildOrder[1].text.es)).message).toMatch(
        /economy\.buildOrder\.1\.text\.es/,
      );
    });
  });

  describe("RF-14 mejoras clave: entre 2 y 3, en orden", () => {
    it("rechaza 1 mejora, indicando el campo", () => {
      const error = errorOf(variant((c) => (c.attack.upgrades = ["tech:435"])));
      expect(error.message).toMatch(/attack\.upgrades: .*entre 2 y 3/);
    });

    it("rechaza 4 mejoras, indicando el campo", () => {
      const error = errorOf(variant((c) => (c.attack.upgrades = ["tech:435", "tech:67", "tech:81", "tech:199"])));
      expect(error.message).toMatch(/attack\.upgrades: .*entre 2 y 3/);
    });

    it("una mejora debe ser una tecnología, no una unidad", () => {
      expect(errorOf(variant((c) => (c.attack.upgrades = ["unit:38", "tech:67"]))).message).toMatch(
        /attack\.upgrades\.0/,
      );
    });

    it("el núcleo del ejército necesita al menos una unidad", () => {
      expect(errorOf(variant((c) => (c.attack.core = []))).message).toMatch(/attack\.core/);
    });
  });

  describe("formato de referencias, valores y estructura", () => {
    it("rechaza referencias a entidades mal escritas", () => {
      expect(errorOf(variant((c) => (c.attack.core = ["knight"]))).message).toMatch(/attack\.core\.0/);
    });

    it("rechaza un mapa fuera de los 3 de esta iteración", () => {
      expect(errorOf(variant((c) => (c.map = "nomad"))).message).toMatch(/map/);
    });

    it("RF-12 la población para Castillos no puede ser menor que la de Feudal", () => {
      expect(errorOf(variant((c) => (c.economy.ageUpPop.castle = 20))).message).toMatch(/economy\.ageUpPop/);
    });

    it("RF-12 acepta subir a Castillos con la misma población que a Feudal (p. ej. Jemeres, sin aldeanos en Feudal)", () => {
      expect(() => parseCard(variant((c) => (c.economy.ageUpPop.castle = c.economy.ageUpPop.feudal)), FILE)).not.toThrow();
    });

    it("rechaza repartos de aldeanos negativos o no enteros", () => {
      expect(errorOf(variant((c) => (c.economy.villagers.feudal.food = -1))).message).toMatch(
        /economy\.villagers\.feudal\.food/,
      );
      expect(errorOf(variant((c) => (c.economy.villagers.feudal.gold = 2.5))).message).toMatch(
        /economy\.villagers\.feudal\.gold/,
      );
    });

    it("rechaza campos desconocidos (p. ej. una errata como 'upgrade')", () => {
      expect(errorOf(variant((c) => (c.attack.upgrade = ["tech:435"]))).message).toMatch(/upgrade/);
    });

    it("informa de todos los errores a la vez, no solo del primero", () => {
      const error = errorOf(
        variant((c) => {
          delete c.attack.when.en;
          c.attack.upgrades = ["tech:435"];
        }),
      );
      expect(error.issues).toHaveLength(2);
    });
  });

  describe("archivo", () => {
    it("rechaza YAML mal formado indicando el archivo", () => {
      const error = errorOf("civ: Franks\n  map: [arabia");
      expect(error.message).toContain(FILE);
      expect(error.message).toMatch(/YAML/);
    });

    it("el nombre del archivo debe coincidir con civ.mapa.rol del contenido", () => {
      const error = errorOf(validYaml, "britons.arabia.1v1.yaml");
      expect(error.message).toMatch(/franks\.arabia\.1v1\.yaml/);
    });
  });
});
