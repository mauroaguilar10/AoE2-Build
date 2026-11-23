import { describe, expect, it } from "vitest";
import { patchFromCommitMessage, resolvePatch, PatchError } from "../../tools/lib/patch";

describe("T6 detección del número de parche (RF-27)", () => {
  describe("RF-27 patchFromCommitMessage", () => {
    it("extrae el número de los mensajes reales de aoe2techtree", () => {
      expect(patchFromCommitMessage("Implement DE Update 188329")).toBe("188329");
      expect(patchFromCommitMessage("Implement DE Update 177723")).toBe("177723");
    });

    it("solo mira la primera línea del mensaje y tolera texto adicional", () => {
      expect(patchFromCommitMessage("Implement DE Update 188329 (hotfix)\n\nDetails: Update 999999")).toBe("188329");
    });

    it("devuelve null si el mensaje no sigue el patrón (caso real: 'Add The Viking Sagas')", () => {
      expect(patchFromCommitMessage("Add The Viking Sagas")).toBeNull();
      expect(patchFromCommitMessage("Fix unit/tech connections to buildings")).toBeNull();
      expect(patchFromCommitMessage("")).toBeNull();
    });

    it("no confunde otros números del mensaje con el parche", () => {
      expect(patchFromCommitMessage("Bump version to 2.0.188329")).toBeNull();
    });
  });

  describe("RF-27 resolvePatch", () => {
    it("caso 1: el commit trae número → se usa ese número", () => {
      expect(resolvePatch({ commitMessage: "Implement DE Update 188329" })).toEqual({
        patch: "188329",
        origin: "commit",
      });
    });

    it("caso 2: el commit no trae número pero el mantenedor indica --patch → se usa el manual", () => {
      expect(resolvePatch({ commitMessage: "Add The Viking Sagas", manualPatch: "185000" })).toEqual({
        patch: "185000",
        origin: "manual",
      });
    });

    it("caso 3: sin número en el commit y sin --patch → error que detiene la importación y explica qué hacer", () => {
      expect(() => resolvePatch({ commitMessage: "Add The Viking Sagas" })).toThrow(PatchError);
      expect(() => resolvePatch({ commitMessage: "Add The Viking Sagas" })).toThrow(/Add The Viking Sagas.*--patch/s);
    });

    it("si ambos coinciden, se acepta", () => {
      expect(resolvePatch({ commitMessage: "Implement DE Update 188329", manualPatch: "188329" })).toEqual({
        patch: "188329",
        origin: "commit",
      });
    });

    it("si el commit y --patch no coinciden → error, para no publicar un parche equivocado", () => {
      expect(() => resolvePatch({ commitMessage: "Implement DE Update 188329", manualPatch: "177723" })).toThrow(
        /188329.*177723/s,
      );
    });

    it("rechaza un --patch que no es un número de build", () => {
      for (const bad of ["", "abc", "18.8329", "188329a", " 188329"]) {
        expect(() => resolvePatch({ commitMessage: "Add The Viking Sagas", manualPatch: bad }), bad).toThrow(PatchError);
      }
    });
  });
});
