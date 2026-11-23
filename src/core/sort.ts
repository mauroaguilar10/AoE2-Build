/**
 * Orden de la cuadrícula (RF-2, RF-4): primero las civilizaciones con ficha táctica y después
 * las de solo datos; dentro de cada grupo, orden alfabético del idioma activo (Intl.Collator)
 * aplicado al nombre según la nomenclatura activa.
 */
import type { CivData, CivId, Lang, Nomenclature } from "./types.ts";
import { officialName } from "./i18n.ts";

export interface CivGroups {
  withCard: CivId[];
  dataOnly: CivId[];
}

export function groupAndSortCivs(
  civs: Record<CivId, Pick<CivData, "name">>,
  withCard: Iterable<CivId>,
  lang: Lang,
  nomenclature: Nomenclature,
): CivGroups {
  const collator = new Intl.Collator(lang, { sensitivity: "base" });
  const names = new Map(Object.entries(civs).map(([id, civ]) => [id, officialName(civ.name, lang, nomenclature)]));
  const byName = (a: CivId, b: CivId) => collator.compare(names.get(a) ?? a, names.get(b) ?? b);

  const cardSet = new Set(withCard);
  const ids = [...names.keys()];
  return {
    // Una civilización con ficha que un parche eliminó del juego no aparece.
    withCard: ids.filter((id) => cardSet.has(id)).sort(byName),
    dataOnly: ids.filter((id) => !cardSet.has(id)).sort(byName),
  };
}
