/**
 * Lista las fichas aprobadas que quedaron desactualizadas tras un parche (RF-31),
 * con qué cambió y en qué parche.
 *
 * Uso: npm run pending
 * Opciones: --reviews <dir> (content/reviews) · --data <dir> (data)
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { GameDataset } from "../src/core/types.ts";
import { loadHistories, loadReviews } from "./lib/files.ts";
import { findPending, formatPending } from "./lib/pending.ts";

const ROOT = join(import.meta.dirname, "..");

const { values } = parseArgs({
  options: {
    reviews: { type: "string", default: join(ROOT, "content", "reviews") },
    data: { type: "string", default: join(ROOT, "data") },
  },
});

const dataDir = resolve(values.data!);
const { patch } = JSON.parse(readFileSync(join(dataDir, "source.json"), "utf8")) as { patch: string };
const game = JSON.parse(readFileSync(join(dataDir, "game.json"), "utf8")) as GameDataset;

const list = findPending(loadReviews(resolve(values.reviews!)), loadHistories(join(dataDir, "history")), game);
console.log(formatPending(list, patch));
