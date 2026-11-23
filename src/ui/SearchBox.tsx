import { t } from "../core/i18n.ts";
import type { Lang } from "../core/types.ts";

/** RF-5: buscador de civilizaciones (el filtrado lo hace core/search.ts). */
export function SearchBox({ lang, value, onChange }: { lang: Lang; value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="search"
      class="search-box"
      aria-label={t(lang, "searchLabel")}
      placeholder={t(lang, "searchPlaceholder")}
      value={value}
      onInput={(event) => onChange(event.currentTarget.value)}
      autocomplete="off"
      spellcheck={false}
    />
  );
}
