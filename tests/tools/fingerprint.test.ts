import { describe, expect, it } from "vitest";
import {
  entityFingerprint,
  refFingerprint,
  civFingerprint,
  FingerprintError,
} from "../../tools/lib/fingerprint";
import { loadFixtureSource } from "../fixtures/load";
import type { RawSource } from "../../src/core/types";

const src = loadFixtureSource();
const clone = (): RawSource => structuredClone(src);
const archer = () => structuredClone(src.data.data.Unit["4"]!);

describe("T7 huellas mecánicas (base de RF-28)", () => {
  describe("RF-28 entityFingerprint", () => {
    it("es determinista y tiene formato hexadecimal de 16 caracteres", () => {
      expect(entityFingerprint(archer())).toBe(entityFingerprint(archer()));
      expect(entityFingerprint(archer())).toMatch(/^[0-9a-f]{16}$/);
    });

    it("cambia si cambia el coste", () => {
      const changed = archer();
      changed.Cost = { ...changed.Cost, Gold: (changed.Cost.Gold ?? 0) + 5 };
      expect(entityFingerprint(changed)).not.toBe(entityFingerprint(archer()));
    });

    it("cambia si cambian los PV (HP)", () => {
      const changed = archer();
      changed.HP = (changed.HP ?? 0) + 5;
      expect(entityFingerprint(changed)).not.toBe(entityFingerprint(archer()));
    });

    it("cambia si cambia una armadura", () => {
      const changed = archer();
      changed.Armours = changed.Armours!.map((a, i) => (i === 0 ? { ...a, Amount: a.Amount + 1 } : a));
      expect(entityFingerprint(changed)).not.toBe(entityFingerprint(archer()));
    });

    it("cambia si aparece un campo mecánico nuevo (lista de exclusión, no de inclusión)", () => {
      const changed = archer();
      changed["NewMechanic"] = 1;
      expect(entityFingerprint(changed)).not.toBe(entityFingerprint(archer()));
    });

    it("NO cambia con campos no mecánicos: internal_name ni LanguageNameId", () => {
      const changed = archer();
      changed.internal_name = "ARCHER_RENAMED";
      changed.LanguageNameId = 99999;
      expect(entityFingerprint(changed)).toBe(entityFingerprint(archer()));
    });

    it("NO cambia si solo se reordenan las claves o los arrays", () => {
      const original = archer();
      const reordered = Object.fromEntries(Object.entries(original).reverse()) as typeof original;
      reordered.Armours = [...original.Armours!].reverse();
      reordered.Attacks = [...original.Attacks!].reverse();
      expect(entityFingerprint(reordered)).toBe(entityFingerprint(original));
    });
  });

  describe("RF-28 refFingerprint", () => {
    it("resuelve unidades, tecnologías y edificios por referencia canónica", () => {
      for (const ref of ["unit:281", "tech:493", "building:1806"] as const) {
        expect(refFingerprint(ref, src.data), ref).toMatch(/^[0-9a-f]{16}$/);
      }
    });

    it("para una unidad incluye también su mejora (unit_upgrades): cambiar el coste de la mejora a élite cambia la huella", () => {
      const changed = clone();
      const upgrade = changed.data.data.unit_upgrades["531"]!;
      upgrade.Cost = { ...upgrade.Cost, Food: (upgrade.Cost.Food ?? 0) + 100 };
      expect(refFingerprint("unit:531", changed.data)).not.toBe(refFingerprint("unit:531", src.data));
    });

    it("falla con FingerprintError si la entidad no existe", () => {
      expect(() => refFingerprint("unit:999999", src.data)).toThrow(FingerprintError);
      expect(() => refFingerprint("unit:999999", src.data)).toThrow(/unit:999999/);
    });
  });

  describe("RF-28 civFingerprint: disponibilidad + bonificaciones en inglés", () => {
    const base = civFingerprint("Franks", src.data, src.strings.en);

    it("NO cambia si solo cambia el texto es o mx (cambios solo de traducción)", () => {
      const changed = clone();
      const helpId = String(changed.data.civs.Franks!.help_string_id);
      changed.strings.es[helpId] = "Texto de España reescrito";
      changed.strings.mx[helpId] = "Texto de Latinoamérica reescrito";
      expect(civFingerprint("Franks", changed.data, changed.strings.en)).toBe(base);
    });

    it("cambia si cambia el texto inglés de bonificaciones (un cambio de bonificación real)", () => {
      const changed = clone();
      const helpId = String(changed.data.civs.Franks!.help_string_id);
      changed.strings.en[helpId] = changed.strings.en[helpId]!.replace("+15%", "+20%");
      expect(civFingerprint("Franks", changed.data, changed.strings.en)).not.toBe(base);
    });

    it("cambia si la civilización gana o pierde una unidad, tecnología o edificio", () => {
      const changed = clone();
      changed.data.civs.Franks!.Tech = changed.data.civs.Franks!.Tech.slice(1);
      expect(civFingerprint("Franks", changed.data, changed.strings.en)).not.toBe(base);
    });

    it("NO cambia si solo se reordena la lista de disponibilidad", () => {
      const changed = clone();
      changed.data.civs.Franks!.Unit = [...changed.data.civs.Franks!.Unit].reverse();
      expect(civFingerprint("Franks", changed.data, changed.strings.en)).toBe(base);
    });

    it("falla con FingerprintError si la civilización no existe", () => {
      expect(() => civFingerprint("Atlanteans", src.data, src.strings.en)).toThrow(FingerprintError);
    });
  });
});
