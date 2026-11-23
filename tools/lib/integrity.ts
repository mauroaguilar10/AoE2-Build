/**
 * Reglas de integridad del contenido táctico frente a los datos del juego:
 *  - RF-32: la civilización y toda entidad mencionada existen (campos estructurados y [[…]] del texto).
 *  - RF-33: lo que la ficha RECOMIENDA (núcleo, apoyo, transición, mejoras) está en el árbol de la civ.
 *           El texto libre puede mencionar unidades que la civ no tiene (p. ej. las del rival).
 *  - RF-36: existe exactamente una ficha por cada civilización en alcance × mapa.
 */
import type { CivId, CuratedText, EntityRef, GameDataset, Lang, MapId, TacticalCard } from "../../src/core/types.ts";
import { findTokens } from "../../src/core/tokens.ts";
import { expectedFileName } from "./card-schema.ts";

export interface CardFile {
  file: string;
  card: TacticalCard;
}

export type IntegrityRule = "RF-32" | "RF-33" | "RF-36";

export interface IntegrityIssue {
  file: string;
  rule: IntegrityRule;
  path: string;
  message: string;
}

export interface IntegrityContext {
  game: GameDataset;
  availability: Record<CivId, readonly EntityRef[]>;
  scope: { civs: readonly CivId[]; maps: readonly MapId[] };
}

const LANGS: readonly Lang[] = ["es", "en"];

/** Todos los textos curados de la ficha con su ruta, p. ej. "economy.buildOrder.1.text.es". */
export function curatedTexts(card: TacticalCard): [string, string][] {
  const blocks: [string, CuratedText | undefined][] = [
    ["economy.opening", card.economy.opening],
    ...card.economy.buildOrder.map((step, i): [string, CuratedText] => [`economy.buildOrder.${i}.text`, step.text]),
    ["attack.when", card.attack.when],
    ["attack.transition.note", card.attack.transition.note],
  ];
  return blocks.flatMap(([path, text]) =>
    text ? LANGS.map((lang): [string, string] => [`${path}.${lang}`, text[lang]]) : [],
  );
}

/** Referencias de lo que la ficha recomienda, con su ruta. */
export function recommendedRefs(card: TacticalCard): [string, EntityRef][] {
  const { attack } = card;
  return [
    ...attack.core.map((ref, i): [string, EntityRef] => [`attack.core.${i}`, ref]),
    ...attack.support.map((ref, i): [string, EntityRef] => [`attack.support.${i}`, ref]),
    ...attack.transition.units.map((ref, i): [string, EntityRef] => [`attack.transition.units.${i}`, ref]),
    ...attack.upgrades.map((ref, i): [string, EntityRef] => [`attack.upgrades.${i}`, ref]),
  ];
}

function checkCard({ file, card }: CardFile, ctx: IntegrityContext): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const add = (rule: IntegrityRule, path: string, message: string) => issues.push({ file, rule, path, message });
  const entityName = (ref: EntityRef) => ctx.game.entities[ref]?.name.en;

  const civExists = card.civ in ctx.game.civs;
  if (!civExists) add("RF-32", "civ", `la civilización ${card.civ} no existe en los datos del juego`);

  for (const [path, text] of curatedTexts(card)) {
    for (const token of findTokens(text)) {
      if (token.ref === null) add("RF-32", path, `referencia mal escrita ${token.raw} (formato: [[unit:38]])`);
      else if (!entityName(token.ref)) add("RF-32", path, `la entidad ${token.ref} no existe en los datos del juego`);
    }
  }

  const available = new Set(ctx.availability[card.civ] ?? []);
  for (const [path, ref] of recommendedRefs(card)) {
    const name = entityName(ref);
    if (!name) add("RF-32", path, `la entidad ${ref} no existe en los datos del juego`);
    else if (civExists && !available.has(ref)) {
      add("RF-33", path, `${card.civ} en ${card.map}: recomienda ${ref} (${name}), que no está en su árbol tecnológico`);
    }
  }
  return issues;
}

function checkCompleteness(cards: CardFile[], ctx: IntegrityContext): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const seen = new Map<string, number>();
  for (const { card } of cards) {
    const key = expectedFileName(card);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  for (const [key, count] of seen) {
    if (count > 1) issues.push({ file: key, rule: "RF-36", path: "", message: `ficha duplicada (${count} veces)` });
  }
  for (const { file, card } of cards) {
    if (!ctx.scope.civs.includes(card.civ)) {
      issues.push({ file, rule: "RF-36", path: "civ", message: `${card.civ} está fuera del alcance de esta iteración` });
    }
  }
  for (const civ of ctx.scope.civs) {
    for (const map of ctx.scope.maps) {
      const key = expectedFileName({ civ, map, role: "1v1" });
      if (!seen.has(key)) issues.push({ file: key, rule: "RF-36", path: "", message: `falta la ficha de ${civ} en ${map}` });
    }
  }
  return issues;
}

export function validateCards(cards: CardFile[], ctx: IntegrityContext): IntegrityIssue[] {
  return [...cards.flatMap((card) => checkCard(card, ctx)), ...checkCompleteness(cards, ctx)];
}

/** Texto legible agrupado por archivo, para la consola y los errores de build. */
export function formatIssues(issues: IntegrityIssue[]): string {
  const byFile = new Map<string, IntegrityIssue[]>();
  for (const issue of issues) byFile.set(issue.file, [...(byFile.get(issue.file) ?? []), issue]);
  return [...byFile]
    .map(([file, list]) =>
      [`${file}:`, ...list.map((i) => `  - [${i.rule}] ${i.path ? `${i.path}: ` : ""}${i.message}`)].join("\n"),
    )
    .join("\n");
}
