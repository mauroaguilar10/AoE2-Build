// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import { MESSAGES } from "../../src/core/i18n";
import { PREFS_KEY, type KeyValueStore } from "../../src/core/storage";
import type { Route } from "../../src/core/routes";
import type { GameDataset } from "../../src/core/types";

const game = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "data", "game.json"), "utf8")) as GameDataset;
const RULES_URL = "https://www.xbox.com/en-us/developers/rules";
const LEGAL =
  "Age of Empires II © Microsoft Corporation. Guia-Age was created under Microsoft's \"Game Content Usage Rules\" " +
  "using assets from Age of Empires II, and it is not endorsed by or affiliated with Microsoft.";

function memoryStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
}

const SCREENS: [string, Route][] = [
  ["pantalla principal", { kind: "home" }],
  ["tarjeta", { kind: "card", civ: "Franks", map: "arena" }],
  ["dirección no encontrada", { kind: "notFound" }],
];

function renderApp(route: Route, languages: readonly string[] = ["es-AR"], store = memoryStore()) {
  render(<App game={game} cards={[]} route={route} store={store} browserLanguages={languages} />);
  return store;
}

afterEach(cleanup);

describe("T22 estructura de la app: cabecera y pie en todas las pantallas", () => {
  describe.each(SCREENS)("%s", (_name, route) => {
    it("RF-20 control ES/EN en la cabecera", () => {
      renderApp(route);
      const header = screen.getByRole("banner");
      expect(header.contains(screen.getByRole("button", { name: "Cambiar idioma" }))).toBe(true);
    });

    it('RF-26 pie con "Datos del juego: parche X"', () => {
      renderApp(route);
      const footer = screen.getByRole("contentinfo");
      expect(footer.textContent).toContain(`Datos del juego: parche ${game.patch}`);
    });

    it("RF-41 aviso legal literal de Microsoft con enlace a las reglas", () => {
      renderApp(route);
      const footer = screen.getByRole("contentinfo");
      expect(footer.textContent).toContain(LEGAL);
      const link = screen.getByRole("link", { name: "Game Content Usage Rules" });
      expect(link.getAttribute("href")).toBe(RULES_URL);
      expect(footer.contains(link)).toBe(true);
    });
  });

  describe("RF-20 control ES/EN", () => {
    it("en español ofrece pasar a EN y en inglés a ES", () => {
      renderApp({ kind: "home" }, ["es-AR"]);
      expect(screen.getByRole("button", { name: "Cambiar idioma" }).textContent).toBe("EN");
      cleanup();
      renderApp({ kind: "home" }, ["en-US"]);
      expect(screen.getByRole("button", { name: "Change language" }).textContent).toBe("ES");
    });

    it("al pulsarlo cambia los textos sin recargar y lo recuerda (RF-23)", () => {
      const store = renderApp({ kind: "home" }, ["es-AR"]);
      fireEvent.click(screen.getByRole("button", { name: "Cambiar idioma" }));
      expect(screen.getByRole("contentinfo").textContent).toContain(`Game data: patch ${game.patch}`);
      expect(screen.getByRole("button", { name: "Change language" }).textContent).toBe("ES");
      expect(JSON.parse(store.data[PREFS_KEY] ?? "{}").lang).toBe("en");
    });

    it("el idioma del documento acompaña al de la app (lectores de pantalla)", () => {
      renderApp({ kind: "home" }, ["es-AR"]);
      expect(document.documentElement.lang).toBe("es");
      fireEvent.click(screen.getByRole("button", { name: "Cambiar idioma" }));
      expect(document.documentElement.lang).toBe("en");
    });
  });

  describe("RF-41 el aviso legal no se traduce", () => {
    it("es el mismo texto en ambos idiomas (plantilla oficial en inglés)", () => {
      expect(MESSAGES.es.legalNotice).toBe(LEGAL);
      expect(MESSAGES.en.legalNotice).toBe(LEGAL);
    });
  });
});
