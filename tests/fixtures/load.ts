import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GameLocale, RawDataJson, RawSource, RawStrings, RawTree } from "../../src/core/types";
import { GAME_LOCALES } from "../../src/core/types";

/** Civilizaciones incluidas en los fixtures (generados con tools/make-fixtures.ts). */
export const FIXTURE_CIVS = ["Franks", "Aztecs", "Armenians"] as const;

const ROOT = join(import.meta.dirname, "aoe2techtree");

function readJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(join(ROOT, relPath), "utf8")) as T;
}

/** Carga los datos recortados de aoe2techtree con la misma forma que usa la importación real. */
export function loadFixtureSource(): RawSource {
  const trees: Record<string, RawTree> = {};
  for (const civ of FIXTURE_CIVS) trees[civ] = readJson<RawTree>(`trees/${civ.toUpperCase()}.json`);

  const strings = {} as Record<GameLocale, RawStrings>;
  for (const locale of GAME_LOCALES) strings[locale] = readJson<RawStrings>(`locales/${locale}/strings.json`);

  const meta = readJson<{ repo: string; commit: string }>("meta.json");
  return {
    data: readJson<RawDataJson>("data.json"),
    trees,
    strings,
    meta: { repo: meta.repo, commit: meta.commit },
  };
}
