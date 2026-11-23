import { describe, expect, it } from "vitest";
import { buildDataset, DatasetError } from "../../tools/lib/build-dataset";
import { TranslationReport } from "../../tools/lib/translations";
import { loadFixtureSource } from "../fixtures/load";
import type { RawSource } from "../../src/core/types";

const src = loadFixtureSource();
const build = (source: RawSource = src, report = new TranslationReport()) => buildDataset(source, "188329", report);
const cost = (c: Partial<Record<"food" | "wood" | "gold" | "stone", number>>) => ({
  food: 0,
  wood: 0,
  gold: 0,
  stone: 0,
  ...c,
});
const helpId = (source: RawSource, civ: string) => String(source.data.civs[civ]!.help_string_id);

describe("T8 ensamblado del dataset (RF-1, RF-17, RF-26, RF-35)", () => {
  const { game, availability, history } = build();

  describe("RF-1 / RF-26 estructura general", () => {
    it("incluye todas las civilizaciones de la fuente y el parche", () => {
      expect(Object.keys(game.civs).sort()).toEqual(["Armenians", "Aztecs", "Franks"]);
      expect(game.patch).toBe("188329");
    });

    it("nombre oficial en las 3 variantes y ruta del escudo", () => {
      expect(game.civs.Franks!.name).toEqual({ en: "Franks", es: "Francos", mx: "Francos" });
      expect(game.civs.Franks!.shield).toBe("shields/franks.png");
    });
  });

  describe("RF-17 datos de la civilización", () => {
    it("especialidad, bonificaciones y bonificación de equipo en las 3 variantes", () => {
      const franks = game.civs.Franks!;
      expect(franks.specialty.en).toBe("Cavalry civilization");
      expect(franks.bonuses.en).toHaveLength(4);
      expect(franks.bonuses.es).toHaveLength(4);
      expect(franks.teamBonus.mx).toBe("La línea de los caballeros obtiene +2 de campo de visión");
    });

    it("unidades únicas: lista oficial con su clase, asociada a su entidad y coste (sin la élite)", () => {
      expect(game.civs.Franks!.uniqueUnits).toEqual([
        {
          id: "unit:281",
          name: {
            en: "Throwing Axeman (Infantry)",
            es: "Lanzador de hachas (infantería)",
            mx: "Lanzador de hachas (infantería)",
          },
          cost: cost({ food: 55, gold: 25 }),
        },
      ]);
      expect(game.civs.Armenians!.uniqueUnits.map((u) => u.id)).toEqual(["unit:1800", "unit:1811"]);
    });

    it("tecnologías únicas con edad, coste y efecto oficial en las 3 variantes", () => {
      const [ordonnance, chivalry] = game.civs.Franks!.uniqueTechs;
      expect(ordonnance).toEqual({
        id: "tech:1496",
        age: "castle",
        cost: cost({ food: 400, gold: 250 }),
        effect: {
          en: "Mounted Crossbowmen cost -40% gold",
          es: "los ballesteros a caballo cuestan un 40 % menos de oro",
          mx: "costo de los ballesteros montados -40% de oro",
        },
      });
      expect(chivalry!.id).toBe("tech:493");
      expect(chivalry!.effect.en).toBe("Stables work +40% faster");
    });

    it("edificios propios con coste y descripción oficial (sin HTML ni marcadores)", () => {
      const buildings = game.civs.Armenians!.ownBuildings;
      expect(buildings.map((b) => b.id)).toEqual(["building:1808", "building:1806"]);
      const church = buildings.find((b) => b.id === "building:1806")!;
      expect(church.cost).toEqual(cost({ wood: 200 }));
      expect(church.description.en).toMatch(/^Unique Monastery of the Armenians and the Georgians\./);
      expect(church.description.mx).toMatch(/^Monasterio único de los armenios y georgianos\./);
      for (const text of Object.values(church.description)) expect(text).not.toMatch(/[<>‹›]/);
      expect(game.civs.Franks!.ownBuildings).toEqual([]);
    });
  });

  describe("RF-17 / RF-25 nombres oficiales de entidades", () => {
    it("salen del texto de ayuda (negrita) en las 3 variantes", () => {
      expect(game.entities["unit:4"]!.name.en).toBe("Archer");
      expect(game.entities["tech:199"]!.name).toEqual({
        en: "Fletching",
        es: "Emplumado de flechas",
        mx: "Emplumado de flechas",
      });
    });

    it("si una entidad no tiene texto de ayuda, se usa la etiqueta del árbol sin saltos de línea", () => {
      const copy: RawSource = structuredClone(src);
      const id = String(copy.data.data.Unit["281"]!.LanguageNameId! + 21000);
      for (const locale of ["en", "es", "mx"] as const) delete copy.strings[locale][id];
      expect(build(copy).game.entities["unit:281"]!.name.en).toBe("Throwing Axeman");
    });
  });

  describe("disponibilidad por civilización (para validar RF-33)", () => {
    it("contiene las referencias canónicas de lo que la civilización tiene", () => {
      expect(availability.Franks).toContain("unit:281");
      expect(availability.Franks).toContain("tech:493");
      expect(availability.Franks).not.toContain("unit:1800");
      expect(availability.Armenians).toContain("building:1806");
    });
  });

  describe("RF-28 historial de huellas del parche", () => {
    it("guarda la huella de cada civilización y de cada entidad", () => {
      expect(history.patch).toBe("188329");
      expect(Object.keys(history.civs).sort()).toEqual(["Armenians", "Aztecs", "Franks"]);
      expect(history.civs.Franks).toMatch(/^[0-9a-f]{16}$/);
      const entityCount =
        Object.keys(src.data.data.Unit).length +
        Object.keys(src.data.data.Tech).length +
        Object.keys(src.data.data.Building).length;
      expect(Object.keys(history.entities)).toHaveLength(entityCount);
      expect(history.entities["unit:281"]).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe("RF-35 traducciones faltantes", () => {
    it("con los datos reales no falta ninguna", () => {
      const report = new TranslationReport();
      build(src, report);
      expect(report.entries).toEqual([]);
    });

    it("si falta un nombre en mx, usa es y lo informa sin bloquear", () => {
      const copy: RawSource = structuredClone(src);
      delete copy.strings.mx[String(copy.data.civs.Franks!.name_string_id)];
      const report = new TranslationReport();
      expect(build(copy, report).game.civs.Franks!.name.mx).toBe("Francos");
      expect(report.entries).toEqual([
        expect.objectContaining({ locale: "mx", usedLocale: "es", context: "civ Franks: name" }),
      ]);
    });
  });

  describe("RF-17 casos límite", () => {
    it("una unidad única oficial sin entidad asociada se muestra sin id ni coste (casos reales: Ratha, Blackwood Archer)", () => {
      const copy: RawSource = structuredClone(src);
      const id = helpId(copy, "Franks");
      copy.strings.en[id] = copy.strings.en[id]!.replace("Throwing Axeman (Infantry)", "Mystery Unit (Infantry)");
      const unit = build(copy).game.civs.Franks!.uniqueUnits[0]!;
      expect(unit).toMatchObject({ id: null, cost: null });
      expect(unit.name.en).toBe("Mystery Unit (Infantry)");
    });

    it("falla con DatasetError si el texto y el árbol no coinciden en número de tecnologías únicas", () => {
      const copy: RawSource = structuredClone(src);
      const id = helpId(copy, "Franks");
      copy.strings.en[id] = copy.strings.en[id]!.replace(/<br>\n• Chivalry \(Stables work \+40% faster\)/, "");
      expect(() => build(copy)).toThrow(DatasetError);
      expect(() => build(copy)).toThrow(/Franks/);
    });
  });
});
