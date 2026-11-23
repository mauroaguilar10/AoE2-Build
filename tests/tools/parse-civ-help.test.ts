import { describe, expect, it } from "vitest";
import { parseCivHelp, CivHelpParseError } from "../../tools/lib/parse-civ-help";
import { loadFixtureSource } from "../fixtures/load";
import type { GameLocale } from "../../src/core/types";

const src = loadFixtureSource();
const help = (civ: string, locale: GameLocale): string =>
  src.strings[locale][String(src.data.civs[civ]!.help_string_id)]!;

describe("T3 parseo del texto de ayuda de la civilización (RF-17)", () => {
  describe("RF-17 Francos en las 3 variantes", () => {
    it("en: especialidad, bonificaciones, unidad única, tecnologías únicas y bonificación de equipo", () => {
      const p = parseCivHelp(help("Franks", "en"));
      expect(p.specialty).toBe("Cavalry civilization");
      expect(p.bonuses).toEqual([
        "Foragers work +15% faster",
        "Mill technologies free",
        "Mounted Units +20% HP starting in Feudal Age",
        "Castles cost -15/25% in Castle/Imperial Age",
      ]);
      expect(p.uniqueUnits).toEqual(["Throwing Axeman (Infantry)"]);
      expect(p.uniqueTechs).toEqual([
        { name: "Ordonnance Companies", effect: "Mounted Crossbowmen cost -40% gold" },
        { name: "Chivalry", effect: "Stables work +40% faster" },
      ]);
      expect(p.teamBonus).toBe("Knight-line +2 line of sight");
    });

    it("es: textos de España, incluidos espacios duros (\\u00a0) antes de %", () => {
      const p = parseCivHelp(help("Franks", "es"));
      expect(p.specialty).toBe("Civilización de caballería");
      expect(p.bonuses).toHaveLength(4);
      expect(p.bonuses[0]).toBe("Los recolectores trabajan un +15 % más rápido");
      expect(p.uniqueTechs.map((t) => t.name)).toEqual(["Compagnies d'ordonnance", "Caballería"]);
      expect(p.teamBonus).toBe("La línea de caballeros gana +2 de campo de visión");
    });

    it("mx: viñeta sin espacio ('•Código caballeresco') y espacios dobles colapsados", () => {
      const p = parseCivHelp(help("Franks", "mx"));
      expect(p.uniqueTechs).toEqual([
        { name: "Compañías de ordenanza", effect: "costo de los ballesteros montados -40% de oro" },
        { name: "Código caballeresco", effect: "los establos trabajan +40% más rápido" },
      ]);
      expect(p.bonuses[3]).toBe("Los castillos cuestan -15, -25% en las Edades de los castillos e imperial, respectivamente");
      expect(p.teamBonus).toBe("La línea de los caballeros obtiene +2 de campo de visión");
    });
  });

  describe("RF-17 Aztecas en las 3 variantes", () => {
    it("en", () => {
      const p = parseCivHelp(help("Aztecs", "en"));
      expect(p.specialty).toBe("Infantry and Monk civilization");
      expect(p.bonuses).toHaveLength(4);
      expect(p.uniqueUnits).toEqual(["Jaguar Warrior (Infantry)"]);
      expect(p.uniqueTechs.map((t) => t.name)).toEqual(["Atlatl", "Garland Wars"]);
      expect(p.teamBonus).toBe("Relics generate +33% gold");
    });

    it("es: título con espacio interno ('<b>Unidad única: </b>')", () => {
      const p = parseCivHelp(help("Aztecs", "es"));
      expect(p.uniqueUnits).toEqual(["Guerrero jaguar (infantería)"]);
      expect(p.uniqueTechs[0]).toEqual({ name: "Atlatl", effect: "+1 ataque, +1 alcance para guerrilleros" });
    });

    it("mx: títulos sin espacio antes de <br>", () => {
      const p = parseCivHelp(help("Aztecs", "mx"));
      expect(p.uniqueUnits).toEqual(["Guerrero Jaguar (infantería)"]);
      expect(p.uniqueTechs[0]!.name).toBe("Átlatl");
      expect(p.teamBonus).toBe("Las reliquias generan +33% de oro");
    });
  });

  describe("RF-17 Armenios en las 3 variantes", () => {
    it("en: dos unidades únicas y efectos con paréntesis anidados", () => {
      const p = parseCivHelp(help("Armenians", "en"));
      expect(p.specialty).toBe("Infantry and Naval civilization");
      expect(p.bonuses).toHaveLength(5);
      expect(p.uniqueUnits).toEqual(["Composite Bowman (Foot Archer)", "Warrior Priest (Infantry)"]);
      expect(p.uniqueTechs[1]).toEqual({
        name: "Fereters",
        effect: "Infantry (except Spearman-line) +30 HP; Warrior Priests heal +100% faster",
      });
      expect(p.teamBonus).toBe("Infantry +2 line of sight");
    });

    it("es: viñeta precedida de espacio (' • Las tecnologías…')", () => {
      const p = parseCivHelp(help("Armenians", "es"));
      expect(p.bonuses).toHaveLength(5);
      expect(p.bonuses[1]).toBe("Las tecnologías del carro de mulas son un 40 % más efectivas");
      expect(p.uniqueTechs.map((t) => t.name)).toEqual(["Flota de Cilicia", "Relicarios"]);
    });

    it("mx: nomenclatura latinoamericana ('Feretorios')", () => {
      const p = parseCivHelp(help("Armenians", "mx"));
      expect(p.uniqueUnits).toHaveLength(2);
      expect(p.uniqueTechs.map((t) => t.name)).toEqual(["Flota ciliciana", "Feretorios"]);
    });
  });

  describe("RF-17 salida sin HTML", () => {
    it("ningún campo contiene etiquetas, viñetas ni saltos de línea", () => {
      for (const civ of ["Franks", "Aztecs", "Armenians"]) {
        for (const locale of ["en", "es", "mx"] as const) {
          const p = parseCivHelp(help(civ, locale));
          const all = [
            p.specialty,
            p.teamBonus,
            ...p.bonuses,
            ...p.uniqueUnits,
            ...p.uniqueTechs.flatMap((t) => [t.name, t.effect]),
          ];
          for (const text of all) {
            expect(text, `${civ}/${locale}: ${text}`).not.toMatch(/<[^>]+>|•|\n/);
            expect(text, `${civ}/${locale}`).toBe(text.trim());
            expect(text.length, `${civ}/${locale}`).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe("RF-17 errores de formato", () => {
    it("falla con CivHelpParseError si faltan secciones", () => {
      expect(() => parseCivHelp("Cavalry civilization<br>\n<br>\n• Bonus")).toThrow(CivHelpParseError);
    });

    it("acepta un punto final tras el paréntesis del efecto (caso real: Wu en es)", () => {
      const withPeriod = help("Franks", "en").replace(
        "Chivalry (Stables work +40% faster)",
        "Chivalry (Stables work +40% faster).",
      );
      expect(parseCivHelp(withPeriod).uniqueTechs[1]).toEqual({ name: "Chivalry", effect: "Stables work +40% faster" });
    });

    it("falla si una tecnología única no tiene efecto entre paréntesis", () => {
      const broken = help("Franks", "en").replace("Chivalry (Stables work +40% faster)", "Chivalry");
      expect(() => parseCivHelp(broken)).toThrow(/Chivalry/);
    });
  });
});
