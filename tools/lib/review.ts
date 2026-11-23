/**
 * Aprobación de fichas (RF-29, RF-30): al aprobar se guarda una "foto" con
 *  - el parche vigente (parche de revisión),
 *  - la huella mecánica de la civilización y de cada entidad que la ficha menciona en ese parche,
 *  - la huella del contenido de la ficha (si se edita después, hay que volver a aprobarla).
 * Esa foto es la referencia para detectar cambios en parches posteriores (RF-28, T13).
 */
import { createHash } from "node:crypto";
import type { CardKey, EntityRef, PatchHistory, ReviewSnapshot, TacticalCard } from "../../src/core/types.ts";
import { findTokens } from "../../src/core/tokens.ts";
import { curatedTexts, recommendedRefs } from "./integrity.ts";

export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

/** Clave de una ficha, p. ej. "franks.arabia.1v1" (también es el nombre de su foto). */
export function cardKey(card: Pick<TacticalCard, "civ" | "map" | "role">): CardKey {
  return `${card.civ.toLowerCase()}.${card.map}.${card.role}`;
}

/** Todas las entidades que la ficha menciona: recomendadas y citadas en el texto. */
export function referencedEntities(card: TacticalCard): EntityRef[] {
  const refs = new Set<EntityRef>(recommendedRefs(card).map(([, ref]) => ref));
  for (const [, text] of curatedTexts(card)) {
    for (const token of findTokens(text)) if (token.ref) refs.add(token.ref);
  }
  return [...refs].sort();
}

/** Huella del contenido completo de la ficha (el orden de listas importa: p. ej. prioridad de mejoras). */
export function cardHash(card: TacticalCard): string {
  return createHash("sha256").update(JSON.stringify(card)).digest("hex").slice(0, 16);
}

export function createSnapshot(card: TacticalCard, history: PatchHistory, approvedAt: string): ReviewSnapshot {
  const civFingerprint = history.civs[card.civ];
  if (!civFingerprint) throw new ReviewError(`${card.civ} no tiene huella en el parche ${history.patch}`);

  const fingerprints: Record<string, string> = { [`civ:${card.civ}`]: civFingerprint };
  for (const ref of referencedEntities(card)) {
    const fingerprint = history.entities[ref];
    if (!fingerprint) throw new ReviewError(`${ref} no tiene huella en el parche ${history.patch}`);
    fingerprints[ref] = fingerprint;
  }

  return { reviewedPatch: history.patch, approvedAt, fingerprints, cardHash: cardHash(card) };
}
