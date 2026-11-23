// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import { CARD_CIVS } from "../../src/core/scope";
import { PREFS_KEY, type KeyValueStore } from "../../src/core/storage";
import type { GameDataset } from "../../src/core/types";

const game = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "data", "game.json"), "utf8")) as GameDataset;
const CIV_COUNT = Object.keys(game.civs).length;

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
}

function renderHome(languages: readonly string[] = ["es-AR"], store = memoryStore()) {
  render(<App game={game} cards={[]} route={{ kind: "home" }} store={store} browserLanguages={languages} />);
  return store;
}

/** Nombres de las civilizaciones de un grupo, en el orden en que se muestran. */
function groupNames(heading: string): string[] {
  const section = screen.getByRole("region", { name: heading });
  return within(section)
    .getAllByRole("link")
    .map((link) => link.querySelector(".civ-name")?.textContent ?? "");
}

afterEach(cleanup);

describe("T23 pantalla principal: selector de mapa y cuadrícula", () => {
  describe("RF-1 cuadrícula con todas las civilizaciones, con nombre y escudo", () => {
    it(`RF-1 aparecen las ${CIV_COUNT} civilizaciones de los datos del juego`, () => {
      renderHome();
      expect(CIV_COUNT).toBe(56);
      expect(document.querySelectorAll(".civ-grid a")).toHaveLength(56);
    });

    it("RF-1 cada una con su escudo", () => {
      renderHome();
      const franks = screen.getByRole("link", { name: /^Francos/ });
      const img = franks.querySelector("img");
      expect(img?.getAttribute("src")).toMatch(/franks\.png$/);
      for (const link of document.querySelectorAll(".civ-grid a")) {
        expect(link.querySelector("img")?.getAttribute("src")).toMatch(/\.png$/);
      }
    });

    it("RF-1 selector con los tres mapas", () => {
      renderHome();
      const selector = screen.getByRole("group", { name: "Mapa" });
      expect(within(selector).getAllByRole("radio").map((r) => r.closest("label")?.textContent)).toEqual([
        "Arabia",
        "Arena",
        "Selva Negra",
      ]);
    });
  });

  describe("RF-2 primero las civilizaciones con ficha, después las de solo datos", () => {
    it("RF-2 las 10 con ficha forman el primer grupo", () => {
      renderHome();
      const withCard = groupNames("Con ficha táctica");
      expect(withCard).toHaveLength(CARD_CIVS.length);
      expect(withCard).toContain("Francos");
      const regions = screen.getAllByRole("region").map((r) => r.querySelector("h2")?.textContent);
      expect(regions).toEqual(["Con ficha táctica", "Solo datos"]);
    });

    it('RF-2 el resto está marcado "solo datos"', () => {
      renderHome();
      const section = screen.getByRole("region", { name: "Solo datos" });
      const links = within(section).getAllByRole("link");
      expect(links).toHaveLength(56 - CARD_CIVS.length);
      for (const link of links) expect(link.textContent).toContain("solo datos");
      const withCard = within(screen.getByRole("region", { name: "Con ficha táctica" })).getAllByRole("link");
      for (const link of withCard) expect(link.textContent).not.toContain("solo datos");
    });
  });

  describe("RF-4 orden alfabético según el idioma", () => {
    it("RF-4 en español", () => {
      renderHome(["es-AR"]);
      expect(groupNames("Con ficha táctica").slice(0, 4)).toEqual(["Aztecas", "Britanos", "Españoles", "Francos"]);
    });

    it("RF-4 en inglés", () => {
      renderHome(["en-US"]);
      expect(groupNames("With tactical card").slice(0, 4)).toEqual(["Aztecs", "Britons", "Franks", "Goths"]);
    });

    it("RF-4 al cambiar de idioma la cuadrícula se reordena", () => {
      renderHome(["es-AR"]);
      fireEvent.click(screen.getByRole("button", { name: "Cambiar idioma" }));
      expect(groupNames("With tactical card").slice(0, 3)).toEqual(["Aztecs", "Britons", "Franks"]);
    });
  });

  describe("RF-3 mapa seleccionado", () => {
    const checked = () => screen.getAllByRole<HTMLInputElement>("radio").find((r) => r.checked)?.value;

    it("RF-3 Arabia en la primera visita", () => {
      renderHome();
      expect(checked()).toBe("arabia");
    });

    it("RF-3 el último mapa usado en las visitas siguientes", () => {
      const store = renderHome();
      fireEvent.click(screen.getByRole("radio", { name: "Selva Negra" }));
      expect(checked()).toBe("black_forest");
      expect(JSON.parse(store.data[PREFS_KEY] ?? "{}").lastMap).toBe("black_forest");

      cleanup();
      renderHome(["es-AR"], store); // nueva visita con el mismo almacenamiento
      expect(checked()).toBe("black_forest");
    });

    it("cada civilización enlaza a su tarjeta en el mapa seleccionado", () => {
      renderHome();
      fireEvent.click(screen.getByRole("radio", { name: "Arena" }));
      expect(screen.getByRole("link", { name: /^Francos/ }).getAttribute("href")).toBe("/civ/franks?map=arena");
    });
  });
});
