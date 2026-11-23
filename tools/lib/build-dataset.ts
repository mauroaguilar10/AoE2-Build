/**
 * Ensambla, a partir de los datos de origen de aoe2techtree, todo lo que genera la importación:
 *  - game:         dataset compacto que consume la app (data/game.json)            RF-1, RF-17, RF-26
 *  - availability: lo que tiene cada civ, para validar fichas (data/availability.json)  RF-33
 *  - history:      huellas mecánicas del parche (data/history/<parche>.json)        RF-28, RF-31
 * Las traducciones faltantes se resuelven con respaldo y se anotan en el informe (RF-35).
 */
import type {
  CivData,
  CivId,
  EntityKind,
  EntityRef,
  GameDataset,
  GameEntity,
  GameLocale,
  GameText,
  OwnBuilding,
  PatchHistory,
  RawSource,
  UniqueTech,
  UniqueUnit,
} from "../../src/core/types.ts";
import { GAME_LOCALES } from "../../src/core/types.ts";
import { parseCivHelp, type ParsedCivHelp } from "./parse-civ-help.ts";
import { extractUniqueEntities, HELP_STRING_OFFSET } from "./extract-unique.ts";
import { resolveGameText, type TranslationReport } from "./translations.ts";
import { civFingerprint, refFingerprint } from "./fingerprint.ts";

export class DatasetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatasetError";
  }
}

export interface BuiltDataset {
  game: GameDataset;
  availability: Record<CivId, EntityRef[]>;
  history: PatchHistory;
  /** Entidades sin ningún nombre disponible (no se incluyen en game.entities). */
  unnamed: EntityRef[];
}

const KIND_BY_TABLE = { Unit: "unit", Tech: "tech", Building: "building" } as const satisfies Record<
  string,
  EntityKind
>;
type Table = keyof typeof KIND_BY_TABLE;
const TABLES = Object.keys(KIND_BY_TABLE) as Table[];

function mapLocales<T>(fn: (locale: GameLocale) => T): GameText<T> {
  return Object.fromEntries(GAME_LOCALES.map((locale) => [locale, fn(locale)])) as GameText<T>;
}

