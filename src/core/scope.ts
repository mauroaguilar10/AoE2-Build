import type { CivId } from "./types.ts";

/**
 * Civilizaciones con ficha táctica en la iteración actual (spec 001, decisión 9 de la entrevista).
 * Cada una necesita una ficha por mapa (RF-36): 10 × 3 = 30 fichas.
 */
export const CARD_CIVS: readonly CivId[] = [
  "Franks",
  "Britons",
  "Mayans",
  "Mongols",
  "Aztecs",
  "Goths",
  "Turks",
  "Khmer",
  "Spanish",
  "Persians",
];
