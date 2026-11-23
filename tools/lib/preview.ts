/**
 * Vista previa de una ficha para que el mantenedor la revise antes de aprobarla:
 * la ficha resuelta en ES y EN con los nombres oficiales (sin [[…]]), más lo que solo
 * ve el revisor: fuentes, estado de aprobación y problemas de integridad.
 */
import type { EntityRef, GameDataset, GameLocale, Lang, Nomenclature, TacticalCard, VillagerSplit } from "../../src/core/types.ts";
import type { StaleChange } from "../../src/core/staleness.ts";
import { replaceTokens } from "../../src/core/tokens.ts";
import { MAP_NAMES } from "../../src/core/maps.ts";
import { displayName } from "../../src/core/i18n.ts";

export type PreviewStatus =
  | { kind: "draft" }
  | { kind: "approved"; reviewedPatch: string; modified: boolean; changes: StaleChange[] };

export interface PreviewInput {
  card: TacticalCard;
  game: GameDataset;
  nomenclature: Nomenclature;
  status: PreviewStatus;
  /** Problemas de integridad ya formateados (vacío si la ficha es coherente con el juego). */
  issues: string[];
}

const LABELS = {
  es: {
    section: "ESPAÑOL",
    economy: "ECONOMÍA",
    opening: "Apertura",
    ageUp: (feudal: number, castle: number) => `Subir a Feudal con ${feudal} · a Castillos con ${castle}`,
    villagers: "Aldeanos",
    split: (s: VillagerSplit, total: number) =>
      `${s.food} comida · ${s.wood} madera · ${s.gold} oro · ${s.stone} piedra (total ${total})`,
    feudal: "Feudal",
    castle: "Castillos",
    buildOrder: "Build order",
    attack: "ATAQUE",
    when: "Cuándo",
    core: "Núcleo",
    support: "Apoyo",
    transition: "Transición",
    upgrades: "Mejoras",
  },
  en: {
    section: "ENGLISH",
    economy: "ECONOMY",
    opening: "Opening",
    ageUp: (feudal: number, castle: number) => `Age up to Feudal at ${feudal} · to Castle at ${castle}`,
    villagers: "Villagers",
    split: (s: VillagerSplit, total: number) =>
      `${s.food} food · ${s.wood} wood · ${s.gold} gold · ${s.stone} stone (total ${total})`,
    feudal: "Feudal",
    castle: "Castle",
    buildOrder: "Build order",
    attack: "ATTACK",
    when: "When",
    core: "Core",
    support: "Support",
    transition: "Transition",
    upgrades: "Upgrades",
  },
} as const;

const total = (s: VillagerSplit) => s.food + s.wood + s.gold + s.stone;

function renderLang(card: TacticalCard, game: GameDataset, lang: Lang, nomenclature: Nomenclature): string[] {
  const locale: GameLocale = lang === "en" ? "en" : nomenclature;
  const unknown = (ref: EntityRef) => `‹${ref} desconocida›`;
  /** Dentro de una frase: el nombre oficial tal cual. */
  const name = (ref: EntityRef) => game.entities[ref]?.name[locale] ?? unknown(ref);
  /** Solo, en una lista: primera letra en mayúscula (igual que en la app). */
  const listName = (ref: EntityRef) => {
    const entity = game.entities[ref];
    return entity ? displayName(entity.name, lang, nomenclature) : unknown(ref);
  };
  const text = (t: Record<Lang, string>) => replaceTokens(t[lang], name);
  const names = (refs: EntityRef[]) => (refs.length > 0 ? refs.map(listName).join(", ") : "—");
  const L = LABELS[lang];
  const { economy, attack } = card;
  const civName = game.civs[card.civ]?.name[locale] ?? card.civ;
  const note = attack.transition.note ? ` — ${text(attack.transition.note)}` : "";

  return [
    `── ${L.section}${lang === "es" ? ` (nomenclatura ${nomenclature === "mx" ? "Latinoamérica" : "España"})` : ""} ──`,
    `${civName} · ${MAP_NAMES[card.map][lang]} · ${card.role}`,
    "",
    L.economy,
    `  ${L.opening}: ${text(economy.opening)}`,
    `  ${L.ageUp(economy.ageUpPop.feudal, economy.ageUpPop.castle)}`,
    `  ${L.villagers}:`,
    `    ${L.feudal}: ${L.split(economy.villagers.feudal, total(economy.villagers.feudal))}`,
    `    ${L.castle}: ${L.split(economy.villagers.castle, total(economy.villagers.castle))}`,
    `  ${L.buildOrder}:`,
    ...economy.buildOrder.map((step) => `    ${String(step.pop).padStart(3)}  ${text(step.text)}`),
    "",
    L.attack,
    `  ${L.when}: ${text(attack.when)}`,
    `  ${L.core}: ${names(attack.core)}`,
    `  ${L.support}: ${names(attack.support)}`,
    `  ${L.transition}: ${names(attack.transition.units)}${note}`,
    `  ${L.upgrades}: ${attack.upgrades.map((ref, i) => `${i + 1}. ${listName(ref)}`).join("  ")}`,
  ];
}

function renderStatus(status: PreviewStatus, game: GameDataset): string[] {
  if (status.kind === "draft") return ["Estado: BORRADOR (sin aprobar)"];
  const lines: string[] = [];
  if (status.changes.length > 0) {
    lines.push(`Estado: ⚠ Revisada en el parche ${status.reviewedPatch}; ha habido cambios después:`);
    for (const change of status.changes) {
      const changed = change.key.startsWith("civ:")
        ? (game.civs[change.key.slice(4)]?.name.en ?? change.key)
        : (game.entities[change.key as EntityRef]?.name.en ?? "(ya no existe)");
      lines.push(`  - ${change.key} · ${changed} · cambió en el parche ${change.changedIn}`);
    }
  } else {
    lines.push(`Estado: aprobada en el parche ${status.reviewedPatch}`);
  }
  if (status.modified) lines.push("⚠ La ficha fue modificada después de aprobarla: hay que volver a aprobarla.");
  return lines;
}

export function renderPreview({ card, game, nomenclature, status, issues }: PreviewInput): string {
  const lines = [
    `══ Vista previa: ${card.civ.toLowerCase()}.${card.map}.${card.role} ══`,
    ...renderStatus(status, game),
    "",
    "Fuentes (solo para revisión, el jugador no las ve):",
    ...card.sources.map((s) => `  - ${s.title} — ${s.url}`),
  ];
  if (issues.length > 0) {
    lines.push("", "⚠ PROBLEMAS (corregir antes de aprobar):", ...issues.map((i) => `  ${i}`));
  }
  lines.push("", ...renderLang(card, game, "es", nomenclature), "", ...renderLang(card, game, "en", nomenclature));
  return lines.join("\n");
}
