/**
 * Tipos de dominio de Guia-Age.
 *
 * Tres familias:
 *  1. Raw*      → formato de origen de aoe2techtree (solo lo usan las herramientas de importación).
 *  2. Game… y Civ… → dataset compacto que consume la app (data/game.json).
 *  3. Tactical… y Review… → contenido curado (content/cards, content/reviews).
 */

// ─── Idiomas ────────────────────────────────────────────────────────────────

/** Idioma de la interfaz y del texto táctico curado. */
export type Lang = "es" | "en";

/** Nomenclatura oficial del juego para el español: Latinoamérica (mx) o España (es). */
export type Nomenclature = "mx" | "es";

/** Variantes de texto oficial que trae el juego y que importamos. */
export type GameLocale = "en" | "es" | "mx";
export const GAME_LOCALES: readonly GameLocale[] = ["en", "es", "mx"];

/** Texto oficial del juego en sus 3 variantes. */
export type GameText<T = string> = Record<GameLocale, T>;

/** Texto curado por nosotros: siempre en español e inglés (constitución §6). */
export type CuratedText = Record<Lang, string>;

// ─── Identificadores canónicos (constitución §3) ────────────────────────────

/** Clave inglesa de la civilización en aoe2techtree, p. ej. "Franks". */
export type CivId = string;

export type MapId = "arabia" | "arena" | "black_forest";
export const MAP_IDS: readonly MapId[] = ["arabia", "arena", "black_forest"];

export type RoleId = "1v1";

export type Age = "dark" | "feudal" | "castle" | "imperial";

export type EntityKind = "unit" | "tech" | "building";

/** Referencia canónica a una entidad del juego: "unit:38", "tech:199". */
export type EntityRef = `${EntityKind}:${number}`;

export type Resource = "food" | "wood" | "gold" | "stone";
export type Cost = Record<Resource, number>;

// ─── 1. Formato de origen (aoe2techtree) ────────────────────────────────────

/** Coste tal como viene en data.json: claves con mayúscula y solo los recursos presentes. */
export type RawCost = Partial<Record<"Food" | "Wood" | "Gold" | "Stone", number>>;

export interface RawCiv {
  Building: number[];
  Tech: number[];
  Unit: number[];
  era: string;
  help_string_id: number;
  internal_name: string;
  meta: Record<string, unknown>;
  name_string_id: number;
}

/** Entrada de data.json → data.{Unit,Tech,Building,unit_upgrades}. Solo tipamos lo que usamos. */
export interface RawEntity {
  ID: number;
  internal_name: string;
  Cost: RawCost;
  LanguageNameId?: number;
  HP?: number;
  Attack?: number;
  Attacks?: { Amount: number; Class: number }[];
  Armours?: { Amount: number; Class: number }[];
  MeleeArmor?: number;
  PierceArmor?: number;
  Range?: number;
  Speed?: number;
  TrainTime?: number;
  ResearchTime?: number;
  [field: string]: unknown;
}

export interface RawDataJson {
  age_names: Record<string, string[]>;
  civs: Record<CivId, RawCiv>;
  data: {
    Unit: Record<string, RawEntity>;
    Tech: Record<string, RawEntity>;
    Building: Record<string, RawEntity>;
    unit_upgrades: Record<string, RawEntity>;
  };
  tech_tree_strings: Record<string, string>;
}

export type RawNodeType =
  | "Unit"
  | "UnitUpgrade"
  | "UniqueUnit"
  | "RegionalUnit"
  | "Research"
  | "UniqueTech"
  | "RegionalTech"
  | "BuildingNonTech"
  | "BuildingTech"
  | "RegionalBuilding"
  | null;

/** Nodo de data/trees/<CIV>.json. */
export interface RawTreeNode {
  id: number;
  node_id: number;
  name: string;
  name_string_id: number;
  help_string_id: number;
  node_type: RawNodeType;
  node_status: "ResearchedCompleted" | "ResearchRequired" | "NotAvailable" | string;
  use_type: "Unit" | "Tech" | "Building" | string;
  age_id: number;
  building_id: number;
  link_id: number | null;
  [field: string]: unknown;
}

export interface RawTree {
  buildings: RawTreeNode[];
  units_techs: RawTreeNode[];
}

/** strings.json: id de cadena → texto con HTML ligero (<br>, <b>). */
export type RawStrings = Record<string, string>;

