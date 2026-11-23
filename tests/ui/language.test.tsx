// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import { parseRoute } from "../../src/core/routes";
import { PREFS_KEY, type KeyValueStore } from "../../src/core/storage";
import { parseCard } from "../../tools/lib/card-schema";
import { toPublished } from "../../tools/lib/content";
import type { GameDataset } from "../../src/core/types";

const ROOT = join(import.meta.dirname, "..", "..");
const game = JSON.parse(readFileSync(join(ROOT, "data", "game.json"), "utf8")) as GameDataset;
const FILE = "franks.arabia.1v1.yaml";
const franksArabia = toPublished(parseCard(readFileSync(join(ROOT, "tests", "fixtures", "cards", FILE), "utf8"), FILE), true);

function memoryStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
}

function renderAt(url: string, store = memoryStore(), languages = ["es-AR"]) {
  history.replaceState(null, "", url);
  render(
    <App
      game={game}
      cards={[franksArabia]}
      route={parseRoute(location.pathname, location.search, Object.keys(game.civs))}
      store={store}
      browserLanguages={languages}
      isOnline={() => true}
    />,
  );
  return store;
}

const toggleLang = () => fireEvent.click(screen.getByRole("button", { name: /Cambiar idioma|Change language/ }));
const searchbox = () => screen.getByRole<HTMLInputElement>("searchbox");
const civNames = () => [...document.querySelectorAll(".civ-grid .civ-name")].map((el) => el.textContent);
const checkedMap = () => screen.getAllByRole<HTMLInputElement>("radio").find((r) => r.checked)?.value;
const nomenclature = () => screen.queryByRole<HTMLSelectElement>("combobox", { name: "Nombres oficiales" });

beforeEach(() => history.replaceState(null, "", "/"));
afterEach(cleanup);

describe("T28 cambio de idioma y nomenclatura conservando el estado", () => {
  describe("RF-21 ES↔EN sin recargar y conservando el estado", () => {
    it("RF-21 en la pantalla principal se conservan el mapa y el texto del buscador", () => {
      renderAt("/");
      fireEvent.click(screen.getByRole("radio", { name: "Arena" }));
      fireEvent.input(searchbox(), { target: { value: "franc" } });
      const input = searchbox();

      toggleLang();
      expect(searchbox()).toBe(input); // el mismo elemento: no se recargó nada
      expect(searchbox().value).toBe("franc");
      expect(civNames()).toEqual(["Franks"]);
      expect(checkedMap()).toBe("arena");
      expect(screen.getByRole("radio", { name: "Arena" })).toBeTruthy();
    });

    it("RF-21 en la tarjeta se conservan civilización, mapa y build order desplegado", () => {
      renderAt("/civ/franks?map=arabia");
      fireEvent.click(screen.getByRole("button", { name: "Ver build order paso a paso" }));

      toggleLang();
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Franks");
      expect(checkedMap()).toBe("arabia");
      expect(location.pathname + location.search).toBe("/civ/franks?map=arabia");
      const toggle = screen.getByRole("button", { name: "Hide build order" });
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByText("6 villagers on sheep")).toBeTruthy();
    });

    it("RF-21 el build order plegado sigue plegado", () => {
      renderAt("/civ/franks?map=arabia");
      toggleLang();
      expect(screen.getByRole("button", { name: "Show step-by-step build order" }).getAttribute("aria-expanded")).toBe("false");
    });

    it("RF-21 al volver a ES todo sigue igual", () => {
      renderAt("/");
      fireEvent.input(searchbox(), { target: { value: "franc" } });
      toggleLang();
      toggleLang();
      expect(searchbox().value).toBe("franc");
      expect(civNames()).toEqual(["Francos"]);
    });
  });

  describe("RF-24 selector de nomenclatura", () => {
    it("RF-24 solo aparece en español, con Latinoamérica por defecto", () => {
      renderAt("/");
      expect(nomenclature()?.value).toBe("mx");
      expect([...nomenclature()!.options].map((o) => o.textContent)).toEqual(["Latinoamérica", "España"]);
      toggleLang();
      expect(nomenclature()).toBeNull();
      expect(screen.queryByRole("combobox")).toBeNull();
    });

    it("RF-24 cambia los nombres oficiales y reordena la cuadrícula", () => {
      renderAt("/");
      const before = civNames();
      expect(before).toContain("Jurchens");

      fireEvent.change(nomenclature()!, { target: { value: "es" } });
      const after = civNames();
      expect(after).toContain("Yurchen");
      expect(after).not.toContain("Jurchens");
      expect(after.indexOf("Yurchen")).toBeGreaterThan(before.indexOf("Jurchens")); // J → Y
    });

    it("RF-24 en la tarjeta cambia los nombres oficiales pero no el texto táctico", () => {
      renderAt("/civ/franks?map=arabia");
      const economy = () => screen.getByRole("region", { name: "Economía" }).textContent ?? "";
      const support = () => document.querySelector('[data-row="support"]')?.textContent;
      expect(support()).toContain("Hostigador");
      const opening = economy().match(/Apertura (.*?)Subir/)?.[1];

      fireEvent.change(nomenclature()!, { target: { value: "es" } });
      expect(support()).toContain("Guerrillero");
      expect(economy()).toContain(`Apertura ${opening}`);
    });

    it("RF-24 el selector se conserva al ir a EN y volver", () => {
      renderAt("/");
      fireEvent.change(nomenclature()!, { target: { value: "es" } });
      toggleLang();
      toggleLang();
      expect(nomenclature()?.value).toBe("es");
    });
  });

  describe("RF-23 idioma y nomenclatura se recuerdan en la siguiente visita", () => {
    it("RF-23 idioma", () => {
      const store = renderAt("/", memoryStore(), ["es-AR"]);
      toggleLang();
      cleanup();
      renderAt("/", store, ["es-AR"]);
      expect(screen.getByRole("button", { name: "Change language" })).toBeTruthy();
    });

    it("RF-23 nomenclatura", () => {
      const store = renderAt("/");
      fireEvent.change(nomenclature()!, { target: { value: "es" } });
      expect(JSON.parse(store.data[PREFS_KEY] ?? "{}").nomenclature).toBe("es");
      cleanup();
      renderAt("/", store);
      expect(nomenclature()?.value).toBe("es");
      expect(civNames()).toContain("Yurchen");
    });
  });
});
