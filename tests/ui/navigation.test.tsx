// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import { parseRoute, type Route } from "../../src/core/routes";
import { PREFS_KEY, type KeyValueStore } from "../../src/core/storage";
import { parseCard } from "../../tools/lib/card-schema";
import { toPublished } from "../../tools/lib/content";
import type { GameDataset } from "../../src/core/types";

const ROOT = join(import.meta.dirname, "..", "..");
const game = JSON.parse(readFileSync(join(ROOT, "data", "game.json"), "utf8")) as GameDataset;
const FILE = "franks.arabia.1v1.yaml";
const franksArabia = toPublished(parseCard(readFileSync(join(ROOT, "tests", "fixtures", "cards", FILE), "utf8"), FILE), true);
const CIVS = Object.keys(game.civs);

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
}

function renderAt(url: string, store = memoryStore()) {
  history.replaceState(null, "", url);
  const route: Route = parseRoute(location.pathname, location.search, CIVS);
  render(
    <App game={game} cards={[franksArabia]} route={route} store={store} browserLanguages={["es-AR"]} isOnline={() => true} />,
  );
  return store;
}

const url = () => location.pathname + location.search;
const heading = () => screen.queryByRole("heading", { level: 1 })?.textContent;
const checkedMap = () => screen.getAllByRole<HTMLInputElement>("radio").find((r) => r.checked)?.value;
const onHome = () => screen.queryByRole("searchbox") !== null;

beforeEach(() => history.replaceState(null, "", "/"));
afterEach(cleanup);

describe("T27 navegación", () => {
  describe("RF-7 tocar una civilización abre su tarjeta con el mapa elegido", () => {
    it("RF-7 abre la tarjeta sin recargar y cambia la dirección", () => {
      renderAt("/");
      fireEvent.click(screen.getByRole("radio", { name: "Arena" }));
      const link = screen.getByRole("link", { name: /^Francos/ });
      expect(fireEvent.click(link)).toBe(false); // la app gestiona la navegación, sin recargar
      expect(heading()).toBe("Francos");
      expect(url()).toBe("/civ/franks?map=arena");
      expect(checkedMap()).toBe("arena");
    });

    it("con Ctrl o en otra pestaña el navegador abre el enlace normalmente", () => {
      renderAt("/");
      expect(fireEvent.click(screen.getByRole("link", { name: /^Francos/ }), { ctrlKey: true })).toBe(true);
      expect(onHome()).toBe(true);
    });

    it("el botón Atrás del navegador vuelve a la pantalla principal", () => {
      renderAt("/");
      fireEvent.click(screen.getByRole("link", { name: /^Francos/ }));
      act(() => {
        history.back();
        // happy-dom no dispara popstate al retroceder; se simula como lo haría el navegador.
        history.replaceState(null, "", "/");
        dispatchEvent(new PopStateEvent("popstate"));
      });
      expect(onHome()).toBe(true);
    });

    it('el enlace "Inicio" de la tarjeta vuelve a la pantalla principal', () => {
      renderAt("/civ/franks?map=arabia");
      const home = screen.getByRole("link", { name: "Inicio" });
      // Se ve como un botón de volver; la flecha es decorativa y no cambia su nombre accesible.
      expect(home.classList.contains("back-link")).toBe(true);
      fireEvent.click(home);
      expect(onHome()).toBe(true);
      expect(url()).toBe("/");
    });
  });

  describe("RF-8 cambiar de mapa dentro de la tarjeta", () => {
    it("RF-8 el contenido cambia sin volver a la pantalla principal", () => {
      renderAt("/civ/franks?map=arabia");
      expect(screen.getByRole("region", { name: "Economía" })).toBeTruthy();

      fireEvent.click(screen.getByRole("radio", { name: "Arena" }));
      expect(onHome()).toBe(false);
      expect(heading()).toBe("Francos");
      expect(url()).toBe("/civ/franks?map=arena");
      expect(checkedMap()).toBe("arena");
      expect(screen.getByText("Ficha táctica aún no disponible para esta civilización")).toBeTruthy();
    });

    it("RF-3 el mapa elegido en la tarjeta pasa a ser el último mapa usado", () => {
      const store = renderAt("/civ/franks?map=arabia");
      fireEvent.click(screen.getByRole("radio", { name: "Selva Negra" }));
      expect(JSON.parse(store.data[PREFS_KEY] ?? "{}").lastMap).toBe("black_forest");
    });
  });

  describe("RF-10 una URL directa abre la tarjeta", () => {
    it("RF-10 /civ/franks?map=arena muestra esa tarjeta en ese mapa", () => {
      renderAt("/civ/franks?map=arena");
      expect(heading()).toBe("Francos");
      expect(checkedMap()).toBe("arena");
    });

    it("RF-10 sin mapa en la dirección usa el último mapa usado", () => {
      renderAt("/civ/franks", memoryStore({ [PREFS_KEY]: JSON.stringify({ lastMap: "black_forest" }) }));
      expect(heading()).toBe("Francos");
      expect(checkedMap()).toBe("black_forest");
    });
  });

  describe("RF-11 una URL inválida muestra el inicio con aviso", () => {
    it.each(["/civ/atlanteans?map=arena", "/civ/franks?map=nomad", "/otra-cosa"])("RF-11 %s", (address) => {
      renderAt(address);
      expect(onHome()).toBe(true);
      expect(screen.getByRole("alert").textContent).toBe("No se encontró la tarjeta");
    });

    it("RF-11 el aviso desaparece al navegar", () => {
      renderAt("/civ/atlanteans");
      fireEvent.click(screen.getByRole("link", { name: /^Francos/ }));
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("en una dirección válida no hay aviso", () => {
      renderAt("/");
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe('RF-9 acceso "Continuar" a la última tarjeta consultada', () => {
    it('RF-9 tras consultar una tarjeta, al volver a abrir la app aparece "Continuar: <civ> · <mapa>"', () => {
      const store = renderAt("/civ/franks?map=arena");
      cleanup();
      renderAt("/", store); // nueva visita
      const link = screen.getByRole("link", { name: "Continuar: Francos · Arena" });
      fireEvent.click(link);
      expect(heading()).toBe("Francos");
      expect(url()).toBe("/civ/franks?map=arena");
    });

    it("RF-9 en la primera visita no aparece", () => {
      renderAt("/");
      expect(screen.queryByRole("link", { name: /^Continuar/ })).toBeNull();
    });

    it("RF-9 recuerda el último mapa consultado dentro de la tarjeta", () => {
      const store = renderAt("/civ/franks?map=arabia");
      fireEvent.click(screen.getByRole("radio", { name: "Selva Negra" }));
      cleanup();
      renderAt("/", store);
      expect(screen.getByRole("link", { name: "Continuar: Francos · Selva Negra" })).toBeTruthy();
    });

    it("RF-9 no aparece si la civilización guardada ya no existe en el juego", () => {
      renderAt("/", memoryStore({ [PREFS_KEY]: JSON.stringify({ lastCard: { civ: "Atlanteans", map: "arena" } }) }));
      expect(screen.queryByRole("link", { name: /^Continuar/ })).toBeNull();
    });

    it("RF-9 se muestra en el idioma activo", () => {
      const store = memoryStore({ [PREFS_KEY]: JSON.stringify({ lang: "en", lastCard: { civ: "Spanish", map: "black_forest" } }) });
      renderAt("/", store);
      expect(screen.getByRole("link", { name: "Continue: Spanish · Black Forest" })).toBeTruthy();
    });
  });
});
