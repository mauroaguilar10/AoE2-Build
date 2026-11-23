import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateCards, formatIssues, type CardFile, type IntegrityContext } from "../../tools/lib/integrity";
import { parseCard } from "../../tools/lib/card-schema";
import { buildDataset } from "../../tools/lib/build-dataset";
import { TranslationReport } from "../../tools/lib/translations";
import { loadFixtureSource } from "../fixtures/load";
import { CARD_CIVS } from "../../src/core/scope";
import type { MapId, TacticalCard } from "../../src/core/types";
import { MAP_IDS } from "../../src/core/types";

const built = buildDataset(loadFixtureSource(), "188329", new TranslationReport());
const base = parseCard(
  readFileSync(join(import.meta.dirname, "..", "fixtures", "cards", "franks.arabia.1v1.yaml"), "utf8"),
  "franks.arabia.1v1.yaml",
);

/** Contexto con los datos de prueba: solo Francos en alcance, en los 3 mapas. */
const ctx = (civs: string[] = ["Franks"]): IntegrityContext => ({
  game: built.game,
  availability: built.availability,
  scope: { civs, maps: [...MAP_IDS] },
});

function card(changes: (c: TacticalCard) => void = () => {}): TacticalCard {
  const copy = structuredClone(base);
  changes(copy);
  return copy;
}

const file = (c: TacticalCard): CardFile => ({ file: `${c.civ.toLowerCase()}.${c.map}.${c.role}.yaml`, card: c });
const franksAll = (changes: (c: TacticalCard) => void = () => {}): CardFile[] =>
  MAP_IDS.map((map: MapId) =>
    file(
      card((c) => {
        c.map = map;
        changes(c);
      }),
    ),
  );

/** Aztecas con referencias válidas para su árbol (Explorador águila en lugar de scouts). */
const aztecs = (changes: (c: TacticalCard) => void = () => {}): CardFile[] =>
  MAP_IDS.map((map: MapId) =>
    file(
      card((c) => {
        c.civ = "Aztecs";
        c.map = map;
        c.attack.core = ["unit:751"];
        c.attack.transition.units = ["unit:725"];
        c.attack.upgrades = ["tech:67", "tech:199"];
        c.economy.buildOrder[1]!.text = { es: "4 a madera", en: "4 on wood" };
        c.attack.when = { es: "Al llegar a Feudal", en: "On reaching Feudal" };
        changes(c);
      }),
    ),
  );

