import { t } from "../core/i18n.ts";
import type { Lang } from "../core/types.ts";

/** RF-20: control ES/EN. Muestra el idioma al que se cambia ("EN" estando en español). */
export function LangToggle({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  return (
    <button
      type="button"
      class="lang-toggle"
      aria-label={t(lang, "langToggleLabel")}
      onClick={() => onChange(lang === "es" ? "en" : "es")}
    >
      {t(lang, "langToggleTarget")}
    </button>
  );
}