/** Conjunto completo de origen que procesa la importación. */
export interface RawSource {
  data: RawDataJson;
  trees: Record<CivId, RawTree>;
  strings: Record<GameLocale, RawStrings>;
  meta: { repo: string; commit: string };
}

// ─── 2. Dataset de la app (data/game.json) ──────────────────────────────────

/**
 * Unidad única según la lista OFICIAL del texto de la civilización (con su clase, p. ej.
 * "Konnik (Cavalry)"). id y coste son null si no se pudo asociar a una entidad del árbol
 * (casos reales: Ratha de los Bengalíes, Blackwood Archer de los Tupí).
 */
export interface UniqueUnit {
  id: EntityRef | null;
  name: GameText;
  cost: Cost | null;
}

export interface UniqueTech {
  id: EntityRef;
  age: Age;
  cost: Cost;
  /** Efecto según el texto oficial de la civilización. */
  effect: GameText;
}

export interface OwnBuilding {
  id: EntityRef;
  cost: Cost;
  description: GameText;
}

export interface CivData {
  name: GameText;
  /** Ruta relativa del escudo, p. ej. "shields/franks.png". */
  shield: string;
  specialty: GameText;
  bonuses: GameText<string[]>;
  teamBonus: GameText;
  uniqueUnits: UniqueUnit[];
  uniqueTechs: UniqueTech[];
  /** Nodos RegionalBuilding de la civilización (plan §1: "Edificios propios"). */
  ownBuildings: OwnBuilding[];
}

export interface GameEntity {
  name: GameText;
}

export interface GameDataset {
  patch: string;
  civs: Record<CivId, CivData>;
  entities: Record<EntityRef, GameEntity>;
}

/** Huellas mecánicas de todo el juego en un parche (data/history/<parche>.json), base de RF-28 y RF-31. */
export interface PatchHistory {
  patch: string;
  civs: Record<CivId, string>;
  entities: Record<EntityRef, string>;
}

/** Disponibilidad por civilización; la usan solo las herramientas de validación (RF-33). */
export type CivAvailability = Record<CivId, ReadonlySet<EntityRef>>;

// ─── 3. Contenido curado ────────────────────────────────────────────────────

export interface ContentSource {
  title: string;
  url: string;
}

export type VillagerSplit = Cost;

export interface BuildStep {
  pop: number;
  text: CuratedText;
}

export interface TacticalCard {
  civ: CivId;
  map: MapId;
  role: RoleId;
  /** Obligatorias (RF-34); nunca llegan al navegador (RF-37). */
  sources: ContentSource[];
  economy: {
    opening: CuratedText;
    ageUpPop: { feudal: number; castle: number };
    villagers: { feudal: VillagerSplit; castle: VillagerSplit };
    buildOrder: BuildStep[];
  };
  attack: {
    when: CuratedText;
    core: EntityRef[];
    support: EntityRef[];
    transition: { units: EntityRef[]; note?: CuratedText };
    /** 2-3 mejoras en orden de prioridad (RF-14). */
    upgrades: EntityRef[];
  };
}

/** Estado de revisión que viaja con la ficha publicada (RF-28). null = sin aprobar (solo en borrador). */
export interface CardReviewStatus {
  reviewedPatch: string;
  /** true si algo que la ficha menciona cambió después del parche de revisión. */
  stale: boolean;
}

/** Ficha tal como llega al navegador: sin fuentes (RF-37) y con su estado de revisión. */
export type PublishedCard = Omit<TacticalCard, "sources"> & { review: CardReviewStatus | null };

/** Foto de referencia tomada al aprobar una ficha (RF-30). */
export interface ReviewSnapshot {
  reviewedPatch: string;
  approvedAt: string;
  /** Huella mecánica de cada entidad mencionada y de la civilización ("civ:<id>"). */
  fingerprints: Record<string, string>;
  /** Huella del contenido de la ficha aprobada: si se edita después, hay que volver a aprobarla. */
  cardHash: string;
}

/** Identificador de ficha: "<civ en minúsculas>.<mapa>.<rol>", p. ej. "franks.arabia.1v1". */
export type CardKey = `${string}.${MapId}.${RoleId}`;

// ─── Preferencias del usuario ───────────────────────────────────────────────

export interface Preferences {
  lang: Lang;
  nomenclature: Nomenclature;
  lastMap: MapId;
  lastCard: { civ: CivId; map: MapId } | null;
}
