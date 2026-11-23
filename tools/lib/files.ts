/** Lectura de archivos generados que comparten varias herramientas. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PatchHistory, ReviewSnapshot } from "../../src/core/types.ts";

function readJsonDir<T>(dir: string): [string, T][] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => [name.replace(/\.json$/, ""), JSON.parse(readFileSync(join(dir, name), "utf8")) as T]);
}

/** content/reviews/*.json → fotos de aprobación por clave de ficha ("franks.arabia.1v1"). */
export function loadReviews(dir: string): Record<string, ReviewSnapshot> {
  return Object.fromEntries(readJsonDir<ReviewSnapshot>(dir));
}

/** data/history/*.json → huellas de cada parche importado. */
export function loadHistories(dir: string): PatchHistory[] {
  return readJsonDir<PatchHistory>(dir).map(([, history]) => history);
}
