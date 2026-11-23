/**
 * Muestra una ficha táctica resuelta en ES y EN (nombres oficiales en lugar de [[…]]),
 * con sus fuentes, su estado de aprobación y sus problemas de integridad, para revisarla.
 *
 * Uso:
 *   npm run preview -- franks.arabia                     (nomenclatura Latinoamérica)
 *   npm run preview -- franks.arabia --nomenclature es   (nomenclatura España)
 * Opciones: --cards <dir> · --reviews <dir> · --data <dir>
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { CivId, EntityRef, GameDataset, Nomenclature, TacticalCard } from "../src/core/types.ts";
import { computeStaleness } from "../src/core/staleness.ts";
import { CardSchemaError, parseCard } from "./lib/card-schema.ts";
import { formatIssues, validateCards } from "./lib/integrity.ts";
import { loadHistories, loadReviews } from "./lib/files.ts";
import { cardHash, cardKey } from "./lib/review.ts";
import { renderPreview, type PreviewStatus } from "./lib/preview.ts";

const ROOT = join(import.meta.dirname, "..");

function fail(message: string): never {
  console.error(`\n✘ ${message}\n`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    cards: { type: "string", default: join(ROOT, "content", "cards") },
    reviews: { type: "string", default: join(ROOT, "content", "reviews") },
    data: { type: "string", default: join(ROOT, "data") },
    nomenclature: { type: "string", default: "mx" },
  },
});

const nomenclature = values.nomenclature as Nomenclature;
if (nomenclature !== "mx" && nomenclature !== "es") fail('--nomenclature debe ser "mx" o "es"');

const [rawKey] = positionals;
if (!rawKey) fail("indica la ficha, p. ej. npm run preview -- franks.arabia");
const key = rawKey.split(".").length === 2 ? `${rawKey}.1v1` : rawKey;

const cardFile = join(resolve(values.cards!), `${key}.yaml`);
if (!existsSync(cardFile)) fail(`no existe ${key}.yaml en ${resolve(values.cards!)}`);

let card: TacticalCard;
try {
  card = parseCard(readFileSync(cardFile, "utf8"), cardFile);
} catch (error) {
  if (error instanceof CardSchemaError) fail(`La ficha tiene errores de formato y no se puede previsualizar:\n${error.message}`);
  throw error;
}

const dataDir = resolve(values.data!);
const readJson = <T>(file: string): T => JSON.parse(readFileSync(join(dataDir, file), "utf8")) as T;
const game = readJson<GameDataset>("game.json");

const issues = validateCards([{ file: `${key}.yaml`, card }], {
  game,
  availability: readJson<Record<CivId, EntityRef[]>>("availability.json"),
  scope: { civs: [card.civ], maps: [card.map] },
});

const snapshot = loadReviews(resolve(values.reviews!))[cardKey(card)];
const status: PreviewStatus = snapshot
  ? {
      kind: "approved",
      reviewedPatch: snapshot.reviewedPatch,
      modified: snapshot.cardHash !== cardHash(card),
      changes: computeStaleness(snapshot, loadHistories(join(dataDir, "history"))).changes,
    }
  : { kind: "draft" };

console.log(
  renderPreview({
    card,
    game,
    nomenclature,
    status,
    issues: issues.length > 0 ? formatIssues(issues).split("\n").slice(1).map((line) => line.trim()) : [],
  }),
);
