import { useMemo } from "preact/hooks";
import { displayName, t } from "../core/i18n.ts";
import { MAP_NAMES } from "../core/maps.ts";
import { cardPath } from "../core/routes.ts";
import { CARD_CIVS } from "../core/scope.ts";
import { filterCivs } from "../core/search.ts";
import { groupAndSortCivs } from "../core/sort.ts";
import type { GameDataset, Lang, MapId, Nomenclature, Preferences } from "../core/types.ts";
import { CivGrid } from "./CivGrid.tsx";
import { MapSelector } from "./MapSelector.tsx";
import { Link } from "./navigation.tsx";
import { SearchBox } from "./SearchBox.tsx";

interface HomeProps {
  game: GameDataset;
  lang: Lang;
  nomenclature: Nomenclature;
  /** RF-3: Arabia en la primera visita; después, el último mapa usado. */
  map: MapId;
  onMapChange: (map: MapId) => void;
  /** Texto del buscador: lo guarda App para conservarlo al cambiar de idioma (RF-21). */
  query: string;
  onQueryChange: (query: string) => void;
  /** RF-9: última tarjeta consultada. */
  lastCard: Preferences["lastCard"];
  /** RF-11: se llegó desde una dirección con civilización o mapa inexistente. */
  notFound: boolean;
}

/** Pantalla principal: selector de mapa, buscador y cuadrícula de civilizaciones (RF-1 a RF-6, RF-9, RF-11). */
export function Home({ game, lang, nomenclature, map, onMapChange, query, onQueryChange, lastCard, notFound }: HomeProps) {
  // RF-4: el orden depende del idioma y la nomenclatura; se recalcula al cambiarlos.
  const groups = useMemo(() => groupAndSortCivs(game.civs, CARD_CIVS, lang, nomenclature), [game, lang, nomenclature]);
  // RF-5: el filtro conserva el orden de cada grupo.
  const visible = {
    withCard: filterCivs(groups.withCard, game.civs, query),
    dataOnly: filterCivs(groups.dataOnly, game.civs, query),
  };
  const empty = visible.withCard.length === 0 && visible.dataOnly.length === 0;
  // RF-9: solo si la civilización sigue existiendo en los datos del juego.
  const lastCiv = lastCard ? game.civs[lastCard.civ] : undefined;

  return (
    <>
      {/* Título de la pantalla para lectores de pantalla y destino del foco al navegar. */}
      <h1 class="visually-hidden" tabIndex={-1}>
        {t(lang, "appTagline")}
      </h1>
      {notFound && (
        <p role="alert" class="notice">
          {t(lang, "cardNotFound")}
        </p>
      )}
      {lastCard && lastCiv && (
        <p class="continue">
          <Link href={cardPath(lastCard.civ, lastCard.map)}>
            {t(lang, "continueLast", {
              civ: displayName(lastCiv.name, lang, nomenclature),
              map: MAP_NAMES[lastCard.map][lang],
            })}
          </Link>
        </p>
      )}
      <MapSelector lang={lang} value={map} onChange={onMapChange} />
      <SearchBox lang={lang} value={query} onChange={onQueryChange} />
      {/* RF-6: siempre presente para que los lectores de pantalla anuncien el cambio. */}
      <p role="status" class="search-status">
        {empty ? t(lang, "noResults") : ""}
      </p>
      <CivGrid civs={game.civs} groups={visible} map={map} lang={lang} nomenclature={nomenclature} />
    </>
  );
}
