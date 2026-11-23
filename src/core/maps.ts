import type { CuratedText, MapId } from "./types.ts";

/** Nombre de los mapas de esta iteración en cada idioma de la interfaz. */
export const MAP_NAMES: Record<MapId, CuratedText> = {
  arabia: { es: "Arabia", en: "Arabia" },
  arena: { es: "Arena", en: "Arena" },
  black_forest: { es: "Selva Negra", en: "Black Forest" },
};
