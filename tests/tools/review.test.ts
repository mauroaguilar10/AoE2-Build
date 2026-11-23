import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { cardHash, createSnapshot, referencedEntities, ReviewError } from "../../tools/lib/review";
import { compileContent, type SourceFile } from "../../tools/lib/content";
import { parseCard } from "../../tools/lib/card-schema";
import { buildDataset } from "../../tools/lib/build-dataset";
import { TranslationReport } from "../../tools/lib/translations";
import { loadFixtureSource } from "../fixtures/load";
import type { PatchHistory, ReviewSnapshot } from "../../src/core/types";
import { MAP_IDS } from "../../src/core/types";

const ROOT = join(import.meta.dirname, "..", "..");
const FILE = "franks.arabia.1v1.yaml";
const fixtureYaml = readFileSync(join(ROOT, "tests", "fixtures", "cards", FILE), "utf8");
const card = parseCard(fixtureYaml, FILE);
const built = buildDataset(loadFixtureSource(), "188329", new TranslationReport());
const history188329 = built.history;

/** El mismo juego en un parche posterior donde cambió la caballería de exploración. */
const history190000: PatchHistory = {
  ...structuredClone(history188329),
  patch: "190000",
  entities: { ...history188329.entities, "unit:448": "ffffffffffffffff" },
};