describe("T10 reglas de integridad del contenido", () => {
  it("un conjunto completo y coherente no tiene problemas", () => {
    expect(validateCards(franksAll(), ctx())).toEqual([]);
    expect(validateCards([...franksAll(), ...aztecs()], ctx(["Franks", "Aztecs"]))).toEqual([]);
  });

  describe("RF-32 referencias que no existen", () => {
    it("detecta una civilización inexistente", () => {
      const issues = validateCards([file(card((c) => (c.civ = "Atlanteans")))], ctx(["Atlanteans"]));
      expect(issues).toContainEqual(
        expect.objectContaining({ rule: "RF-32", path: "civ", message: expect.stringContaining("Atlanteans") }),
      );
    });

    it("detecta una entidad inexistente mencionada en el texto, indicando campo e idioma", () => {
      const issues = validateCards(
        franksAll((c) => {
          if (c.map === "arabia") c.economy.buildOrder[1]!.text.es = "4 a madera; jabalí con [[unit:999999]]";
        }),
        ctx(),
      );
      expect(issues).toEqual([
        expect.objectContaining({
          file: "franks.arabia.1v1.yaml",
          rule: "RF-32",
          path: "economy.buildOrder.1.text.es",
          message: expect.stringContaining("unit:999999"),
        }),
      ]);
    });

    it("detecta una referencia mal escrita en el texto", () => {
      const issues = validateCards(
        franksAll((c) => {
          if (c.map === "arena") c.attack.when.en = "Attack with [[knight]]";
        }),
        ctx(),
      );
      expect(issues).toEqual([
        expect.objectContaining({ rule: "RF-32", path: "attack.when.en", message: expect.stringContaining("[[knight]]") }),
      ]);
    });

    it("detecta una entidad inexistente en un campo estructurado", () => {
      const issues = validateCards(franksAll((c) => (c.attack.support = ["unit:999999"])), ctx());
      expect(issues.filter((i) => i.rule === "RF-32" && i.path === "attack.support.0")).toHaveLength(3);
    });
  });

  describe("RF-33 recomendaciones fuera del árbol de la civilización", () => {
    it("detecta scouts recomendados a los Aztecas, indicando civ, mapa y entidad", () => {
      const issues = validateCards(
        aztecs((c) => {
          if (c.map === "arabia") c.attack.core = ["unit:448"];
        }),
        ctx(["Aztecs"]),
      );
      expect(issues).toEqual([
        expect.objectContaining({
          file: "aztecs.arabia.1v1.yaml",
          rule: "RF-33",
          path: "attack.core.0",
          message: expect.stringMatching(/Aztecs.*arabia.*unit:448.*Scout Cavalry/),
        }),
      ]);
    });

    it("detecta una mejora que la civilización no tiene (Pureza de sangre para Francos)", () => {
      const issues = validateCards(franksAll((c) => (c.attack.upgrades = ["tech:435", "tech:67"])), ctx());
      expect(issues.filter((i) => i.rule === "RF-33" && i.path === "attack.upgrades.0")).toHaveLength(3);
    });

    it("revisa también apoyo y transición", () => {
      const issues = validateCards(
        aztecs((c) => {
          c.attack.support = ["unit:38"];
          c.attack.transition.units = ["unit:38"];
        }),
        ctx(["Aztecs"]),
      );
      expect(new Set(issues.map((i) => i.path))).toEqual(new Set(["attack.support.0", "attack.transition.units.0"]));
    });

    it("el texto libre SÍ puede mencionar unidades que la civilización no tiene (p. ej. las del rival)", () => {
      const issues = validateCards(
        aztecs((c) => (c.attack.when = { es: "Antes de que lleguen los [[unit:38]]", en: "Before enemy [[unit:38]] arrive" })),
        ctx(["Aztecs"]),
      );
      expect(issues).toEqual([]);
    });
  });

  describe("RF-36 fichas completas: cada civilización en alcance × 3 mapas", () => {
    it("detecta una combinación de civilización y mapa que falta", () => {
      const issues = validateCards(franksAll().filter((f) => f.card.map !== "arena"), ctx());
      expect(issues).toEqual([
        expect.objectContaining({ rule: "RF-36", file: "franks.arena.1v1.yaml", message: expect.stringContaining("falta") }),
      ]);
    });

    it("detecta todas las que faltan de una civilización sin ninguna ficha", () => {
      const issues = validateCards(franksAll(), ctx(["Franks", "Aztecs"]));
      expect(issues.map((i) => i.file).sort()).toEqual([
        "aztecs.arabia.1v1.yaml",
        "aztecs.arena.1v1.yaml",
        "aztecs.black_forest.1v1.yaml",
      ]);
    });

    it("detecta una ficha duplicada", () => {
      const [first] = franksAll();
      const issues = validateCards([...franksAll(), first!], ctx());
      expect(issues).toContainEqual(expect.objectContaining({ rule: "RF-36", message: expect.stringContaining("duplicada") }));
    });

    it("detecta una ficha de una civilización fuera del alcance de esta iteración", () => {
      const issues = validateCards([...franksAll(), ...aztecs()], ctx(["Franks"]));
      expect(issues.filter((i) => i.rule === "RF-36" && i.message.includes("fuera del alcance"))).toHaveLength(3);
    });

    it("el alcance real son las 10 civilizaciones de la spec (30 fichas)", () => {
      expect([...CARD_CIVS].sort()).toEqual(
        ["Aztecs", "Britons", "Franks", "Goths", "Khmer", "Mayans", "Mongols", "Persians", "Spanish", "Turks"],
      );
      expect(CARD_CIVS.length * MAP_IDS.length).toBe(30);
    });
  });

  it("formatIssues agrupa los problemas por archivo con regla, campo y mensaje", () => {
    const issues = validateCards(
      aztecs((c) => {
        if (c.map === "arabia") c.attack.core = ["unit:448"];
      }),
      ctx(["Aztecs"]),
    );
    const text = formatIssues(issues);
    expect(text).toContain("aztecs.arabia.1v1.yaml");
    expect(text).toMatch(/\[RF-33\] attack\.core\.0: /);
  });
});
