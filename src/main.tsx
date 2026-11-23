import { render } from "preact";
import game from "../data/game.json" with { type: "json" };
import { parseRoute } from "./core/routes.ts";
import { registerServiceWorker } from "./platform/sw.ts";
import { browserStore } from "./core/storage.ts";
import type { GameDataset, PublishedCard } from "./core/types.ts";
import { App } from "./ui/App.tsx";
import "./ui/styles.css";

// Fichas compiladas por tools/build-content.ts (archivo generado, fuera de Git).
// Con glob, un clon recién descargado pasa el lint aunque todavía no exista.
const generated = import.meta.glob<PublishedCard[]>("./generated/cards.json", { eager: true, import: "default" });
const cards = generated["./generated/cards.json"];
if (!cards) throw new Error("Falta src/generated/cards.json: ejecuta `npm run dev` o `npm run build`.");

registerServiceWorker();

const dataset = game as GameDataset;
document.documentElement.dataset.build = __BUILD_ID__;
// RF-39: si el aviso de primera carga sin conexión llegó a mostrarse (p. ej. fallaron los estilos), la app lo quita.
document.getElementById("first-load-offline")?.setAttribute("hidden", "");

const root = document.getElementById("app");
if (root) {
  render(
    <App
      game={dataset}
      cards={cards}
      route={parseRoute(location.pathname, location.search, Object.keys(dataset.civs))}
      store={browserStore()}
      browserLanguages={navigator.languages}
    />,
    root,
  );
}
