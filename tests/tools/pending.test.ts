import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildDataset, type BuiltDataset } from "../../tools/lib/build-dataset";
import { TranslationReport } from "../../tools/lib/translations";
import { findPending, formatPending } from "../../tools/lib/pending";
import { loadHistories, loadReviews } from "../../tools/lib/files";
import { compileContent } from "../../tools/lib/content";
import { loadFixtureSource } from "../fixtures/load";
import type { RawSource } from "../../src/core/types";

const ROOT = join(import.meta.dirname, "..", "..");
const FILE = "franks.arabia.1v1.yaml";
const fixtureYaml = readFileSync(join(ROOT, "tests", "fixtures", "cards", FILE), "utf8");

/** Parche 190000 simulado: la Caballería de exploración (unit:448) cuesta 10 de comida más. */
function patch190000(): BuiltDataset {
  const source: RawSource = structuredClone(loadFixtureSource());
  const scout = source.data.data.Unit["448"]!;
  scout.Cost = { ...scout.Cost, Food: (scout.Cost.Food ?? 0) + 10 };
  return buildDataset(source, "190000", new TranslationReport());
}

describe("T13 vigencia tras un parche y comando pending (RF-28, RF-31)", () => {
  const dir = mkdtempSync(join(tmpdir(), "guia-age-pending-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const data = join(dir, "data");
  const cards = join(dir, "cards");
  const reviews = join(dir, "reviews");
  mkdirSync(join(data, "history"), { recursive: true });
  mkdirSync(cards);
  writeFileSync(join(cards, FILE), fixtureYaml);

  const writeDataset = (built: BuiltDataset) => {
    writeFileSync(join(data, "game.json"), JSON.stringify(built.game));
    writeFileSync(join(data, "availability.json"), JSON.stringify(built.availability));
    writeFileSync(join(data, "history", `${built.history.patch}.json`), JSON.stringify(built.history));
    writeFileSync(join(data, "source.json"), JSON.stringify({ patch: built.game.patch }));
  };
  const tool = (name: string, args: string[] = []) =>
    spawnSync(process.execPath, [join(ROOT, "tools", `${name}.ts`), ...args, "--data", data, "--reviews", reviews], {
      encoding: "utf8",
      cwd: ROOT,
    });
  const approve = () => tool("approve", ["franks.arabia", "--cards", cards]);
  const pending = () => tool("pending");
  const publishedStatus = () =>
    compileContent([{ file: FILE, text: fixtureYaml }], {
      game: JSON.parse(readFileSync(join(data, "game.json"), "utf8")),
      availability: JSON.parse(readFileSync(join(data, "availability.json"), "utf8")),
      scope: { civs: ["Franks"], maps: ["arabia"] },
    }, { allowIncomplete: false, reviews: loadReviews(reviews), histories: loadHistories(join(data, "history")) }).cards[0]!.review;

  it("parche 188329: se aprueba la ficha y no hay nada pendiente", () => {
    writeDataset(buildDataset(loadFixtureSource(), "188329", new TranslationReport()));
    expect(approve().status).toBe(0);
    const result = pending();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/Ninguna ficha pendiente de revisión \(parche vigente 188329\)/);
    expect(publishedStatus()).toEqual({ reviewedPatch: "188329", stale: false });
  });

  it("RF-28 parche 190000 con cambio de coste: la ficha publicada queda marcada como desactualizada", () => {
    writeDataset(patch190000());
    expect(publishedStatus()).toEqual({ reviewedPatch: "188329", stale: true });
  });

  it("RF-31 pending lista la ficha con la entidad que cambió, su nombre y el parche", () => {
    const result = pending();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/1 ficha pendiente de revisión \(parche vigente 190000\)/);
    expect(result.stdout).toMatch(/franks\.arabia\.1v1 \(revisada en el parche 188329\)/);
    expect(result.stdout).toMatch(/unit:448 · Scout Cavalry · cambió en el parche 190000/);
  });

  it("RF-29 tras volver a aprobar, deja de aparecer en pending y deja de estar marcada", () => {
    expect(approve().stdout).toMatch(/188329 → 190000/);
    expect(pending().stdout).toMatch(/Ninguna ficha pendiente de revisión \(parche vigente 190000\)/);
    expect(publishedStatus()).toEqual({ reviewedPatch: "190000", stale: false });
  });

  describe("findPending / formatPending", () => {
    const base = buildDataset(loadFixtureSource(), "188329", new TranslationReport());
    const next = patch190000();
    const snapshot = JSON.parse(
      JSON.stringify({
        reviewedPatch: "188329",
        approvedAt: "2026-12-01",
        cardHash: "x",
        fingerprints: { "civ:Franks": base.history.civs.Franks, "unit:448": base.history.entities["unit:448"] },
      }),
    );

    it("devuelve solo las fichas desactualizadas, con nombre de cada cambio", () => {
      const list = findPending({ "franks.arabia.1v1": snapshot }, [base.history, next.history], next.game);
      expect(list).toEqual([
        {
          key: "franks.arabia.1v1",
          reviewedPatch: "188329",
          changes: [{ key: "unit:448", name: "Scout Cavalry", changedIn: "190000" }],
        },
      ]);
      expect(findPending({ "franks.arabia.1v1": snapshot }, [base.history], base.game)).toEqual([]);
    });

    it("el nombre de un cambio en la civilización es el de la civilización", () => {
      const civChanged = { ...next.history, civs: { ...next.history.civs, Franks: "0000000000000000" } };
      const list = findPending({ "franks.arabia.1v1": snapshot }, [base.history, civChanged], next.game);
      expect(list[0]!.changes).toContainEqual({ key: "civ:Franks", name: "Franks", changedIn: "190000" });
    });

    it("el texto incluye el total y una línea por cambio", () => {
      const list = findPending({ "franks.arabia.1v1": snapshot }, [base.history, next.history], next.game);
      expect(formatPending(list, "190000").split("\n")).toEqual([
        "1 ficha pendiente de revisión (parche vigente 190000):",
        "",
        "franks.arabia.1v1 (revisada en el parche 188329)",
        "  - unit:448 · Scout Cavalry · cambió en el parche 190000",
        "",
        "Revisa cada ficha y vuelve a aprobarla con: npm run approve -- <civ>.<mapa>",
      ]);
    });
  });
});
