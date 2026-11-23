import { t } from "../core/i18n.ts";
import { MAP_NAMES } from "../core/maps.ts";
import { MAP_IDS, type Lang, type MapId } from "../core/types.ts";

/**
 * RF-1: selector de mapa (Arabia, Arena, Selva Negra). Es un grupo de radios nativos: con teclado
 * se recorre con las flechas. Los radios se ocultan a la vista (no a los lectores) y se ve la etiqueta.
 */
export function MapSelector({ lang, value, onChange }: { lang: Lang; value: MapId; onChange: (map: MapId) => void }) {
  return (
    <fieldset class="map-selector">
      <legend>{t(lang, "mapSelectorLabel")}</legend>
      {MAP_IDS.map((map) => (
        <label key={map}>
          <input
            type="radio"
            class="visually-hidden"
            name="map"
            value={map}
            checked={map === value}
            onChange={() => onChange(map)}
          />
          {MAP_NAMES[map][lang]}
        </label>
      ))}
    </fieldset>
  );
}
