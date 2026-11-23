// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import { parseCard } from "../../tools/lib/card-schema";
import { toPublished } from "../../tools/lib/content";
import type { KeyValueStore } from "../../src/core/storage";
import type { CivId, GameDataset, MapId, PublishedCard } from "../../src/core/types";

const ROOT = join(import.meta.dirname, "..", "..");
const game = JSON.parse(readFileSync(join(ROOT, "data", "game.json"), "utf8")) as GameDataset;
const FILE = "franks.arabia.1v1.yaml";
const franksArabia = toPublished(parseCard(readFileSync(join(ROOT, "tests", "fixtures", "cards", FILE), "utf8"), FILE), true);

function memoryStore(): KeyValueStore {
  const data: Record<string, string> = {};
  return { getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
}

interface Options {
  map?: MapId;
  cards?: PublishedCard[];
  lang?: string;
  online?: boolean;
}

function renderCard(civ: CivId, { map = "arabia", cards = [franksArabia], lang = "es-AR", online = true }: Options = {}) {
  render(
    <App
      game={game}
      cards={cards}
      route={{ kind: "card", civ, map }}
      store={memoryStore()}
      browserLanguages={[lang]}
      isOnline={() => online}
    />,
  );
}

const section = (name: string) => screen.getByRole("region", { name });

afterEach(cleanup);

describe("T25 tarjeta: datos del juego y enlace externo", () => {
  describe("RF-17 secciones de datos del juego", () => {
    it("RF-17 nombre, escudo y especialidad en la cabecera de la tarjeta", () => {
      renderCard("Armenians");
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Armenios");
      const card = screen.getByRole("article");
      expect(card.querySelector("img")?.getAttribute("src")).toMatch(/armenians\.png$/);
      expect(card.textContent).toContain(game.civs.Armenians!.specialty.mx);
    });

    it("RF-17 bonificaciones de civilización y bonificación de equipo", () => {
      renderCard("Armenians");
      const bonuses = within(section("Bonificaciones")).getAllByRole("listitem");
      expect(bonuses).toHaveLength(game.civs.Armenians!.bonuses.mx.length);
      expect(section("Bonificación de equipo").textContent).toContain("La infantería recibe +2 de campo de visión");
    });

    it("RF-17 unidades únicas con su coste", () => {
      renderCard("Armenians");
      const units = within(section("Unidades únicas"))
        .getAllByRole("listitem")
        .map((li) => [li.querySelector(".name")?.textContent, li.querySelector(".cost")?.textContent]);
      expect(units).toEqual([
        ["Arqueros con arco compuesto (Arqueros a pie)", "35 madera · 45 oro"],
        ["Sacerdotes guerreros (Infantería)", "40 comida · 50 oro"],
      ]);
    });

    it("RF-17 una unidad única sin coste conocido se muestra sin coste", () => {
      renderCard("Tupi");
      const units = within(section("Unidades únicas")).getAllByRole("listitem");
      const ombu = units.find((li) => li.textContent?.startsWith("Arquero ombú tupí"));
      expect(ombu?.querySelector(".name")?.textContent).toBe("Arquero ombú tupí (arquero a pie)");
      expect(ombu?.querySelector(".cost")).toBeNull();
    });

    it("RF-17 tecnologías únicas de Castillos e Imperial con nombre, coste y efecto", () => {
      renderCard("Armenians");
      const techs = within(section("Tecnologías únicas")).getAllByRole("listitem");
      expect(techs).toHaveLength(2);
      expect(techs[0]?.textContent).toMatch(/^Castillos/);
      expect(techs[0]?.textContent).toContain("Flota ciliciana");
      expect(techs[1]?.textContent).toMatch(/^Imperial/);
      expect(techs[1]?.textContent).toContain("Feretorios");
      for (const tech of techs) expect(tech.textContent).toMatch(/\d+ (comida|madera|oro|piedra)/);
      expect(techs[0]?.querySelector(".effect")?.textContent).not.toBe("");
    });

    it("RF-17 edificios propios con coste y descripción cuando la civilización los tiene", () => {
      renderCard("Armenians");
      const buildings = within(section("Edificios propios")).getAllByRole("listitem");
      expect(buildings.map((li) => li.querySelector(".name")?.textContent)).toEqual(["Carreta de mulas", "Iglesia fortificada"]);
      expect(buildings[0]?.textContent).toContain("20 comida · 80 madera");
      expect(buildings[0]?.textContent).toContain("Punto de entrega móvil");
    });

    it("RF-17 sin edificios propios la sección no aparece", () => {
      renderCard("Franks");
      expect(screen.queryByRole("region", { name: "Edificios propios" })).toBeNull();
    });

    it("RF-21 los mismos datos en inglés", () => {
      renderCard("Armenians", { lang: "en-US" });
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Armenians");
      expect(within(section("Unique technologies")).getAllByRole("listitem")[0]?.textContent).toMatch(/^Castle/);
    });
  });

  describe("RF-16 civilización sin ficha táctica", () => {
    const MESSAGE = "Ficha táctica aún no disponible para esta civilización";

    it("RF-16 muestra el mensaje y los datos del juego", () => {
      renderCard("Armenians");
      expect(screen.getByText(MESSAGE)).toBeTruthy();
      expect(section("Bonificaciones")).toBeTruthy();
    });

    it("RF-16 una civilización con ficha en otro mapa también muestra el mensaje en este", () => {
      renderCard("Franks", { map: "arena" });
      expect(screen.getByText(MESSAGE)).toBeTruthy();
    });

    it("RF-16 con ficha para este mapa, el mensaje no aparece", () => {
      renderCard("Franks", { map: "arabia" });
      expect(screen.queryByText(MESSAGE)).toBeNull();
    });
  });

  describe("RF-18, RF-19 enlace al árbol tecnológico", () => {
    const link = () => screen.getByRole("link", { name: "Ver árbol tecnológico completo" });

    it("RF-18 enlace al árbol de la civilización en aoe2techtree.net", () => {
      renderCard("Armenians");
      expect(link().getAttribute("href")).toBe("https://aoe2techtree.net/#Armenians");
    });

    it("RF-18 con conexión abre el enlace (no se cancela) y no hay aviso", () => {
      renderCard("Armenians", { online: true });
      expect(fireEvent.click(link())).toBe(true);
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("RF-19 sin conexión muestra el aviso en lugar de abrirlo, y el enlace sigue visible", () => {
      renderCard("Armenians", { online: false });
      expect(fireEvent.click(link())).toBe(false); // navegación cancelada
      expect(screen.getByRole("alert").textContent).toBe("Necesitas conexión para ver el árbol completo");
      expect(link()).toBeTruthy();
    });

    it("RF-19 el aviso desaparece si, ya con conexión, se vuelve a pulsar", () => {
      let online = false;
      render(
        <App
          game={game}
          cards={[]}
          route={{ kind: "card", civ: "Armenians", map: "arabia" }}
          store={memoryStore()}
          browserLanguages={["es"]}
          isOnline={() => online}
        />,
      );
      fireEvent.click(link());
      online = true;
      fireEvent.click(link());
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });
});
