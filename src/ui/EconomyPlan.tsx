import { useState } from "preact/hooks";
import type { TacticalView } from "../core/card-view.ts";
import { t } from "../core/i18n.ts";
import type { Lang, VillagerSplit } from "../core/types.ts";
import { RichText } from "./RichText.tsx";

const RESOURCES = ["food", "wood", "gold", "stone"] as const;

/** Reparto de aldeanos con los cuatro recursos, también los que están a cero. */
function split(villagers: VillagerSplit, lang: Lang): string {
  return RESOURCES.map((resource) => `${villagers[resource]} ${t(lang, resource)}`).join(" · ");
}

/** RF-12: plan de economía resumido. RF-13: build order paso a paso, plegado por defecto. */
export function EconomyPlan({ economy, lang }: { economy: TacticalView["economy"]; lang: Lang }) {
  const [open, setOpen] = useState(false);

  return (
    <section aria-labelledby="economy" class="economy">
      <h2 id="economy">{t(lang, "economyTitle")}</h2>
      <p>
        <strong class="label">{t(lang, "openingLabel")}</strong> <RichText segments={economy.opening} />
      </p>
      <p>{t(lang, "ageUpLabel", economy.ageUpPop)}</p>
      <p class="label">{t(lang, "villagersLabel")}</p>
      <ul class="villagers">
        <li>
          {t(lang, "feudalAge")}: {split(economy.villagers.feudal, lang)}
        </li>
        <li>
          {t(lang, "castleAge")}: {split(economy.villagers.castle, lang)}
        </li>
      </ul>

      <button type="button" class="toggle" aria-expanded={open} aria-controls="build-order" onClick={() => setOpen(!open)}>
        {t(lang, open ? "buildOrderHide" : "buildOrderShow")}
      </button>
      {open && (
        <ol id="build-order" class="build-order" aria-label="Build order">
          {economy.buildOrder.map((step, i) => (
            <li key={i}>
              <span class="pop">{step.pop}</span> <RichText segments={step.text} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
