import { t } from "../core/i18n.ts";
import type { Lang } from "../core/types.ts";

/** Página oficial de las Microsoft Game Content Usage Rules: el aviso debe enlazarla (RF-41). */
export const GAME_CONTENT_RULES_URL = "https://www.xbox.com/en-us/developers/rules";

/** Pie de todas las pantallas: parche de los datos (RF-26) y aviso legal con enlace a las reglas (RF-41). */
export function Footer({ lang, patch }: { lang: Lang; patch: string }) {
  return (
    <footer class="app-footer">
      <p>{t(lang, "gamePatch", { patch })}</p>
      <p lang="en">
        {t(lang, "legalNotice")}{" "}
        <a href={GAME_CONTENT_RULES_URL} target="_blank" rel="noopener noreferrer">
          {t(lang, "legalRulesLink")}
        </a>
      </p>
    </footer>
  );
}