function stripTags(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

/** "Research <b>Chivalry</b> (‹cost›)…" → "Chivalry". */
function boldName(helpText: string): string | null {
  const match = /<b>(.*?)<\/b>/i.exec(helpText);
  return match ? stripTags(match[1]!) || null : null;
}

/** Segunda línea del texto de ayuda: la descripción (sin título, mejoras ni marcadores de estadísticas). */
function descriptionLine(helpText: string): string {
  const lines = helpText.split(/<br\s*\/?>/i);
  return stripTags(lines[1] ?? "");
}

/** Nombre de clase final entre paréntesis fuera: "Konnik (Cavalry)" → "Konnik". */
function baseName(officialListEntry: string): string {
  return officialListEntry.replace(/\s*\([^()]*(\([^()]*\)[^()]*)*\)\s*$/, "").trim();
}

/** Etiquetas del árbol por referencia (respaldo para nombres de entidades sin texto de ayuda). */
function treeLabels(source: RawSource): Map<EntityRef, number> {
  const labels = new Map<EntityRef, number>();
  for (const tree of Object.values(source.trees)) {
    for (const node of [...tree.units_techs, ...tree.buildings]) {
      const kind = node.use_type === "Unit" ? "unit" : node.use_type === "Tech" ? "tech" : node.use_type === "Building" ? "building" : null;
      if (!kind) continue;
      const ref: EntityRef = `${kind}:${node.node_id}`;
      if (!labels.has(ref)) labels.set(ref, node.name_string_id);
    }
  }
  return labels;
}

function buildEntities(source: RawSource, report: TranslationReport): { entities: Record<EntityRef, GameEntity>; unnamed: EntityRef[] } {
  const labels = treeLabels(source);
  const entities: Record<EntityRef, GameEntity> = {};
  const unnamed: EntityRef[] = [];
  const has = (id: string) => GAME_LOCALES.some((locale) => (source.strings[locale][id] ?? "").trim() !== "");

  for (const table of TABLES) {
    for (const [id, entity] of Object.entries(source.data.data[table])) {
      const ref: EntityRef = `${KIND_BY_TABLE[table]}:${Number(id)}`;
      const helpId = entity.LanguageNameId === undefined ? null : String(entity.LanguageNameId + HELP_STRING_OFFSET);
      const labelId = labels.has(ref) ? String(labels.get(ref)) : null;

      const help = helpId && has(helpId) ? resolveGameText(helpId, source.strings, report, `${ref}: name`) : null;
      const label = labelId && has(labelId) ? resolveGameText(labelId, source.strings, report, `${ref}: label`) : null;

      const name = mapLocales((locale) => (help && boldName(help[locale])) || (label && stripTags(label[locale])) || "");
      if (GAME_LOCALES.some((locale) => name[locale] === "")) {
        unnamed.push(ref);
        continue;
      }
      entities[ref] = { name };
    }
  }
  return { entities, unnamed };
}

function buildCiv(
  civ: CivId,
  source: RawSource,
  entities: Record<EntityRef, GameEntity>,
  report: TranslationReport,
): CivData {
  const raw = source.data.civs[civ]!;
  const tree = source.trees[civ];
  if (!tree) throw new DatasetError(`${civ}: falta su árbol tecnológico (trees/${civ.toUpperCase()}.json)`);

  const name = resolveGameText(String(raw.name_string_id), source.strings, report, `civ ${civ}: name`);
  const helpText = resolveGameText(String(raw.help_string_id), source.strings, report, `civ ${civ}: help`);
  const parsed = mapLocales<ParsedCivHelp>((locale) => {
    try {
      return parseCivHelp(helpText[locale]);
    } catch (error) {
      throw new DatasetError(`${civ} (${locale}): ${(error as Error).message}`);
    }
  });

  const extracted = extractUniqueEntities(civ, source.data, tree);

  // Unidades únicas: la lista oficial del texto, asociada por nombre inglés a su entidad.
  const uniqueUnits: UniqueUnit[] = parsed.en.uniqueUnits.map((officialEn, index) => {
    const match = extracted.uniqueUnitCandidates.find((candidate) => entities[candidate.id]?.name.en === baseName(officialEn));
    return {
      id: match?.id ?? null,
      name: mapLocales((locale) => parsed[locale].uniqueUnits[index] ?? officialEn),
      cost: match?.cost ?? null,
    };
  });

  // Tecnologías únicas: el texto y el árbol coinciden en número y orden (verificado en las 56 civs).
  for (const locale of GAME_LOCALES) {
    if (parsed[locale].uniqueTechs.length !== extracted.uniqueTechs.length) {
      throw new DatasetError(
        `${civ} (${locale}): el texto lista ${parsed[locale].uniqueTechs.length} tecnologías únicas y el árbol ${extracted.uniqueTechs.length}`,
      );
    }
  }
  const uniqueTechs: UniqueTech[] = extracted.uniqueTechs.map((tech, index) => ({
    id: tech.id,
    age: tech.age,
    cost: tech.cost,
    effect: mapLocales((locale) => parsed[locale].uniqueTechs[index]!.effect),
  }));

  const ownBuildings: OwnBuilding[] = extracted.ownBuildings.map((building) => {
    const help =
      building.helpStringId === null
        ? null
        : resolveGameText(String(building.helpStringId), source.strings, report, `${building.id}: description`);
    return {
      id: building.id,
      cost: building.cost,
      description: mapLocales((locale) => (help ? descriptionLine(help[locale]) : "")),
    };
  });

  return {
    name,
    shield: `shields/${civ.toLowerCase()}.png`,
    specialty: mapLocales((locale) => parsed[locale].specialty),
    bonuses: mapLocales((locale) => parsed[locale].bonuses),
    teamBonus: mapLocales((locale) => parsed[locale].teamBonus),
    uniqueUnits,
    uniqueTechs,
    ownBuildings,
  };
}

export function buildDataset(source: RawSource, patch: string, report: TranslationReport): BuiltDataset {
  const { entities, unnamed } = buildEntities(source, report);

  const civs: Record<CivId, CivData> = {};
  const availability: Record<CivId, EntityRef[]> = {};
  const civFingerprints: Record<CivId, string> = {};

  for (const civ of Object.keys(source.data.civs).sort()) {
    const raw = source.data.civs[civ]!;
    civs[civ] = buildCiv(civ, source, entities, report);
    availability[civ] = [
      ...raw.Unit.map((id): EntityRef => `unit:${id}`),
      ...raw.Tech.map((id): EntityRef => `tech:${id}`),
      ...raw.Building.map((id): EntityRef => `building:${id}`),
    ];
    civFingerprints[civ] = civFingerprint(civ, source.data, source.strings.en);
  }

  const entityFingerprints: Record<EntityRef, string> = {};
  for (const table of TABLES) {
    for (const id of Object.keys(source.data.data[table])) {
      const ref: EntityRef = `${KIND_BY_TABLE[table]}:${Number(id)}`;
      entityFingerprints[ref] = refFingerprint(ref, source.data);
    }
  }

  return {
    game: { patch, civs, entities },
    availability,
    history: { patch, civs: civFingerprints, entities: entityFingerprints },
    unnamed,
  };
}