describe("T12 aprobación de fichas (RF-29, RF-30)", () => {
  describe("entidades mencionadas por la ficha", () => {
    it("incluye las recomendadas y las citadas en el texto, sin repetir y ordenadas", () => {
      expect(referencedEntities(card)).toEqual(["tech:39", "tech:67", "tech:81", "unit:38", "unit:448", "unit:7"]);
    });
  });

  describe("RF-30 foto de revisión", () => {
    const snapshot = createSnapshot(card, history188329, "2026-12-01");

    it("registra el parche vigente como parche de revisión y la fecha", () => {
      expect(snapshot.reviewedPatch).toBe("188329");
      expect(snapshot.approvedAt).toBe("2026-12-01");
    });

    it("conserva la huella de la civilización y de cada entidad mencionada en ese parche", () => {
      expect(Object.keys(snapshot.fingerprints).sort()).toEqual(
        ["civ:Franks", "tech:39", "tech:67", "tech:81", "unit:38", "unit:448", "unit:7"].sort(),
      );
      expect(snapshot.fingerprints["civ:Franks"]).toBe(history188329.civs.Franks);
      expect(snapshot.fingerprints["unit:448"]).toBe(history188329.entities["unit:448"]);
    });

    it("guarda la huella del contenido de la ficha", () => {
      expect(snapshot.cardHash).toBe(cardHash(card));
    });

    it("falla si una entidad mencionada no tiene huella en el parche", () => {
      const broken = structuredClone(card);
      broken.attack.support = ["unit:999999"];
      expect(() => createSnapshot(broken, history188329, "2026-12-01")).toThrow(ReviewError);
    });
  });

  describe("RF-29 volver a aprobar tras un parche", () => {
    it("actualiza el parche de revisión y las huellas al parche nuevo", () => {
      const again = createSnapshot(card, history190000, "2027-01-15");
      expect(again.reviewedPatch).toBe("190000");
      expect(again.fingerprints["unit:448"]).toBe("ffffffffffffffff");
    });
  });

  describe("huella del contenido", () => {
    it("es estable si la ficha no cambia y cambia si se edita cualquier texto", () => {
      expect(cardHash(structuredClone(card))).toBe(cardHash(card));
      const edited = structuredClone(card);
      edited.attack.when.es = "Otro momento";
      expect(cardHash(edited)).not.toBe(cardHash(card));
    });

    it("cambia si se reordenan las mejoras (el orden es parte del contenido, RF-14)", () => {
      const reordered = structuredClone(card);
      reordered.attack.upgrades = [...card.attack.upgrades].reverse();
      expect(cardHash(reordered)).not.toBe(cardHash(card));
    });
  });

  describe("el build exige fichas aprobadas y sin cambios desde la aprobación", () => {
    const ctx = { game: built.game, availability: built.availability, scope: { civs: ["Franks"], maps: [...MAP_IDS] } };
    const files: SourceFile[] = MAP_IDS.map((map) => {
      const c = parse(fixtureYaml);
      c.map = map;
      return { file: `franks.${map}.1v1.yaml`, text: stringify(c) };
    });
    const approve = (f: SourceFile): [string, ReviewSnapshot] => [
      f.file.replace(/\.yaml$/, ""),
      createSnapshot(parseCard(f.text, f.file), history188329, "2026-12-01"),
    ];
    const allApproved = Object.fromEntries(files.map(approve));

    it("con todas aprobadas, publica", () => {
      expect(compileContent(files, ctx, { allowIncomplete: false, reviews: allApproved }).errors).toEqual([]);
    });

    it("una ficha sin aprobar bloquea en producción y es aviso en borrador", () => {
      const { [files[0]!.file.replace(/\.yaml$/, "")]: _omitted, ...partial } = allApproved;
      const prod = compileContent(files, ctx, { allowIncomplete: false, reviews: partial });
      expect(prod.errors.join("\n")).toMatch(/franks\.arabia\.1v1\.yaml[\s\S]*sin aprobar/);
      const draft = compileContent(files, ctx, { allowIncomplete: true, reviews: partial });
      expect(draft.errors).toEqual([]);
      expect(draft.warnings.join("\n")).toMatch(/sin aprobar/);
    });

    it("una ficha editada después de aprobarla bloquea en producción", () => {
      const edited = files.map((f, i) => (i === 0 ? { ...f, text: f.text.replace("Feudal scouts", "Feudal archers") } : f));
      const prod = compileContent(edited, ctx, { allowIncomplete: false, reviews: allApproved });
      expect(prod.errors.join("\n")).toMatch(/modificada después de aprobarla/);
    });
  });

  describe("comando approve", () => {
    const dir = mkdtempSync(join(tmpdir(), "guia-age-approve-"));
    afterAll(() => rmSync(dir, { recursive: true, force: true }));
    const cardsDir = join(dir, "cards");
    const reviewsDir = join(dir, "reviews");
    mkdirSync(cardsDir);
    writeFileSync(join(cardsDir, FILE), fixtureYaml);

    const run = (args: string[]) =>
      spawnSync(process.execPath, [join(ROOT, "tools", "approve.ts"), ...args, "--cards", cardsDir, "--reviews", reviewsDir], {
        encoding: "utf8",
        cwd: ROOT,
      });
    const snapshotFile = join(reviewsDir, "franks.arabia.1v1.json");

    it("RF-30 aprueba con la clave corta y guarda la foto con el parche vigente", () => {
      const result = run(["franks.arabia"]);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toMatch(/franks\.arabia\.1v1.*parche 188329/);
      const snapshot = JSON.parse(readFileSync(snapshotFile, "utf8")) as ReviewSnapshot;
      expect(snapshot.reviewedPatch).toBe("188329");
      expect(snapshot.fingerprints["civ:Franks"]).toMatch(/^[0-9a-f]{16}$/);
    });

    it("RF-29 tras un parche nuevo, volver a aprobar actualiza la foto e indica el cambio de parche", () => {
      const dataDir = join(dir, "data-190000");
      cpSync(join(ROOT, "data"), dataDir, { recursive: true });
      const source = JSON.parse(readFileSync(join(dataDir, "source.json"), "utf8"));
      writeFileSync(join(dataDir, "source.json"), JSON.stringify({ ...source, patch: "190000" }));
      const history = JSON.parse(readFileSync(join(dataDir, "history", "188329.json"), "utf8"));
      writeFileSync(join(dataDir, "history", "190000.json"), JSON.stringify({ ...history, patch: "190000" }));

      const result = run(["franks.arabia.1v1", "--data", dataDir]);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toMatch(/188329 → 190000/);
      expect((JSON.parse(readFileSync(snapshotFile, "utf8")) as ReviewSnapshot).reviewedPatch).toBe("190000");
    });

    it("no aprueba una ficha incoherente con el juego (RF-33) y no escribe la foto", () => {
      const bad = parse(fixtureYaml);
      bad.map = "arena";
      bad.attack.upgrades = ["tech:435", "tech:67"];
      writeFileSync(join(cardsDir, "franks.arena.1v1.yaml"), stringify(bad));
      const result = run(["franks.arena"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/RF-33/);
      expect(existsSync(join(reviewsDir, "franks.arena.1v1.json"))).toBe(false);
    });

    it("indica claramente si la ficha no existe", () => {
      const result = run(["britons.arabia"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/britons\.arabia\.1v1\.yaml/);
    });
  });
});
