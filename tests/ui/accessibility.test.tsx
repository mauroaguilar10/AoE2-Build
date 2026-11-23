// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import { Card } from "../../src/ui/Card";
import { buildCardView } from "../../src/core/card-view";
import { parseRoute } from "../../src/core/routes";
import type { KeyValueStore } from "../../src/core/storage";
import { parseCard } from "../../tools/lib/card-schema";
import { toPublished } from "../../tools/lib/content";
import type { GameDataset } from "../../src/core/types";

const ROOT = join(import.meta.dirname, "..", "..");
const game = JSON.parse(readFileSync(join(ROOT, "data", "game.json"), "utf8")) as GameDataset;
const FILE = "franks.arabia.1v1.yaml";
const franksArabia = toPublished(parseCard(readFileSync(join(ROOT, "tests", "fixtures", "cards", FILE), "utf8"), FILE), true);

function memoryStore(): KeyValueStore {
  const data: Record<string, string> = {};
  return { getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
}

function renderAt(url: string) {
  history.replaceState(null, "", url);
  render(
    <App
      game={game}
      cards={[franksArabia]}
      route={parseRoute(location.pathname, location.search, Object.keys(game.civs))}
      store={memoryStore()}
      browserLanguages={["es-AR"]}
      isOnline={() => true}
    />,
  );
}

/** Nombre visible o accesible de un control. */
function controlName(element: Element): string {
  const label = element.getAttribute("aria-label") ?? element.closest("label")?.textContent ?? element.textContent ?? "";
  return label.trim();
}

/** Comprueba que todo lo interactivo sea nativo (enfocable y activable con teclado) y tenga nombre. */
function expectKeyboardOperable() {
  const controls = [...document.querySelectorAll("a, button, input, select, textarea, [onclick], [role=button], [tabindex]")];
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    const tag = control.tagName.toLowerCase();
    if (control.getAttribute("tabindex") === "-1") continue; // destino de foco programático (títulos), no un control
    expect(["a", "button", "input", "select", "textarea"], `${tag}.${control.className}`).toContain(tag);
    if (tag === "a") expect(control.getAttribute("href"), controlName(control)).toBeTruthy();
    if (tag === "button") expect(control.getAttribute("type")).toBe("button");
    expect(Number(control.getAttribute("tabindex") ?? 0)).toBeLessThanOrEqual(0); // sin saltos en el orden de tabulación
    expect(controlName(control), `${tag}.${control.className} sin nombre`).not.toBe("");
  }
}

beforeEach(() => history.replaceState(null, "", "/"));
afterEach(cleanup);

describe("T29 accesibilidad básica y tarjeta autónoma", () => {
  describe("NFR Accesibilidad: toda la app se maneja con teclado", () => {
    it("pantalla principal: todos los controles son nativos y tienen nombre", () => {
      renderAt("/");
      expectKeyboardOperable();
    });

    it("tarjeta (con el build order desplegado): todos los controles son nativos y tienen nombre", () => {
      renderAt("/civ/franks?map=arabia");
      fireEvent.click(screen.getByRole("button", { name: /build order/ }));
      expectKeyboardOperable();
    });

    it("dirección no encontrada: igual", () => {
      renderAt("/civ/atlanteans");
      expectKeyboardOperable();
    });

    it("el selector de mapa es un grupo de opciones con título: se recorre con las flechas", () => {
      renderAt("/");
      const group = screen.getByRole("group", { name: "Mapa" });
      const radios = screen.getAllByRole<HTMLInputElement>("radio");
      expect(radios.every((radio) => group.contains(radio) && radio.name === radios[0]?.name)).toBe(true);
    });

    it("cada pantalla tiene un único título principal", () => {
      renderAt("/");
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      cleanup();
      renderAt("/civ/franks?map=arabia");
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    });

    it("al navegar, el foco pasa al título de la nueva pantalla (no se queda en un enlace que ya no existe)", () => {
      renderAt("/");
      fireEvent.click(screen.getByRole("link", { name: /^Francos/ }));
      expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1, name: "Francos" }));
      fireEvent.click(screen.getByRole("link", { name: "Inicio" }));
      expect(document.activeElement?.tagName).toBe("H1");
    });

    it("al abrir la app el foco no se mueve (queda donde lo deja el navegador)", () => {
      renderAt("/civ/franks?map=arabia");
      expect(document.activeElement).toBe(document.body);
    });
  });

  describe("NFR Modo flotante: la tarjeta se muestra sola", () => {
    const view = buildCardView({ civ: "Franks", map: "arabia", game, cards: [franksArabia], lang: "es", nomenclature: "mx" })!;

    it("Card se renderiza sin la app: sin cabecera, pie ni proveedor de navegación", () => {
      render(<Card view={view} lang="es" isOnline={() => true} />);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Francos");
      expect(screen.getByRole("region", { name: "Economía" })).toBeTruthy();
      expect(screen.getByRole("region", { name: "Ataque" })).toBeTruthy();
      expect(screen.getByRole("region", { name: "Datos del juego" })).toBeTruthy();
      expect(screen.queryByRole("banner")).toBeNull();
      expect(screen.queryByRole("contentinfo")).toBeNull();
    });

    it("sin onMapChange no ofrece cambiar de mapa; el resto funciona (build order)", () => {
      render(<Card view={view} lang="es" isOnline={() => true} />);
      expect(screen.queryByRole("radio")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Ver build order paso a paso" }));
      expect(screen.getByRole("list", { name: "Build order" })).toBeTruthy();
    });

    it("sola también es operable con teclado", () => {
      render(<Card view={view} lang="es" isOnline={() => true} />);
      expectKeyboardOperable();
    });
  });
});
