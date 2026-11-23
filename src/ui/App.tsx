/**
 * Estructura de la app: cabecera con el control ES/EN (RF-20), la pantalla de la ruta actual
 * y el pie con el parche y el aviso legal (RF-26, RF-41).
 * La ruta vive en el estado: navegar cambia la dirección con el historial del navegador,
 * sin recargar la página (RF-7, RF-8, RF-10).
 */
import { useEffect, useRef, useState } from "preact/hooks";
import { buildCardView } from "../core/card-view.ts";
import { t } from "../core/i18n.ts";
import { cardPath, parseRoute, type Route } from "../core/routes.ts";
import { loadPreferences, savePreferences, type KeyValueStore } from "../core/storage.ts";
import type { CivId, GameDataset, Lang, MapId, Preferences, PublishedCard } from "../core/types.ts";
import { Card } from "./Card.tsx";
import { Footer } from "./Footer.tsx";
import { Home } from "./Home.tsx";
import { LangToggle } from "./LangToggle.tsx";
import { Link, NavigationContext, type Navigate } from "./navigation.tsx";
import { NomenclatureSelect } from "./NomenclatureSelect.tsx";

export interface AppProps {
  game: GameDataset;
  cards: readonly PublishedCard[];
  /** Ruta de la dirección con la que se abrió la app. */
  route: Route;
  store: KeyValueStore | null;
  /** `navigator.languages`: decide el idioma de la primera visita (RF-22). */
  browserLanguages: readonly string[];
  /** Estado de la conexión (RF-19); por defecto, `navigator.onLine`. */
  isOnline?: () => boolean;
}

const navigatorOnline = () => navigator.onLine;

export function App({ game, cards, route: initialRoute, store, browserLanguages, isOnline = navigatorOnline }: AppProps) {
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences(store, browserLanguages));
  const [route, setRoute] = useState<Route>(initialRoute);
  // Estado de la vista, separado del idioma: no se pierde al cambiarlo (RF-21).
  const [query, setQuery] = useState("");
  const { lang, nomenclature } = prefs;

  const update = (change: Partial<Preferences>) =>
    setPrefs((current) => {
      const next = { ...current, ...change };
      savePreferences(store, next); // RF-23
      return next;
    });

  const civIds = Object.keys(game.civs);
  const routeFromLocation = () => parseRoute(location.pathname, location.search, civIds);

  // Al cambiar de pantalla, el foco pasa a su título para que teclado y lectores de pantalla
  // no se queden en un enlace que ya no existe. Cambiar de mapa dentro de la tarjeta no lo mueve.
  const focusTitle = useRef(false);

  const navigate: Navigate = (path, { replace = false } = {}) => {
    if (replace) history.replaceState(null, "", path);
    else history.pushState(null, "", path);
    focusTitle.current = !replace;
    setRoute(routeFromLocation());
    if (!replace) window.scrollTo?.(0, 0);
  };

  // Botones Atrás/Adelante del navegador.
  useEffect(() => {
    const onPopState = () => {
      focusTitle.current = true;
      setRoute(routeFromLocation());
    };
    addEventListener("popstate", onPopState);
    return () => removeEventListener("popstate", onPopState);
  }, [game]);

  useEffect(() => {
    if (!focusTitle.current) return;
    focusTitle.current = false;
    document.querySelector<HTMLElement>("main h1")?.focus();
  }, [route]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Sin mapa en la dirección, la tarjeta usa el último mapa usado (RF-3).
  const cardMap: MapId | null = route.kind === "card" ? (route.map ?? prefs.lastMap) : null;
  const cardCiv: CivId | null = route.kind === "card" ? route.civ : null;

  // RF-9 y RF-3: la tarjeta consultada pasa a ser la última, y su mapa, el último usado.
  useEffect(() => {
    if (cardCiv && cardMap) update({ lastCard: { civ: cardCiv, map: cardMap }, lastMap: cardMap });
  }, [cardCiv, cardMap]);

  return (
    <NavigationContext.Provider value={navigate}>
      <header class="app-header">
        <Link href="/" class="app-name">
          {t(lang, "appName")}
        </Link>
        <LangToggle lang={lang} onChange={(next: Lang) => update({ lang: next })} />
        {/* RF-24: solo en español. */}
        {lang === "es" && <NomenclatureSelect lang={lang} value={nomenclature} onChange={(next) => update({ nomenclature: next })} />}
      </header>
      <main class="app-main" data-screen={route.kind}>
        {route.kind === "card" && cardCiv && cardMap ? (
          <CardScreen
            civ={cardCiv}
            map={cardMap}
            game={game}
            cards={cards}
            prefs={prefs}
            isOnline={isOnline}
            // RF-8: cambiar de mapa reemplaza la dirección (Atrás sigue llevando al inicio).
            onMapChange={(map) => navigate(cardPath(cardCiv, map), { replace: true })}
          />
        ) : (
          <Home
            game={game}
            lang={lang}
            nomenclature={nomenclature}
            map={prefs.lastMap}
            onMapChange={(map) => update({ lastMap: map })}
            query={query}
            onQueryChange={setQuery}
            lastCard={prefs.lastCard}
            notFound={route.kind === "notFound"}
          />
        )}
      </main>
      <Footer lang={lang} patch={game.patch} />
    </NavigationContext.Provider>
  );
}

interface CardScreenProps {
  civ: CivId;
  map: MapId;
  game: GameDataset;
  cards: readonly PublishedCard[];
  prefs: Preferences;
  isOnline: () => boolean;
  onMapChange: (map: MapId) => void;
}

/** Pantalla de tarjeta: la tarjeta autónoma más el enlace de vuelta al inicio. */
function CardScreen({ civ, map, game, cards, prefs, isOnline, onMapChange }: CardScreenProps) {
  const { lang, nomenclature } = prefs;
  // La ruta ya validó la civilización contra los datos del juego, así que la vista siempre existe.
  const view = buildCardView({ civ, map, game, cards, lang, nomenclature });
  return (
    <>
      <nav class="breadcrumb">
        <Link href="/">{t(lang, "backToHome")}</Link>
      </nav>
      {view && <Card view={view} lang={lang} isOnline={isOnline} onMapChange={onMapChange} />}
    </>
  );
}
