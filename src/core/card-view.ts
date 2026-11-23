/**
 * Vista de una tarjeta (RF-12 a RF-17): reúne los datos del juego de la civilización
 * y, si existe, su ficha táctica para el mapa, ya resueltos en el idioma y la nomenclatura activos.
 * La interfaz solo pinta lo que recibe; esta función no depende de la UI.
 */
import type {
  Age,
  CivId,
  Cost,
  CuratedText,
  EntityRef,
  GameDataset,
  GameText,
  Lang,
  MapId,
  Nomenclature,
  PublishedCard,
  VillagerSplit,
} from "./types.ts";
import { capitalize, displayName, gameLocale } from "./i18n.ts";
import { resolveText, type TextSegment } from "./tokens.ts";

/** Entidad citada por la ficha, con su nombre para mostrarla sola (primera letra en mayúscula). */
export interface NamedEntity {
  ref: EntityRef;
  name: string;
}

export interface TacticalView {
  /** Ficha sin aprobar: solo existe en los builds de borrador. Sin aviso de parche (decisión 34). */
  draft: boolean;
  /** RF-12, RF-13 */
  economy: {
    opening: TextSegment[];
    ageUpPop: { feudal: number; castle: number };
    villagers: { feudal: VillagerSplit; castle: VillagerSplit };
    buildOrder: { pop: number; text: TextSegment[] }[];
  };
  /** RF-14 */
  attack: {
    when: TextSegment[];
    core: NamedEntity[];
    support: NamedEntity[];
    transition: { units: NamedEntity[]; note: TextSegment[] | null };
    /** En orden de prioridad. */
    upgrades: NamedEntity[];
  };
}

export interface CardView {
  civ: CivId;
  map: MapId;
  /** RF-17: datos automáticos, presentes en todas las civilizaciones. */
  name: string;
  shield: string;
  specialty: string;
  bonuses: string[];
  teamBonus: string;
  /** `ref` y `cost` son null si la unidad no se pudo asociar al árbol (p. ej. Ratha). */
  uniqueUnits: { ref: EntityRef | null; name: string; cost: Cost | null }[];
  /** Castillos y después Imperial. */
  uniqueTechs: { ref: EntityRef; age: Age; name: string; cost: Cost; effect: string }[];
  /** Vacío si la civilización no tiene: la sección no se muestra (RF-17). */
  ownBuildings: { ref: EntityRef; name: string; cost: Cost; description: string }[];
  /** RF-16: null si no hay ficha para esta civilización en este mapa → mensaje "ficha no disponible". */
  tactical: TacticalView | null;
}

export interface CardViewInput {
  civ: CivId;
  map: MapId;
  game: GameDataset;
  cards: readonly PublishedCard[];
  lang: Lang;
  nomenclature: Nomenclature;
}

const AGE_ORDER: Record<Age, number> = { dark: 0, feudal: 1, castle: 2, imperial: 3 };

/** RF-15: la ficha de esa civilización en ese mapa (rol 1v1), o null. */
export function findCard(cards: readonly PublishedCard[], civ: CivId, map: MapId): PublishedCard | null {
  return cards.find((card) => card.civ === civ && card.map === map && card.role === "1v1") ?? null;
}

/** null si la civilización no existe en los datos del juego. */
export function buildCardView({ civ, map, game, cards, lang, nomenclature }: CardViewInput): CardView | null {
  const data = game.civs[civ];
  if (!data) return null;

  /** Texto oficial suelto (no dentro de una frase): primera letra en mayúscula. */
  const shown = (text: GameText) => displayName(text, lang, nomenclature);
  const entityName = (ref: EntityRef) => {
    const entity = game.entities[ref];
    return entity ? displayName(entity.name, lang, nomenclature) : ref;
  };
  const card = findCard(cards, civ, map);

  return {
    civ,
    map,
    name: shown(data.name),
    shield: data.shield,
    specialty: shown(data.specialty),
    bonuses: officialBonuses(data.bonuses, lang, nomenclature),
    teamBonus: shown(data.teamBonus),
    uniqueUnits: data.uniqueUnits.map((unit) => ({ ref: unit.id, name: shown(unit.name), cost: unit.cost })),
    uniqueTechs: [...data.uniqueTechs]
      .sort((a, b) => AGE_ORDER[a.age] - AGE_ORDER[b.age])
      .map((tech) => ({ ref: tech.id, age: tech.age, name: entityName(tech.id), cost: tech.cost, effect: shown(tech.effect) })),
    ownBuildings: data.ownBuildings.map((building) => ({
      ref: building.id,
      name: entityName(building.id),
      cost: building.cost,
      description: shown(building.description),
    })),
    tactical: card ? tacticalView(card, game, lang, nomenclature, entityName) : null,
  };
}

function officialBonuses(bonuses: GameText<string[]>, lang: Lang, nomenclature: Nomenclature): string[] {
  return bonuses[gameLocale(lang, nomenclature)].map((bonus) => capitalize(bonus, lang));
}

function tacticalView(
  card: PublishedCard,
  game: GameDataset,
  lang: Lang,
  nomenclature: Nomenclature,
  entityName: (ref: EntityRef) => string,
): TacticalView {
  const text = (value: CuratedText) => resolveText(value[lang], game.entities, lang, nomenclature);
  const named = (refs: EntityRef[]) => refs.map((ref) => ({ ref, name: entityName(ref) }));
  const { economy, attack, approved } = card;

  return {
    draft: !approved,
    economy: {
      opening: text(economy.opening),
      ageUpPop: economy.ageUpPop,
      villagers: economy.villagers,
      buildOrder: economy.buildOrder.map((step) => ({ pop: step.pop, text: text(step.text) })),
    },
    attack: {
      when: text(attack.when),
      core: named(attack.core),
      support: named(attack.support),
      transition: { units: named(attack.transition.units), note: attack.transition.note ? text(attack.transition.note) : null },
      upgrades: named(attack.upgrades),
    },
  };
}
