import { t } from "../core/i18n.ts";
import type { Lang, Nomenclature } from "../core/types.ts";

interface NomenclatureSelectProps {
  lang: Lang;
  value: Nomenclature;
  onChange: (nomenclature: Nomenclature) => void;
}

/**
 * RF-24: nombres oficiales de Latinoamérica (por defecto) o de España. Solo tiene sentido en español:
 * quien lo usa no lo muestra en inglés. Cambia los nombres oficiales, no el texto táctico.
 */
export function NomenclatureSelect({ lang, value, onChange }: NomenclatureSelectProps) {
  return (
    <label class="nomenclature">
      {/* Oculta a la vista para que la cabecera quepa en una línea en el móvil; los lectores la leen. */}
      <span class="visually-hidden">{t(lang, "nomenclatureLabel")}</span>
      <select value={value} title={t(lang, "nomenclatureLabel")} onChange={(event) => onChange(event.currentTarget.value === "es" ? "es" : "mx")}>
        <option value="mx">{t(lang, "nomenclatureMx")}</option>
        <option value="es">{t(lang, "nomenclatureEs")}</option>
      </select>
    </label>
  );
}
