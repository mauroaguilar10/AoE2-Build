/**
 * Valida y compila las fichas tácticas antes del build de la app.
 *
 * Uso:
 *   node tools/build-content.ts                      # producción: exige las 30 fichas (RF-36)
 *   node tools/build-content.ts --allow-incomplete   # borrador: las fichas que faltan son avisos
 * Opciones: --cards <dir> (content/cards) · --reviews <dir> (content/reviews) · --data <dir> (data) ·
 *           --out <archivo> (src/generated/cards.json)
 * En producción, además, toda ficha debe estar aprobada y sin cambios desde su aprobación (T12).
 *
 * Si hay errores, termina con código 1 y NO escribe la salida.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { CivId, EntityRef, GameDataset } from "../src/core/types.ts";
import { MAP_IDS } from "../src/core/types.ts";
import { CARD_CIVS } from "../src/core/scope.ts";
import { compileContent, type SourceFile } from "./lib/content.ts";
import { loadReviews } from "./lib/files.ts";

const ROOT = join(import.meta.dirname, "..");

const { values } = parseArgs({
  options: {
    cards: { type: "string", default: join(ROOT, "content", "cards") },
    reviews: { type: "string", default: join(ROOT, "content", "reviews") },
    data: { type: "string", default: join(ROOT, "data") },
    out: { type: "string", default: join(ROOT, "src", "generated", "cards.json") },
    "allow-incomplete": { type: "boolean", default: false },
  },
});

const cardsDir = resolve(values.cards!);
const dataDir = resolve(values.data!);
const outFile = resolve(values.out!);
const allowIncomplete = values["allow-incomplete"]!;

const readJson = <T>(file: string): T => JSON.parse(readFileSync(join(dataDir, file), "utf8")) as T;

const files: SourceFile[] = existsSync(cardsDir)
  ? readdirSync(cardsDir)
      .filter((name) => name.endsWith(".yaml"))
      .sort()
      .map((name) => ({ file: name, text: readFileSync(join(cardsDir, name), "utf8") }))
  : [];

const result = compileContent(
  files,
  {
    game: readJson<GameDataset>("game.json"),
    availability: readJson<Record<CivId, EntityRef[]>>("availability.json"),
    scope: { civs: CARD_CIVS, maps: MAP_IDS },
  },
  {
    allowIncomplete,
    reviews: loadReviews(resolve(values.reviews!)), // T12: aprobación
  },
);

const mode = allowIncomplete ? "borrador" : "producción";

if (result.errors.length > 0) {
  console.error(`\n✘ Contenido táctico inválido (modo ${mode}). No se genera la app.\n`);
  console.error(result.errors.join("\n\n"));
  console.error("");
  process.exitCode = 1;
} else {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(result.cards) + "\n", "utf8");
  console.log(`✔ ${result.cards.length} fichas tácticas compiladas (modo ${mode}).`);
  if (result.warnings.length > 0) {
    console.warn(`\n⚠ Avisos (no bloquean en modo borrador):\n${result.warnings.join("\n")}\n`);
  }
}
