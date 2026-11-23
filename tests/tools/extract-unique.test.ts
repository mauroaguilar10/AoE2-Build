import { describe, expect, it } from "vitest";
import { extractUniqueEntities, toCost, ageFromId, ExtractError } from "../../tools/lib/extract-unique";
import { loadFixtureSource } from "../fixtures/load";
import type { RawSource } from "../../src/core/types";

const src = loadFixtureSource();
const extract = (civ: string, source: RawSource = src) => extractUniqueEntities(civ, source.data, source.trees[civ]!);
const cost = (c: Partial<Record<"food" | "wood" | "gold" | "stone", number>>) => ({
  food: 0,
  wood: 0,
  gold: 0,
  stone: 0,
  ...c,
});

describe("T4 unidades, tecnologías y edificios propios (RF-17)", () => {
  describe("RF-17 Francos", () => {
    const r = extract("Franks");

    it("candidatas a unidad única: todos los nodos UniqueUnit (base y élite), con coste y edad; la lista oficial se decide en la importación (T8)", () => {
      expect(r.uniqueUnitCandidates.map(({ id, age, cost }) => ({ id, age, cost }))).toEqual([
        { id: "unit:281", age: "castle", cost: cost({ food: 55, gold: 25 }) },
        { id: "unit:531", age: "imperial", cost: cost({ food: 55, gold: 25 }) },
      ]);
    });

    it("2 tecnologías únicas ordenadas por edad: Castillos y luego Imperial", () => {
      expect(r.uniqueTechs.map(({ id, age, cost }) => ({ id, age, cost }))).toEqual([
        { id: "tech:1496", age: "castle", cost: cost({ food: 400, gold: 250 }) },
        { id: "tech:493", age: "imperial", cost: cost({ wood: 600, gold: 500 }) },
      ]);
    });

    it("sin edificios propios", () => {
      expect(r.ownBuildings).toEqual([]);
    });

    it("conserva los ids de cadena: ayuda oficial (LanguageNameId + 21000, con el nombre en negrita) y etiqueta del árbol", () => {
      const unit = r.uniqueUnitCandidates[0]!;
      expect(src.strings.en[String(unit.helpStringId)]).toContain("<b>Throwing Axeman</b>");
      expect(src.strings.mx[String(unit.helpStringId)]).toContain("<b>Lanzador de hachas</b>");
      expect(src.strings.en[String(unit.labelStringId)]).toBe("Throwing<br>\nAxeman");
    });
  });

  describe("RF-17 Aztecas", () => {
    const r = extract("Aztecs");

    it("Guerrero jaguar (base y élite) como candidatas; el Guerrero águila (regional) no cuenta", () => {
      expect(r.uniqueUnitCandidates.map((u) => u.id)).toEqual(["unit:725", "unit:726"]);
    });

    it("el coste de Guerras floridas sale de la tabla Tech aunque el id exista también en unit_upgrades", () => {
      expect(r.uniqueTechs.map(({ id, age, cost }) => ({ id, age, cost }))).toEqual([
        { id: "tech:460", age: "castle", cost: cost({ food: 400, gold: 350 }) },
        { id: "tech:24", age: "imperial", cost: cost({ food: 450, gold: 750 }) },
      ]);
    });
  });

  describe("RF-17 Armenios", () => {
    const r = extract("Armenians");

    it("candidatas: Arquero compuesto (base y élite) y Sacerdote guerrero", () => {
      expect(r.uniqueUnitCandidates.map((u) => u.id)).toEqual(["unit:1800", "unit:1811", "unit:1802"]);
    });

    it("edificios propios: Iglesia fortificada y Carreta de mulas, con coste y edad", () => {
      expect(r.ownBuildings.map(({ id, age, cost }) => ({ id, age, cost }))).toEqual([
        { id: "building:1808", age: "dark", cost: cost({ food: 20, wood: 80 }) },
        { id: "building:1806", age: "castle", cost: cost({ wood: 200 }) },
      ]);
      const church = r.ownBuildings.find((b) => b.id === "building:1806")!;
      expect(src.strings.en[String(church.helpStringId)]).toContain("<b>Fortified Church</b>");
      expect(src.strings.en[String(church.helpStringId)]).toContain("Unique Monastery of the Armenians and the Georgians");
    });

    it("las tecnologías regionales y el Dromón (unidad regional) no se incluyen", () => {
      const ids = [...r.uniqueUnitCandidates, ...r.uniqueTechs, ...r.ownBuildings].map((e) => e.id);
      expect(ids).not.toContain("unit:1795");
    });
  });

  describe("RF-17 unidades únicas que son mejora de una unidad común (caso real: Savar de los Persas)", () => {
    it("incluye un nodo UniqueUnit aunque su link_id apunte a una unidad no única", () => {
      const copy: RawSource = structuredClone(src);
      const node = copy.trees.Franks!.units_techs.find((n) => n.node_id === 281)!;
      node.link_id = 4; // simula "mejora del Arquero", como el Savar respecto al Arquero a caballo
      expect(extract("Franks", copy).uniqueUnitCandidates.map((u) => u.id)).toContain("unit:281");
    });

    it("no repite una unidad que aparece en dos edificios (caso real: Huskarl en Castillo y Cuartel)", () => {
      const copy: RawSource = structuredClone(src);
      const tree = copy.trees.Franks!;
      tree.units_techs.push({ ...tree.units_techs.find((n) => n.node_id === 281)!, building_id: 12 });
      const ids = extract("Franks", copy).uniqueUnitCandidates.map((u) => u.id);
      expect(ids.filter((id) => id === "unit:281")).toHaveLength(1);
    });
  });

  describe("RF-17 casos límite", () => {
    it("ignora nodos no disponibles para la civilización (NotAvailable)", () => {
      const copy: RawSource = structuredClone(src);
      const node = copy.trees.Franks!.units_techs.find((n) => n.node_id === 493)!;
      node.node_status = "NotAvailable";
      expect(extract("Franks", copy).uniqueTechs.map((t) => t.id)).toEqual(["tech:1496"]);
    });

    it("falla con ExtractError si un nodo único no tiene datos mecánicos", () => {
      const copy: RawSource = structuredClone(src);
      delete copy.data.data.Unit["281"];
      expect(() => extract("Franks", copy)).toThrow(ExtractError);
      expect(() => extract("Franks", copy)).toThrow(/281/);
    });

    it("toCost completa con 0 los recursos ausentes", () => {
      expect(toCost({ Gold: 45, Wood: 25 })).toEqual({ food: 0, wood: 25, gold: 45, stone: 0 });
    });

    it("ageFromId traduce 1-4 y rechaza valores desconocidos", () => {
      expect([1, 2, 3, 4].map(ageFromId)).toEqual(["dark", "feudal", "castle", "imperial"]);
      expect(() => ageFromId(7)).toThrow(ExtractError);
    });
  });
});
