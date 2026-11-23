import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { compileContent, type SourceFile } from "../../tools/lib/content";
import { buildDataset } from "../../tools/lib/build-dataset";
import { TranslationReport } from "../../tools/lib/translations";
import { loadFixtureSource } from "../fixtures/load";
import type { IntegrityContext } from "../../tools/lib/integrity";
import { MAP_IDS } from "../../src/core/types";

const ROOT = join(import.meta.dirname, "..", "..");
const fixtureYaml = readFileSync(join(ROOT, "tests", "fixtures", "cards", "franks.arabia.1v1.yaml"), "utf8");
const built = buildDataset(loadFixtureSource(), "188329", new TranslationReport());
const ctx: IntegrityContext = {
  game: built.game,
  availability: built.availability,
  scope: { civs: ["Franks"], maps: [...MAP_IDS] },
};

/** Ficha de Francos para un mapa, con cambios opcionales, como archivo YAML. */
function franks(map: string, mutate: (card: any) => void = () => {}): SourceFile {
  const card = parse(fixtureYaml);
  card.map = map;
  mutate(card);
  return { file: `franks.${map}.1v1.yaml`, text: stringify(card) };
}
const allFranks = (): SourceFile[] => MAP_IDS.map((map) => franks(map));

describe("T11 build-content: validar y compilar las fichas", () => {
  describe("RF-37 salida publicada", () => {
    const result = compileContent(allFranks(), ctx, { allowIncomplete: false });

    it("compila las 3 fichas válidas sin errores", () => {
      expect(result.errors).toEqual([]);
      expect(result.cards.map((c) => `${c.civ}.${c.map}`)).toEqual(["Franks.arabia", "Franks.arena", "Franks.black_forest"]);
    });

    it("RF-37 ninguna ficha publicada contiene sus fuentes", () => {
      for (const card of result.cards) expect(card).not.toHaveProperty("sources");
      const json = JSON.stringify(result.cards);
      expect(json).not.toContain("sources");
      expect(json).not.toContain("example.com/franks-arabia");
    });

    it("conserva el resto del contenido intacto", () => {
      expect(result.cards[0]!.attack.upgrades).toEqual(["tech:39", "tech:67", "tech:81"]);
      expect(result.cards[0]!.economy.buildOrder).toHaveLength(2);
    });
  });

  describe("RF-34 / RF-32 / RF-33 errores que bloquean siempre", () => {
    it("una ficha sin texto en inglés bloquea, indicando archivo y campo, y no se publica nada", () => {
      const files = [...allFranks().slice(1), franks("arabia", (c) => delete c.attack.when.en)];
      const result = compileContent(files, ctx, { allowIncomplete: true });
      expect(result.cards).toEqual([]);
      expect(result.errors.join("\n")).toMatch(/franks\.arabia\.1v1\.yaml[\s\S]*attack\.when\.en/);
    });

    it("una recomendación fuera del árbol bloquea incluso en modo borrador", () => {
      const files = [...allFranks().slice(1), franks("arabia", (c) => (c.attack.upgrades = ["tech:435", "tech:67"]))];
      const result = compileContent(files, ctx, { allowIncomplete: true });
      expect(result.cards).toEqual([]);
      expect(result.errors.join("\n")).toMatch(/\[RF-33\] attack\.upgrades\.0/);
    });

    it("informa de los errores de TODOS los archivos, no solo del primero", () => {
      const files = [
        franks("arabia", (c) => delete c.attack.when.en),
        franks("arena", (c) => (c.sources = [])),
        franks("black_forest"),
      ];
      const errors = compileContent(files, ctx, { allowIncomplete: false }).errors.join("\n");
      expect(errors).toContain("franks.arabia.1v1.yaml");
      expect(errors).toContain("franks.arena.1v1.yaml");
    });
  });

  describe("RF-36 fichas que faltan: error en producción, aviso en borrador", () => {
    const partial = [franks("arabia")];

    it("modo producción (estricto): bloquea", () => {
      const result = compileContent(partial, ctx, { allowIncomplete: false });
      expect(result.cards).toEqual([]);
      expect(result.errors.join("\n")).toMatch(/falta la ficha de Franks en arena/);
    });

    it("modo borrador: publica lo que hay y avisa de lo que falta", () => {
      const result = compileContent(partial, ctx, { allowIncomplete: true });
      expect(result.errors).toEqual([]);
      expect(result.cards).toHaveLength(1);
      expect(result.warnings.join("\n")).toMatch(/falta la ficha de Franks en arena/);
    });

    it("una ficha duplicada bloquea siempre (no es contenido que falte)", () => {
      const result = compileContent([...allFranks(), franks("arabia")], ctx, { allowIncomplete: true });
      expect(result.errors.join("\n")).toMatch(/duplicada/);
    });
  });

  describe("comando build-content (lo que ejecuta npm run build)", () => {
    const dir = mkdtempSync(join(tmpdir(), "guia-age-cards-"));
    afterAll(() => rmSync(dir, { recursive: true, force: true }));
    const run = (args: string[]) =>
      spawnSync(process.execPath, [join(ROOT, "tools", "build-content.ts"), ...args], { encoding: "utf8", cwd: ROOT });

    it("con una ficha inválida termina con código 1 y un mensaje claro", () => {
      const cardsDir = mkdtempSync(join(dir, "invalid-"));
      const bad = franks("arabia", (c) => delete c.attack.when.en);
      writeFileSync(join(cardsDir, bad.file), bad.text);
      const out = join(dir, "invalid-out.json");
      const result = run(["--cards", cardsDir, "--out", out, "--allow-incomplete"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/franks\.arabia\.1v1\.yaml[\s\S]*attack\.when\.en: falta el texto/);
      expect(existsSync(out)).toBe(false);
    });

    it("en modo borrador con fichas válidas escribe cards.json sin fuentes", () => {
      const cardsDir = mkdtempSync(join(dir, "valid-"));
      const good = franks("arabia");
      writeFileSync(join(cardsDir, good.file), good.text);
      writeFileSync(join(cardsDir, "README.md"), "no es una ficha");
      const out = join(dir, "valid-out.json");
      const result = run(["--cards", cardsDir, "--out", out, "--allow-incomplete"]);
      expect(result.status, result.stderr).toBe(0);
      const written = readFileSync(out, "utf8");
      expect(JSON.parse(written)).toHaveLength(1);
      expect(written).not.toContain("sources");
    });
  });
});
