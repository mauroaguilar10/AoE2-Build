import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { renderPreview } from "../../tools/lib/preview";
import { parseCard } from "../../tools/lib/card-schema";
import { replaceTokens } from "../../src/core/tokens";
import { MAP_NAMES } from "../../src/core/maps";
import type { GameDataset } from "../../src/core/types";

const ROOT = join(import.meta.dirname, "..", "..");
const FILE = "franks.arabia.1v1.yaml";
const fixtureYaml = readFileSync(join(ROOT, "tests", "fixtures", "cards", FILE), "utf8");
const card = parseCard(fixtureYaml, FILE);
const game = JSON.parse(readFileSync(join(ROOT, "data", "game.json"), "utf8")) as GameDataset;

describe("T14 vista previa de una ficha para revisarla", () => {
  describe("referencias resueltas a nombres oficiales", () => {
    const text = renderPreview({ card, game, nomenclature: "mx", status: { kind: "draft" }, issues: [] });

    it("no quedan referencias [[…]] sin resolver", () => {
      expect(text).not.toMatch(/\[\[/);
    });

    it("sección en español con nombres de Latinoamérica", () => {
      expect(text).toContain("Francos · Arabia · 1v1");
      expect(text).toContain("4 a madera; atrae el jabalí con la Caballería de exploración");
      expect(text).toMatch(/Apoyo: Hostigador/);
    });

    it("sección en inglés con nombres en inglés", () => {
      expect(text).toContain("Franks · Arabia · 1v1");
      expect(text).toContain("4 on wood; lure the boar with the Scout Cavalry");
      expect(text).toMatch(/Support: Skirmisher/);
    });

    it("mejoras numeradas en orden de prioridad, en ambos idiomas", () => {
      expect(text).toContain("1. Ganadería  2. Forja  3. Armadura de Barda de escamas");
      expect(text).toContain("1. Husbandry  2. Forging  3. Scale Barding Armor");
    });

    it("con nomenclatura de España cambian solo los nombres oficiales", () => {
      const es = renderPreview({ card, game, nomenclature: "es", status: { kind: "draft" }, issues: [] });
      expect(es).toMatch(/Apoyo: Guerrillero/); // solo en una lista: primera letra en mayúscula
      expect(es).toContain("3. Barda de escamas");
      expect(es).toContain("4 a madera; atrae el jabalí con la caballería de exploración");
    });
  });

  describe("contenido de economía y ataque", () => {
    const text = renderPreview({ card, game, nomenclature: "mx", status: { kind: "draft" }, issues: [] });

    it("población para subir de edad y reparto de aldeanos con su total", () => {
      expect(text).toContain("Subir a Feudal con 21 · a Castillos con 29");
      expect(text).toContain("Feudal: 13 comida · 8 madera · 0 oro · 0 piedra (total 21)");
      expect(text).toContain("Castillos: 14 comida · 9 madera · 6 oro · 0 piedra (total 29)");
    });

    it("build order paso a paso con su población", () => {
      expect(text).toMatch(/ 6 +6 aldeanos a las ovejas/);
      expect(text).toMatch(/10 +4 a madera/);
    });

    it("transición con su nota", () => {
      expect(text).toContain("Transición: Caballero — Pasa a caballeros al llegar a Castillos");
    });
  });

  describe("información solo para el revisor", () => {
    it("muestra las fuentes (que el jugador nunca ve, RF-37)", () => {
      const text = renderPreview({ card, game, nomenclature: "mx", status: { kind: "draft" }, issues: [] });
      expect(text).toContain("Fuente de ejemplo para tests — https://example.com/franks-arabia");
    });

    it("estado: borrador sin aprobar", () => {
      const text = renderPreview({ card, game, nomenclature: "mx", status: { kind: "draft" }, issues: [] });
      expect(text).toMatch(/Estado: BORRADOR \(sin aprobar\)/);
    });

    it("estado: aprobada y vigente", () => {
      const text = renderPreview({
        card,
        game,
        nomenclature: "mx",
        status: { kind: "approved", reviewedPatch: "188329", modified: false, changes: [] },
        issues: [],
      });
      expect(text).toMatch(/Estado: aprobada en el parche 188329/);
    });

    it("estado: aprobada pero desactualizada, con lo que cambió", () => {
      const text = renderPreview({
        card,
        game,
        nomenclature: "mx",
        status: {
          kind: "approved",
          reviewedPatch: "188329",
          modified: false,
          changes: [{ key: "unit:448", changedIn: "190000" }],
        },
        issues: [],
      });
      expect(text).toMatch(/Revisada en el parche 188329; ha habido cambios después/);
      expect(text).toContain("unit:448 · Scout Cavalry · cambió en el parche 190000");
    });

    it("estado: editada después de aprobarla", () => {
      const text = renderPreview({
        card,
        game,
        nomenclature: "mx",
        status: { kind: "approved", reviewedPatch: "188329", modified: true, changes: [] },
        issues: [],
      });
      expect(text).toMatch(/modificada después de aprobarla/);
    });

    it("muestra los problemas de integridad para corregirlos antes de aprobar", () => {
      const text = renderPreview({
        card,
        game,
        nomenclature: "mx",
        status: { kind: "draft" },
        issues: ["[RF-33] attack.upgrades.0: Franks en arabia: recomienda tech:435 (Bloodlines)…"],
      });
      expect(text).toMatch(/PROBLEMAS[\s\S]*\[RF-33\] attack\.upgrades\.0/);
    });
  });

  describe("piezas compartidas con la app", () => {
    it("replaceTokens sustituye cada referencia y deja intacto lo demás", () => {
      expect(replaceTokens("Con [[unit:448]] y [[tech:67]].", (ref) => ref.toUpperCase())).toBe("Con UNIT:448 y TECH:67.");
      expect(replaceTokens("Sin referencias", () => "x")).toBe("Sin referencias");
    });

    it("MAP_NAMES tiene el nombre de los 3 mapas en ambos idiomas", () => {
      expect(MAP_NAMES.black_forest).toEqual({ es: "Selva Negra", en: "Black Forest" });
      expect(MAP_NAMES.arabia.es).toBe("Arabia");
    });
  });

  describe("comando preview", () => {
    const dir = mkdtempSync(join(tmpdir(), "guia-age-preview-"));
    afterAll(() => rmSync(dir, { recursive: true, force: true }));
    const cards = join(dir, "cards");
    mkdirSync(cards);
    writeFileSync(join(cards, FILE), fixtureYaml);
    const run = (args: string[]) =>
      spawnSync(process.execPath, [join(ROOT, "tools", "preview.ts"), ...args, "--cards", cards, "--reviews", join(dir, "reviews")], {
        encoding: "utf8",
        cwd: ROOT,
      });

    it("muestra la ficha con nombres reales y estado de borrador", () => {
      const result = run(["franks.arabia"]);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("Caballería de exploración");
      expect(result.stdout).toContain("Scout Cavalry");
      expect(result.stdout).toMatch(/BORRADOR/);
    });

    it("--nomenclature es usa los nombres de España", () => {
      expect(run(["franks.arabia", "--nomenclature", "es"]).stdout).toMatch(/Apoyo: Guerrillero/);
    });

    it("muestra los problemas de integridad de la ficha", () => {
      const bad = parse(fixtureYaml);
      bad.map = "arena";
      bad.attack.upgrades = ["tech:435", "tech:67"];
      writeFileSync(join(cards, "franks.arena.1v1.yaml"), stringify(bad));
      const result = run(["franks.arena"]);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/PROBLEMAS[\s\S]*RF-33/);
    });

    it("una ficha con errores de formato no se puede previsualizar y se explica por qué", () => {
      const broken = parse(fixtureYaml);
      broken.map = "black_forest";
      delete broken.attack.when.en;
      writeFileSync(join(cards, "franks.black_forest.1v1.yaml"), stringify(broken));
      const result = run(["franks.black_forest"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/attack\.when\.en/);
    });

    it("indica claramente si la ficha no existe", () => {
      const result = run(["britons.arabia"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/britons\.arabia\.1v1\.yaml/);
    });
  });
});
