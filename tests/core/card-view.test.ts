import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCardView, findCard } from "../../src/core/card-view";
import { segmentsToString } from "../../src/core/tokens";
import { parseCard } from "../../tools/lib/card-schema";
import { toPublished } from "../../tools/lib/content";
import type { GameDataset } from "../../src/core/types";

const ROOT = join(import.meta.dirname, "..", "..");
const game = JSON.parse(readFileSync(join(ROOT, "data", "game.json"), "utf8")) as GameDataset;
const FILE = "franks.arabia.1v1.yaml";
const card = parseCard(readFileSync(join(ROOT, "tests", "fixtures", "cards", FILE), "utf8"), FILE);
const approved = toPublished(card, true);
const draft = toPublished(card, false);

describe("T20 construcción de la vista de tarjeta", () => {
  describe("RF-15 cada tarjeta muestra la ficha de esa civilización en ese mapa", () => {
    it("RF-15 encuentra la ficha por civilización y mapa", () => {
      expect(findCard([approved], "Franks", "arabia")).toBe(approved);
    });

    it("RF-15 no usa la ficha de otro mapa ni de otra civilización", () => {
      expect(findCard([approved], "Franks", "arena")).toBeNull();
      expect(findCard([approved], "Britons", "arabia")).toBeNull();
    });

    it("una civilización que no existe en el juego no tiene vista", () => {
      expect(buildCardView({ civ: "Atlanteans", map: "arabia", game, cards: [approved], lang: "es", nomenclature: "mx" })).toBeNull();
    });
  });

  describe("caso 1: civilización con ficha (economía y ataque completos)", () => {
    const view = buildCardView({ civ: "Franks", map: "arabia", game, cards: [approved], lang: "es", nomenclature: "mx" });
    const tactical = view?.tactical;

    it("tiene contenido táctico y, aprobada, no es un borrador", () => {
      expect(tactical).not.toBeNull();
      expect(tactical?.draft).toBe(false);
    });

    it("RF-12 plan de economía: apertura, población para subir de edad y reparto de aldeanos", () => {
      expect(segmentsToString(tactical!.economy.opening)).toBe("Scouts (caballería de exploración) en Feudal");
      expect(tactical!.economy.ageUpPop).toEqual({ feudal: 21, castle: 29 });
      expect(tactical!.economy.villagers.feudal).toEqual({ food: 13, wood: 8, gold: 0, stone: 0 });
      expect(tactical!.economy.villagers.castle).toEqual({ food: 14, wood: 9, gold: 6, stone: 0 });
    });

    it("RF-13 build order paso a paso con su población y los nombres oficiales resueltos", () => {
      const steps = tactical!.economy.buildOrder.map((step) => `${step.pop} ${segmentsToString(step.text)}`);
      expect(steps[0]).toBe("6 6 aldeanos a las ovejas");
      expect(steps.join("\n")).toContain("atrae el jabalí con la Caballería de exploración");
      expect(steps.join("\n")).not.toMatch(/\[\[/);
    });

    it("RF-14 plan de ataque: cuándo, núcleo, apoyo, transición con nota y mejoras en orden", () => {
      const names = (list: { name: string }[]) => list.map((e) => e.name);
      expect(segmentsToString(tactical!.attack.when)).not.toBe("");
      expect(names(tactical!.attack.core)).toEqual(["Caballería de exploración"]);
      expect(names(tactical!.attack.support)).toEqual(["Hostigador"]);
      expect(names(tactical!.attack.transition.units)).toEqual(["Caballero"]);
      expect(segmentsToString(tactical!.attack.transition.note!)).toBe("Pasa a caballeros al llegar a Castillos");
      expect(names(tactical!.attack.upgrades)).toEqual(["Ganadería", "Forja", "Armadura de Barda de escamas"]);
      expect(tactical!.attack.core[0]?.ref).toBe("unit:448");
    });

    it("RF-24 en una lista los nombres van con mayúscula aunque el original no la tenga (España)", () => {
      const es = buildCardView({ civ: "Franks", map: "arabia", game, cards: [approved], lang: "es", nomenclature: "es" });
      expect(es?.tactical?.attack.support.map((e) => e.name)).toEqual(["Guerrillero"]);
      expect(segmentsToString(es!.tactical!.economy.buildOrder[1]!.text)).toContain("caballería de exploración");
    });

    it("RF-21 el mismo contenido en inglés", () => {
      const en = buildCardView({ civ: "Franks", map: "arabia", game, cards: [approved], lang: "en", nomenclature: "mx" });
      expect(en?.tactical?.attack.support.map((e) => e.name)).toEqual(["Skirmisher"]);
      expect(en?.name).toBe("Franks");
    });

    it("RF-17 también lleva los datos automáticos de la civilización", () => {
      expect(view?.name).toBe("Francos");
      expect(view?.specialty).toBe("Civilización de caballería");
    });

    it("una ficha sin aprobar (solo en borrador) se marca como borrador", () => {
      const v = buildCardView({ civ: "Franks", map: "arabia", game, cards: [draft], lang: "es", nomenclature: "mx" });
      expect(v?.tactical?.draft).toBe(true);
    });
  });

  describe("caso 2: civilización sin ficha (solo datos y mensaje)", () => {
    const view = buildCardView({ civ: "Armenians", map: "arabia", game, cards: [approved], lang: "es", nomenclature: "mx" });

    it("RF-16 no hay contenido táctico (la interfaz muestra el mensaje de ficha no disponible)", () => {
      expect(view?.tactical).toBeNull();
    });

    it("RF-16 una civilización con ficha en otro mapa tampoco muestra contenido táctico en este", () => {
      expect(buildCardView({ civ: "Franks", map: "arena", game, cards: [approved], lang: "es", nomenclature: "mx" })?.tactical).toBeNull();
    });

    it("RF-17 nombre, escudo, especialidad, bonificaciones y bonificación de equipo", () => {
      const civ = game.civs.Armenians!;
      expect(view?.name).toBe(civ.name.mx);
      expect(view?.shield).toBe(civ.shield);
      expect(view?.specialty).toBe(civ.specialty.mx);
      expect(view?.bonuses).toHaveLength(civ.bonuses.mx.length);
      expect(view?.teamBonus).not.toBe("");
    });

    it("RF-17 unidades únicas con su coste", () => {
      expect(view?.uniqueUnits.length).toBeGreaterThan(0);
      for (const unit of view!.uniqueUnits) expect(unit.name).not.toBe("");
      expect(view?.uniqueUnits[0]?.cost).not.toBeNull();
    });

    it("RF-17 tecnologías únicas de Castillos e Imperial con nombre, coste y efecto, en ese orden", () => {
      expect(view?.uniqueTechs.map((t) => t.age)).toEqual(["castle", "imperial"]);
      for (const tech of view!.uniqueTechs) {
        expect(tech.name).toBe(game.entities[tech.ref]!.name.mx.replace(/^./, (c) => c.toUpperCase()));
        expect(tech.effect).not.toBe("");
      }
    });

    it("RF-17 edificios propios con nombre, coste y descripción (Armenios: carro de mulas e iglesia fortificada)", () => {
      expect(view?.ownBuildings.map((b) => b.ref).sort()).toEqual(["building:1806", "building:1808"]);
      for (const building of view!.ownBuildings) expect(building.description).not.toBe("");
    });

    it("RF-17 sin edificios propios la lista está vacía (la sección no se muestra)", () => {
      expect(buildCardView({ civ: "Franks", map: "arabia", game, cards: [], lang: "es", nomenclature: "mx" })?.ownBuildings).toEqual([]);
    });

    it("RF-24 los textos oficiales sueltos empiezan con mayúscula aunque el original no (efectos en español)", () => {
      const franks = buildCardView({ civ: "Franks", map: "arabia", game, cards: [], lang: "es", nomenclature: "es" });
      expect(franks?.uniqueTechs[0]?.effect).toMatch(/^Los ballesteros a caballo/);
    });
  });

  describe("caso 3: ficha desactualizada (RF-28, decisión 34)", () => {
    it("RF-28 la vista no lleva ningún dato de vigencia: la tarjeta no muestra aviso de parche", () => {
      const view = buildCardView({ civ: "Franks", map: "arabia", game, cards: [approved], lang: "es", nomenclature: "mx" });
      expect(JSON.stringify(view?.tactical)).not.toMatch(/stale|reviewedPatch/);
    });
  });
});
