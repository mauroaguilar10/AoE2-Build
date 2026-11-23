import { t } from "./i18n.ts";
import type { Cost, Lang } from "./types.ts";

const RESOURCES = ["food", "wood", "gold", "stone"] as const;

/** RF-17: "55 comida · 25 oro" — solo los recursos con coste, en orden fijo. */
export function formatCost(cost: Cost, lang: Lang): string {
  return RESOURCES.filter((resource) => cost[resource] > 0)
    .map((resource) => `${cost[resource]} ${t(lang, resource)}`)
    .join(" · ");
}
