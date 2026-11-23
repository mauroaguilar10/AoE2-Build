/**
 * Rutas de la app (RF-10, RF-11):
 *   /                          pantalla principal
 *   /civ/<civ>?map=<mapa>      tarjeta de una civilización en un mapa
 * La dirección identifica solo civilización y mapa; nunca el idioma ni la nomenclatura,
 * para que quien la abra la vea en los suyos.
 */
import { MAP_IDS, type CivId, type MapId } from "./types.ts";

export type Route =
  | { kind: "home" }
  /** `map: null` si la dirección no lo indica: se usa el mapa seleccionado en la pantalla principal (RF-3). */
  | { kind: "card"; civ: CivId; map: MapId | null }
  /** RF-11: civilización o mapa inexistente, o ruta desconocida → pantalla principal con aviso. */
  | { kind: "notFound" };

const CARD_PATH = /^\/civ\/([^/]+)\/?$/;
const NOT_FOUND: Route = { kind: "notFound" };

/** RF-10: dirección compartible de una tarjeta, p. ej. "/civ/franks?map=arena". */
export function cardPath(civ: CivId, map: MapId): string {
  return `/civ/${encodeURIComponent(civ.toLowerCase())}?map=${map}`;
}

/** Interpreta `location.pathname` y `location.search` con las civilizaciones del juego. */
export function parseRoute(pathname: string, search: string, civIds: readonly CivId[]): Route {
  if (pathname === "/" || pathname === "") return { kind: "home" };

  const match = CARD_PATH.exec(pathname);
  if (!match?.[1]) return NOT_FOUND;

  let slug: string;
  try {
    slug = decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return NOT_FOUND;
  }
  const civ = civIds.find((id) => id.toLowerCase() === slug);
  if (!civ) return NOT_FOUND;

  const mapParam = new URLSearchParams(search).get("map");
  if (mapParam === null) return { kind: "card", civ, map: null };
  const map = MAP_IDS.find((id) => id === mapParam.toLowerCase());
  return map ? { kind: "card", civ, map } : NOT_FOUND;
}
