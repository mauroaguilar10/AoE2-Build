import { describe, expect, it } from "vitest";
import { loadFixtureSource, FIXTURE_CIVS } from "./fixtures/load";

describe("T2 fixtures (base para RF-17, RF-32, RF-33)", () => {
  const src = loadFixtureSource();

  it("contienen exactamente 3 civilizaciones: Franks, Aztecs y Armenians", () => {
    expect(Object.keys(src.data.civs).sort()).toEqual([...FIXTURE_CIVS].sort());
    expect(Object.keys(src.data.civs)).toHaveLength(3);
  });

  it("incluyen el árbol tecnológico de cada civilización", () => {
    for (const civ of FIXTURE_CIVS) {
      const tree = src.trees[civ];
      expect(tree, civ).toBeDefined();
      expect(tree!.units_techs.length, civ).toBeGreaterThan(0);
      expect(tree!.buildings.length, civ).toBeGreaterThan(0);
    }
  });

  it("incluyen nombre y texto de ayuda de cada civilización en en, es y mx", () => {
    for (const civ of FIXTURE_CIVS) {
      const raw = src.data.civs[civ]!;
      for (const locale of ["en", "es", "mx"] as const) {
        expect(src.strings[locale][String(raw.name_string_id)], `${civ} name ${locale}`).toBeTruthy();
        expect(src.strings[locale][String(raw.help_string_id)], `${civ} help ${locale}`).toBeTruthy();
      }
    }
  });

  it("incluyen los datos mecánicos de toda entidad disponible para esas civilizaciones", () => {
    for (const civ of FIXTURE_CIVS) {
      const raw = src.data.civs[civ]!;
      for (const id of raw.Unit) {
        const entity = src.data.data.Unit[String(id)] ?? src.data.data.unit_upgrades[String(id)];
        expect(entity, `${civ} unit ${id}`).toBeDefined();
      }
      for (const id of raw.Tech) expect(src.data.data.Tech[String(id)], `${civ} tech ${id}`).toBeDefined();
      for (const id of raw.Building) expect(src.data.data.Building[String(id)], `${civ} building ${id}`).toBeDefined();
    }
  });

  it("registran de qué commit de aoe2techtree proceden", () => {
    expect(src.meta.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});
