/**
 * Verifica los datos REALES generados por `npm run data:update` (versionados en data/).
 * Si la importación no pudiera parsear alguna civilización, fallaría y no generaría estos archivos.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CivId, EntityRef, GameDataset, PatchHistory } from "../../src/core/types";
import { GAME_LOCALES } from "../../src/core/types";
import { CARD_CIVS } from "../../src/core/scope";

const DATA = join(import.meta.dirname, "..", "..", "data");
const read = <T>(file: string): T => JSON.parse(readFileSync(join(DATA, file), "utf8")) as T;

describe("T8 datos importados de aoe2techtree", () => {
  const source = read<{ repo: string; commit: string; patch: string; patchOrigin: string; importedAt: string }>(
    "source.json",
  );
  const game = read<GameDataset>("game.json");
  const civs = Object.entries(game.civs);

  it("RF-26 / RF-27 source.json registra repo, commit fijado y parche con su origen", () => {
    expect(source.repo).toBe("SiegeEngineers/aoe2techtree");
    expect(source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(source.patch).toMatch(/^\d+$/);
    expect(["commit", "manual"]).toContain(source.patchOrigin);
    expect(game.patch).toBe(source.patch);
  });

  it("RF-1 game.json contiene las 56 civilizaciones", () => {
    expect(civs).toHaveLength(56);
  });

  it("RF-17 parseo de las 56 civilizaciones × 3 variantes: todos los campos presentes y sin HTML", () => {
    for (const [civ, data] of civs) {
      for (const locale of GAME_LOCALES) {
        const where = `${civ}/${locale}`;
        const texts = [
          data.name[locale],
          data.specialty[locale],
          data.teamBonus[locale],
          ...data.bonuses[locale],
          ...data.uniqueUnits.map((u) => u.name[locale]),
          ...data.uniqueTechs.map((t) => t.effect[locale]),
          ...data.ownBuildings.map((b) => b.description[locale]),
        ];
        expect(data.bonuses[locale].length, where).toBeGreaterThan(0);
        expect(data.uniqueUnits.length, where).toBeGreaterThan(0);
        expect(data.uniqueTechs.length, where).toBeGreaterThan(0);
        for (const text of texts) {
          expect(text.trim().length, where).toBeGreaterThan(0);
          expect(text, where).not.toMatch(/<[^>]+>/);
        }
      }
    }
  });

  it("RF-17 las 10 civilizaciones con ficha tienen todas sus unidades únicas asociadas a entidad y coste", () => {
    for (const civ of CARD_CIVS) {
      const data = game.civs[civ];
      expect(data, civ).toBeDefined();
      for (const unit of data!.uniqueUnits) {
        expect(unit.id, `${civ}: ${unit.name.en}`).not.toBeNull();
        expect(unit.cost, `${civ}: ${unit.name.en}`).not.toBeNull();
      }
    }
  });

  it("RF-17 caso real: los Persas tienen el Savar como segunda unidad única", () => {
    expect(game.civs.Persians!.uniqueUnits.map((u) => u.name.en)).toEqual(["War Elephant (Cavalry)", "Savar (Cavalry)"]);
  });

  it("RF-17 existe el escudo de cada civilización", () => {
    for (const [civ, data] of civs) expect(existsSync(join(DATA, data.shield)), civ).toBe(true);
  });

  it("RF-28 el historial del parche tiene la huella de las 56 civilizaciones", () => {
    const history = read<PatchHistory>(join("history", `${source.patch}.json`));
    expect(history.patch).toBe(source.patch);
    expect(Object.keys(history.civs)).toHaveLength(56);
  });

  it("RF-33 availability.json cubre las 56 civilizaciones", () => {
    const availability = read<Record<CivId, EntityRef[]>>("availability.json");
    expect(Object.keys(availability)).toHaveLength(56);
    expect(availability.Franks).toContain("tech:493");
  });

  it("RF-35 existe el informe de traducciones faltantes", () => {
    const report = read<{ count: number; missing: unknown[] }>(join("reports", "missing-translations.json"));
    expect(report.count).toBe(report.missing.length);
  });
});
