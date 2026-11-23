/** Fichas pendientes de revisión tras un parche (RF-31). */
import type { EntityRef, GameDataset, PatchHistory, ReviewSnapshot } from "../../src/core/types.ts";
import { computeStaleness } from "../../src/core/staleness.ts";

export interface PendingChange {
  key: string;
  /** Nombre en inglés de la entidad o civilización (o aviso si ya no existe). */
  name: string;
  changedIn: string;
}

export interface PendingCard {
  key: string;
  reviewedPatch: string;
  changes: PendingChange[];
}

function nameOf(key: string, game: GameDataset): string {
  if (key.startsWith("civ:")) return game.civs[key.slice(4)]?.name.en ?? "(civilización que ya no existe)";
  return game.entities[key as EntityRef]?.name.en ?? "(entidad que ya no existe)";
}

export function findPending(
  reviews: Record<string, ReviewSnapshot>,
  histories: PatchHistory[],
  game: GameDataset,
): PendingCard[] {
  return Object.entries(reviews)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, snapshot]) => ({ key, snapshot, staleness: computeStaleness(snapshot, histories) }))
    .filter(({ staleness }) => staleness.stale)
    .map(({ key, snapshot, staleness }) => ({
      key,
      reviewedPatch: snapshot.reviewedPatch,
      changes: staleness.changes.map((change) => ({ key: change.key, name: nameOf(change.key, game), changedIn: change.changedIn })),
    }));
}

export function formatPending(list: PendingCard[], currentPatch: string): string {
  if (list.length === 0) return `Ninguna ficha pendiente de revisión (parche vigente ${currentPatch}).`;
  const title = list.length === 1 ? "1 ficha pendiente" : `${list.length} fichas pendientes`;
  const blocks = list.map((card) =>
    [
      `${card.key} (revisada en el parche ${card.reviewedPatch})`,
      ...card.changes.map((c) => `  - ${c.key} · ${c.name} · cambió en el parche ${c.changedIn}`),
    ].join("\n"),
  );
  return [
    `${title} de revisión (parche vigente ${currentPatch}):`,
    "",
    blocks.join("\n\n"),
    "",
    "Revisa cada ficha y vuelve a aprobarla con: npm run approve -- <civ>.<mapa>",
  ].join("\n");
}
