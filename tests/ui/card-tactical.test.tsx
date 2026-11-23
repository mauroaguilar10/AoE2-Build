// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import { parseCard } from "../../tools/lib/card-schema";
import { toPublished } from "../../tools/lib/content";
import type { KeyValueStore } from "../../src/core/storage";
import type { GameDataset, Nomenclature, PublishedCard } from "../../src/core/types";

const ROOT = join(import.meta.dirname, "..", "..");
const game = JSON.parse(readFileSync(join(ROOT, "data", "game.json"), "utf8")) as GameDataset;
const FILE = "franks.arabia.1v1.yaml";
const card = parseCard(readFileSync(join(ROOT, "tests", "fixtures", "cards", FILE), "utf8"), FILE);
const approved = toPublished(card, true);

function storeWith(nomenclature: Nomenclature): KeyValueStore {
  const data: Record<string, string> = { "guia-age:prefs": JSON.stringify({ nomenclature }) };
  return { getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
}

function renderFranks({ lang = "es-AR", nomenclature = "mx" as Nomenclature, cards = [approved] as PublishedCard[] } = {}) {
  render(
    <App
      game={game}
      cards={cards}
      route={{ kind: "card", civ: "Franks", map: "arabia" }}
      store={storeWith(nomenclature)}
      browserLanguages={[lang]}
      isOnline={() => true}
    />,
  );
}

const region = (name: string) => screen.getByRole("region", { name });
const entities = (element: HTMLElement) => [...element.querySelectorAll(".entity")].map((e) => e.textContent);

afterEach(cleanup);

describe("T26 tarjeta: economía, build order y ataque", () => {
  describe("RF-12 plan de economía", () => {
    it("RF-12 apertura, población para subir de edad y reparto de aldeanos en Feudal y Castillos", () => {
      renderFranks();
      const economy = region("Economía");
      expect(economy.textContent).toContain("Scouts (caballería de exploración) en Feudal");
      expect(economy.textContent).toContain("Subir a Feudal con 21 · a Castillos con 29");
      const villagers = within(economy).getAllByRole("listitem").map((li) => li.textContent);
      expect(villagers).toContain("Feudal: 13 comida · 8 madera · 0 oro · 0 piedra");
      expect(villagers).toContain("Castillos: 14 comida · 9 madera · 6 oro · 0 piedra");
    });

    it("RF-12 sin Edad Imperial en el plan de economía", () => {
      renderFranks();
      expect(region("Economía").textContent).not.toContain("Imperial");
    });
  });

  describe("RF-13 build order plegado por defecto", () => {
    const toggle = () => screen.getByRole("button", { name: /build order/ });

    it("RF-13 al abrir la tarjeta el build order está plegado", () => {
      renderFranks();
      expect(toggle().getAttribute("aria-expanded")).toBe("false");
      expect(toggle().textContent).toBe("Ver build order paso a paso");
      expect(screen.queryByText("6 aldeanos a las ovejas")).toBeNull();
    });

    it("RF-13 se despliega con su población en cada paso, y se vuelve a plegar", () => {
      renderFranks();
      fireEvent.click(toggle());
      expect(toggle().getAttribute("aria-expanded")).toBe("true");
      expect(toggle().textContent).toBe("Ocultar build order");
      const steps = within(screen.getByRole("list", { name: "Build order" })).getAllByRole("listitem");
      expect(steps.map((s) => s.querySelector(".pop")?.textContent)).toEqual(["6", "10"]);
      expect(steps[0]?.textContent).toContain("6 aldeanos a las ovejas");

      fireEvent.click(toggle());
      expect(toggle().getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByText("6 aldeanos a las ovejas")).toBeNull();
    });
  });

  describe("RF-14 plan de ataque", () => {
    it("RF-14 cuándo, núcleo, apoyo, transición con nota y mejoras en orden de prioridad", () => {
      renderFranks();
      const attack = region("Ataque");
      const row = (label: string) => attack.querySelector(`[data-row="${label}"]`)?.textContent ?? "";
      expect(row("when")).toContain("Al llegar a Feudal, con 3-4");
      expect(row("core")).toContain("Caballería de exploración");
      expect(row("support")).toContain("Hostigador");
      expect(row("transition")).toContain("Caballero");
      expect(row("transition")).toContain("Pasa a caballeros al llegar a Castillos");
      const upgrades = within(screen.getByRole("list", { name: "Mejoras clave" })).getAllByRole("listitem");
      expect(upgrades.map((li) => li.textContent)).toEqual(["Ganadería", "Forja", "Armadura de Barda de escamas"]);
    });

    it("RF-14 sin apoyo, la fila de apoyo no aparece", () => {
      const noSupport = { ...approved, attack: { ...approved.attack, support: [] } };
      renderFranks({ cards: [noSupport] });
      expect(region("Ataque").querySelector('[data-row="support"]')).toBeNull();
    });
  });

  describe("RF-25 entidades con su nombre oficial", () => {
    it("RF-25 no queda ninguna referencia [[…]] y las entidades del texto van resaltadas", () => {
      renderFranks();
      fireEvent.click(screen.getByRole("button", { name: /build order/ }));
      const card = screen.getByRole("article");
      expect(card.textContent).not.toMatch(/\[\[/);
      expect(entities(region("Ataque"))).toContain("Caballería de exploración");
      expect(entities(region("Economía"))).toContain("Caballería de exploración");
    });

    it("RF-25 con nomenclatura de España: minúscula dentro de la frase, mayúscula sola en una lista", () => {
      renderFranks({ nomenclature: "es" });
      const attack = region("Ataque");
      expect(attack.querySelector('[data-row="when"]')?.textContent).toContain("con 3-4 caballería de exploración");
      expect(attack.querySelector('[data-row="support"]')?.textContent).toContain("Guerrillero");
    });

    it("RF-25 en inglés", () => {
      renderFranks({ lang: "en-US" });
      const attack = region("Attack");
      expect(attack.querySelector('[data-row="when"]')?.textContent).toBe("When On reaching Feudal with 3-4 Scout Cavalry");
      expect(within(screen.getByRole("list", { name: "Key upgrades" })).getAllByRole("listitem")[0]?.textContent).toBe(
        "Husbandry",
      );
    });
  });

  describe("RF-28 (decisión 34) sin aviso de parche", () => {
    it("RF-28 la tarjeta no muestra ningún aviso de parche", () => {
      renderFranks();
      const text = screen.getByRole("article").textContent ?? "";
      expect(text).not.toMatch(/Revisada en el parche|ha habido cambios/);
    });
  });

  describe("fichas en borrador (solo en desarrollo)", () => {
    it('una ficha sin aprobar se marca "BORRADOR"', () => {
      renderFranks({ cards: [toPublished(card, false)] });
      expect(screen.getByText("BORRADOR")).toBeTruthy();
    });

    it("una ficha aprobada no lleva la marca", () => {
      renderFranks();
      expect(screen.queryByText("BORRADOR")).toBeNull();
    });
  });
});
