/**
 * Vigencia de una ficha aprobada frente a los parches posteriores (RF-28, RF-31).
 *
 * Una ficha está desactualizada si, en el parche VIGENTE, la huella de la civilización o de
 * alguna entidad que menciona es distinta de la que tenía al aprobarla. Si algo cambió y
 * luego volvió a su valor, la ficha sigue siendo correcta.
 */
import type { PatchHistory, ReviewSnapshot } from "./types.ts";

export interface StaleChange {
  /** "civ:Franks" o una referencia de entidad, p. ej. "unit:448". */
  key: string;
  /** Primer parche desde el que el cambio se mantiene hasta el vigente. */
  changedIn: string;
}

export interface Staleness {
  reviewedPatch: string;
  stale: boolean;
  changes: StaleChange[];
}

/** Orden numérico de parches (son números de build): "99999" < "100000". */
export function comparePatches(a: string, b: string): number {
  return Number(a) - Number(b);
}

function fingerprintIn(history: PatchHistory, key: string): string | undefined {
  if (key.startsWith("civ:")) return history.civs[key.slice(4)];
  return (history.entities as Record<string, string>)[key];
}

/**
 * @param histories huellas de los parches disponibles (en cualquier orden); el más alto es el vigente.
 */
export function computeStaleness(snapshot: ReviewSnapshot, histories: PatchHistory[]): Staleness {
  const later = histories
    .filter((h) => comparePatches(h.patch, snapshot.reviewedPatch) > 0)
    .sort((a, b) => comparePatches(a.patch, b.patch));

  const changes: StaleChange[] = [];
  for (const [key, approved] of Object.entries(snapshot.fingerprints)) {
    // Recorre desde el parche vigente hacia atrás mientras la huella siga siendo distinta.
    let changedIn: string | null = null;
    for (let i = later.length - 1; i >= 0; i--) {
      const history = later[i]!;
      if (fingerprintIn(history, key) === approved) break;
      changedIn = history.patch;
    }
    if (changedIn !== null) changes.push({ key, changedIn });
  }

  changes.sort((a, b) => a.key.localeCompare(b.key));
  return { reviewedPatch: snapshot.reviewedPatch, stale: changes.length > 0, changes };
}
