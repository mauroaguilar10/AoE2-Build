/**
 * Genera los fixtures de tests a partir de un commit fijado de aoe2techtree,
 * recortados a 3 civilizaciones y solo a las cadenas que esas civilizaciones usan.
 *
 * Uso: node tools/make-fixtures.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { RawDataJson, RawEntity, RawStrings, RawTree, GameLocale } from "../src/core/types.ts";

const REPO = "SiegeEngineers/aoe2techtree";
/** "Implement DE Update 188329" (27/10/2026). */
const COMMIT = "e56728e76b7d08301fba7b18d5f16bc8554c109a";
const CIVS = ["Franks", "Aztecs", "Armenians"] as const;
const LOCALES: GameLocale[] = ["en", "es", "mx"];
const OUT = join(import.meta.dirname, "..", "tests", "fixtures", "aoe2techtree");

async function fetchJson<T>(path: string): Promise<T> {
  const url = `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

function write(relPath: string, value: unknown): void {
  const file = join(OUT, relPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 1) + "\n", "utf8");
}

function pick(source: Record<string, RawEntity>, ids: Iterable<number>): Record<string, RawEntity> {
  const out: Record<string, RawEntity> = {};
  for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
    const entry = source[String(id)];
    if (entry) out[String(id)] = entry;
  }
  return out;
}

const data = await fetchJson<RawDataJson>("data/data.json");
const trees: Record<string, RawTree> = {};
for (const civ of CIVS) trees[civ] = await fetchJson<RawTree>(`data/trees/${civ.toUpperCase()}.json`);

// IDs de entidades: las disponibles para cada civ y las que aparecen en su árbol.
const unitIds: number[] = [];
const techIds: number[] = [];
const buildingIds: number[] = [];
const stringIds = new Set<string>();

for (const civ of CIVS) {
  const raw = data.civs[civ];
  if (!raw) throw new Error(`La civilización ${civ} no existe en data.json`);
  unitIds.push(...raw.Unit);
  techIds.push(...raw.Tech);
  buildingIds.push(...raw.Building);
  stringIds.add(String(raw.name_string_id));
  stringIds.add(String(raw.help_string_id));
  const tree = trees[civ]!;
  for (const node of [...tree.units_techs, ...tree.buildings]) {
    if (node.use_type === "Unit") unitIds.push(node.node_id);
    else if (node.use_type === "Tech") techIds.push(node.node_id);
    else if (node.use_type === "Building") buildingIds.push(node.node_id);
    stringIds.add(String(node.name_string_id));
    stringIds.add(String(node.help_string_id));
  }
}

const trimmed: RawDataJson = {
  age_names: data.age_names,
  civs: Object.fromEntries(CIVS.map((civ) => [civ, data.civs[civ]!])),
  data: {
    Unit: pick(data.data.Unit, unitIds),
    Tech: pick(data.data.Tech, techIds),
    Building: pick(data.data.Building, buildingIds),
    unit_upgrades: pick(data.data.unit_upgrades, [...unitIds, ...techIds]),
  },
  tech_tree_strings: data.tech_tree_strings,
};

for (const group of Object.values(trimmed.data)) {
  for (const entity of Object.values(group)) {
    if (entity.LanguageNameId !== undefined) {
      stringIds.add(String(entity.LanguageNameId));
      // Texto de ayuda oficial con el nombre en negrita: convención LanguageNameId + 21000.
      stringIds.add(String(entity.LanguageNameId + 21000));
    }
  }
}
for (const ids of Object.values(data.age_names)) ids.forEach((id) => stringIds.add(id));
Object.values(data.tech_tree_strings).forEach((id) => stringIds.add(id));

write("data.json", trimmed);
for (const civ of CIVS) write(`trees/${civ.toUpperCase()}.json`, trees[civ]);
for (const locale of LOCALES) {
  const strings = await fetchJson<RawStrings>(`data/locales/${locale}/strings.json`);
  const subset: RawStrings = {};
  for (const id of [...stringIds].sort((a, b) => Number(a) - Number(b))) {
    if (strings[id] !== undefined) subset[id] = strings[id];
  }
  write(`locales/${locale}/strings.json`, subset);
}
write("meta.json", { repo: REPO, commit: COMMIT, civs: CIVS });

console.log(`Fixtures generados en ${OUT} (${CIVS.join(", ")}, commit ${COMMIT.slice(0, 7)})`);
