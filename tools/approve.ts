/**
 * Aprueba una ficha táctica en el parche vigente (RF-29, RF-30).
 *
 * Uso:
 *   npm run approve -- franks.arabia          (equivale a franks.arabia.1v1)
 *
 * Antes de aprobar, la ficha debe pasar el esquema y la integridad con el juego.
 * Guarda content/reviews/<civ>.<mapa>.<rol>.json. Volver a ejecutarlo tras un parche
 * actualiza la foto y hace desaparecer el aviso de "cambios después".
 * Opciones: --cards <dir> · --reviews <dir> · --data <dir>
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { CivId, EntityRef, GameDataset, PatchHistory, ReviewSnapshot } from "../src/core/types.ts";
import { CardSchemaError, parseCard } from "./lib/card-schema.ts";
import { formatIssues, validateCards } from "./lib/integrity.ts";
import { cardKey, createSnapshot } from "./lib/review.ts";

const ROOT = join(import.meta.dirname, "..");

function fail(message: string): never {
  console.error(`\n✘ No se aprobó: ${message}\n`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    cards: { type: "string", default: join(ROOT, "content", "cards") },
    reviews: { type: "string", default: join(ROOT, "content", "reviews") },
    data: { type: "string", default: join(ROOT, "data") },
  },
});

const [rawKey] = positionals;
if (!rawKey) fail("indica la ficha, p. ej. npm run approve -- franks.arabia");
const key = rawKey.split(".").length === 2 ? `${rawKey}.1v1` : rawKey;

const cardFile = join(resolve(values.cards!), `${key}.yaml`);
if (!existsSync(cardFile)) fail(`no existe ${key}.yaml en ${resolve(values.cards!)}`);

let card;
try {
  card = parseCard(readFileSync(cardFile, "utf8"), cardFile);
} catch (error) {
  if (error instanceof CardSchemaError) fail(`\n${error.message}`);
  throw error;
}

const dataDir = resolve(values.data!);
const readJson = <T>(file: string): T => JSON.parse(readFileSync(join(dataDir, file), "utf8")) as T;
const { patch } = readJson<{ patch: string }>("source.json");
const history = readJson<PatchHistory>(join("history", `${patch}.json`));

const issues = validateCards([{ file: `${key}.yaml`, card }], {
  game: readJson<GameDataset>("game.json"),
  availability: readJson<Record<CivId, EntityRef[]>>("availability.json"),
  scope: { civs: [card.civ], maps: [card.map] },
});
if (issues.length > 0) fail(`la ficha no es coherente con el juego:\n${formatIssues(issues)}`);

const reviewsDir = resolve(values.reviews!);
const snapshotFile = join(reviewsDir, `${cardKey(card)}.json`);
const previous = existsSync(snapshotFile) ? (JSON.parse(readFileSync(snapshotFile, "utf8")) as ReviewSnapshot) : null;

const snapshot = createSnapshot(card, history, new Date().toISOString().slice(0, 10));
mkdirSync(reviewsDir, { recursive: true });
writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

const entities = Object.keys(snapshot.fingerprints).length - 1;
if (previous && previous.reviewedPatch !== patch) {
  console.log(`✔ ${cardKey(card)} revisada de nuevo: parche ${previous.reviewedPatch} → ${patch} (${entities} entidades)`);
} else {
  console.log(`✔ ${cardKey(card)} aprobada en el parche ${patch} (${entities} entidades de referencia)`);
}
