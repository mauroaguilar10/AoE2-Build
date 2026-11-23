/**
 * Buscador de civilizaciones (RF-5, RF-6): compara el texto sin mayúsculas ni tildes contra
 * los tres nombres oficiales a la vez (inglés, Latinoamérica y España), sea cual sea el idioma activo.
 */
import type { CivData, CivId } from "./types.ts";

const COMBINING_MARKS = /\p{M}/gu;

/** Minúsculas y sin tildes ni diacríticos (NFD): "Españoles" → "espanoles". */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();
}

/**
 * Civilizaciones de `ids` cuyo nombre contiene el texto, en el mismo orden en que llegan
 * (el de la cuadrícula). Con el buscador vacío no se filtra nada; sin coincidencias, lista vacía (RF-6).
 */
export function filterCivs(
  ids: readonly CivId[],
  civs: Record<CivId, Pick<CivData, "name">>,
  query: string,
): CivId[] {
  const needle = normalizeSearch(query);
  if (needle === "") return [...ids];
  return ids.filter((id) => {
    const name = civs[id]?.name;
    return name !== undefined && [name.en, name.mx, name.es].some((n) => normalizeSearch(n).includes(needle));
  });
}
