/**
 * Importa los datos del juego desde aoe2techtree (RF-1, RF-17, RF-26, RF-27, RF-35).
 *
 * Uso:
 *   npm run data:update                      # último commit de master
 *   npm run data:update -- --ref <commit>    # commit concreto
 *   npm run data:update -- --patch 188329    # obligatorio si el commit no indica el parche
 *
 * Genera en data/ (todo versionado en Git, revisable con un diff):
 *   source.json · game.json · availability.json · history/<parche>.json ·
 *   reports/missing-translations.json · shields/<civ>.png
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { buildDataset } from "./lib/build-dataset.ts";
import { downloadSource, latestDataCommitMessage, resolveCommit, SOURCE_REPO } from "./lib/fetch-source.ts";
import { resolvePatch } from "./lib/patch.ts";
import { TranslationReport } from "./lib/translations.ts";

const DATA_DIR = join(import.meta.dirname, "..", "data");

function write(relPath: string, content: string | Uint8Array): void {
  const file = join(DATA_DIR, relPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

const writeJson = (relPath: string, value: unknown) => write(relPath, JSON.stringify(value, null, 1) + "\n");

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { ref: { type: "string", default: "master" }, patch: { type: "string" } },
  });

  console.log(`Resolviendo ${SOURCE_REPO}@${values.ref}…`);
  const commit = await resolveCommit(SOURCE_REPO, values.ref!);
  const dataCommit = await latestDataCommitMessage(SOURCE_REPO, commit);
  const { patch, origin } = resolvePatch({
    commitMessage: dataCommit.message,
    ...(values.patch !== undefined ? { manualPatch: values.patch } : {}),
  });
  console.log(`Commit ${commit.slice(0, 7)} · último cambio de datos: "${dataCommit.message.split("\n")[0]}" · parche ${patch} (${origin})`);

  console.log("Descargando datos, textos, árboles y escudos…");
  const { source, shields } = await downloadSource(SOURCE_REPO, commit);

  const report = new TranslationReport();
  const built = buildDataset(source, patch, report);

  writeJson("source.json", {
    repo: SOURCE_REPO,
    commit,
    patch,
    patchOrigin: origin,
    dataCommit: dataCommit.sha,
    importedAt: new Date().toISOString(),
  });
  writeJson("game.json", built.game);
  writeJson("availability.json", built.availability);
  writeJson(join("history", `${patch}.json`), built.history);
  writeJson(join("reports", "missing-translations.json"), report);
  for (const [civ, png] of Object.entries(shields)) write(built.game.civs[civ]!.shield, png);

  const civCount = Object.keys(built.game.civs).length;
  const entityCount = Object.keys(built.game.entities).length;
  console.log(`\n✔ ${civCount} civilizaciones · ${entityCount} entidades con nombre · parche ${patch}`);
  if (built.unnamed.length > 0) console.log(`  ${built.unnamed.length} entidades sin nombre (no se muestran): ${built.unnamed.join(", ")}`);
  console.log(report.summary());
}

main().catch((error: unknown) => {
  console.error(`\n✘ Importación detenida: ${(error as Error).message}`);
  process.exitCode = 1;
});
