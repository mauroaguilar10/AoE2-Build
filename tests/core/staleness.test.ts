import { describe, expect, it } from "vitest";
import { computeStaleness, comparePatches } from "../../src/core/staleness";
import type { PatchHistory, ReviewSnapshot } from "../../src/core/types";

const snapshot: ReviewSnapshot = {
  reviewedPatch: "188329",
  approvedAt: "2026-12-01",
  fingerprints: { "civ:Franks": "civ-a", "unit:448": "scout-a", "tech:67": "forging-a" },
  cardHash: "x",
};

const history = (patch: string, overrides: Partial<{ civ: string; scout: string | null; forging: string }> = {}): PatchHistory => {
  const entities: Record<string, string> = { "tech:67": overrides.forging ?? "forging-a" };
  if (overrides.scout !== null) entities["unit:448"] = overrides.scout ?? "scout-a";
  return { patch, civs: { Franks: overrides.civ ?? "civ-a" }, entities: entities as PatchHistory["entities"] };
};

describe("T13 vigencia de una ficha frente a los parches (RF-28)", () => {
  it("RF-28 sin cambios desde la revisión: no está desactualizada", () => {
    expect(computeStaleness(snapshot, [history("188329"), history("190000")])).toEqual({
      reviewedPatch: "188329",
      stale: false,
      changes: [],
    });
  });

  it("RF-28 una entidad cambia en un parche posterior: desactualizada, con entidad y parche", () => {
    const result = computeStaleness(snapshot, [history("188329"), history("190000", { scout: "scout-b" })]);
    expect(result.stale).toBe(true);
    expect(result.changes).toEqual([{ key: "unit:448", changedIn: "190000" }]);
  });

  it("RF-28 el cambio se atribuye al primer parche desde el que se mantiene hasta hoy", () => {
    const result = computeStaleness(snapshot, [
      history("188329"),
      history("190000", { scout: "scout-b" }),
      history("191000", { scout: "scout-c" }),
    ]);
    expect(result.changes).toEqual([{ key: "unit:448", changedIn: "190000" }]);
  });

  it("RF-28 un cambio que se revierte en un parche posterior no marca la ficha", () => {
    const result = computeStaleness(snapshot, [
      history("188329"),
      history("190000", { scout: "scout-b" }),
      history("191000"),
    ]);
    expect(result.stale).toBe(false);
  });

  it("RF-28 un cambio en la propia civilización (bonificaciones o disponibilidad) también cuenta", () => {
    const result = computeStaleness(snapshot, [history("188329"), history("190000", { civ: "civ-b" })]);
    expect(result.changes).toEqual([{ key: "civ:Franks", changedIn: "190000" }]);
  });

  it("RF-28 una entidad que desaparece de los datos cuenta como cambio", () => {
    const result = computeStaleness(snapshot, [history("188329"), history("190000", { scout: null })]);
    expect(result.changes).toEqual([{ key: "unit:448", changedIn: "190000" }]);
  });

  it("ignora los parches anteriores o iguales al de revisión y ordena por número, no alfabéticamente", () => {
    const old: ReviewSnapshot = { ...snapshot, reviewedPatch: "99999" };
    const result = computeStaleness(old, [history("100000", { forging: "forging-b" }), history("99999"), history("98000", { forging: "x" })]);
    expect(result.changes).toEqual([{ key: "tech:67", changedIn: "100000" }]);
  });

  it("comparePatches ordena numéricamente", () => {
    expect(["188329", "99999", "100000"].sort(comparePatches)).toEqual(["99999", "100000", "188329"]);
  });
});
