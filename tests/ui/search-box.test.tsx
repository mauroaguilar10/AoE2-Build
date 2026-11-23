// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import type { KeyValueStore } from "../../src/core/storage";
import type { GameDataset } from "../../src/core/types";

const game = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "data", "game.json"), "utf8")) as GameDataset;

function memoryStore(): KeyValueStore {
  const data: Record<string, string> = {};
  return { getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
}

function renderHome(languages: readonly string[] = ["es-AR"]) {
  render(<App game={game} cards={[]} route={{ kind: "home" }} store={memoryStore()} browserLanguages={languages} />);
}

const civNames = () => [...document.querySelectorAll(".civ-grid .civ-name")].map((el) => el.textContent);
const type = (text: string) => fireEvent.input(screen.getByRole("searchbox", { name: "Buscar civilización" }), { target: { value: text } });

afterEach(cleanup);

describe("T24 buscador", () => {
  describe("RF-5 escribir filtra la cuadrícula", () => {
    it("RF-5 el buscador está en la pantalla principal y vacío no filtra nada", () => {
      renderHome();
      expect(screen.getByRole("searchbox", { name: "Buscar civilización" })).toBeTruthy();
      expect(civNames()).toHaveLength(56);
    });

    it("RF-5 filtra por parte del nombre", () => {
      renderHome();
      type("franc");
      expect(civNames()).toEqual(["Francos"]);
    });

    it('RF-5 sin distinguir mayúsculas ni tildes y en cualquier idioma: "espanoles", "SPANISH", "españoles"', () => {
      renderHome();
      for (const text of ["espanoles", "SPANISH", "españoles"]) {
        type(text);
        expect(civNames()).toEqual(["Españoles"]);
      }
    });

    it("RF-5 encuentra un nombre de España aunque la nomenclatura activa sea Latinoamérica", () => {
      renderHome();
      type("yurchen");
      expect(civNames()).toEqual(["Jurchens"]);
    });

    it("RF-2 un grupo sin coincidencias no se muestra; el otro sí", () => {
      renderHome();
      type("armen");
      expect(civNames()).toEqual(["Armenios"]);
      expect(screen.queryByRole("region", { name: "Con ficha táctica" })).toBeNull();
      expect(screen.getByRole("region", { name: "Solo datos" })).toBeTruthy();
    });

    it("RF-4 los resultados conservan el orden de la cuadrícula (primero los de ficha)", () => {
      renderHome();
      type("an");
      const names = civNames();
      expect(names.indexOf("Francos")).toBeLessThan(names.indexOf("Armenios"));
    });

    it("al borrar el texto vuelven las 56", () => {
      renderHome();
      type("franc");
      type("");
      expect(civNames()).toHaveLength(56);
    });
  });

  describe("RF-6 sin coincidencias", () => {
    it('RF-6 aparece "Sin resultados" y la cuadrícula queda vacía', () => {
      renderHome();
      type("zzz");
      expect(civNames()).toEqual([]);
      expect(screen.getByRole("status").textContent).toBe("Sin resultados");
    });

    it("RF-6 el selector de mapa sigue ahí, con el mismo mapa elegido", () => {
      renderHome();
      fireEvent.click(screen.getByRole("radio", { name: "Arena" }));
      type("zzz");
      const radios = screen.getAllByRole<HTMLInputElement>("radio");
      expect(radios).toHaveLength(3);
      expect(radios.find((r) => r.checked)?.value).toBe("arena");
    });

    it('con resultados no aparece "Sin resultados"', () => {
      renderHome();
      type("franc");
      expect(screen.queryByText("Sin resultados")).toBeNull();
    });

    it("en inglés el mensaje también se traduce", () => {
      renderHome(["en-US"]);
      fireEvent.input(screen.getByRole("searchbox", { name: "Search civilization" }), { target: { value: "zzz" } });
      expect(screen.getByRole("status").textContent).toBe("No results");
    });
  });
});
