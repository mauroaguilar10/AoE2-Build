import { displayName, t, type MessageKey } from "../core/i18n.ts";
import { cardPath } from "../core/routes.ts";
import type { CivGroups } from "../core/sort.ts";
import type { CivData, CivId, Lang, MapId, Nomenclature } from "../core/types.ts";
import { Link } from "./navigation.tsx";
import { shieldUrl } from "./shields.ts";

interface CivGridProps {
  civs: Record<CivId, CivData>;
  groups: CivGroups;
  map: MapId;
  lang: Lang;
  nomenclature: Nomenclature;
}

/** RF-1, RF-2: cuadrícula en dos grupos; cada civilización enlaza a su tarjeta en el mapa elegido. */
export function CivGrid({ civs, groups, map, lang, nomenclature }: CivGridProps) {
  const group = (id: string, title: MessageKey, ids: CivId[], dataOnly: boolean) =>
    ids.length > 0 && (
      <section class="civ-group" aria-labelledby={id}>
        <h2 id={id}>{t(lang, title)}</h2>
        <ul class="civ-grid">
          {ids.map((civ) => {
            const data = civs[civ];
            if (!data) return null;
            return (
              <li key={civ}>
                <Link href={cardPath(civ, map)} class={dataOnly ? "civ data-only" : "civ"}>
                  {/* Sin carga diferida: en la primera visita la página aún no la controla la copia local,
                      y un escudo diferido iría a la red al bajar por la cuadrícula (NFR Rapidez, RF-38). */}
                  <img src={shieldUrl(data.shield)} alt="" width={48} height={48} />
                  <span class="civ-name">{displayName(data.name, lang, nomenclature)}</span>
                  {dataOnly && <span class="badge"> {t(lang, "dataOnlyBadge")}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <>
      {group("group-with-card", "withCardGroup", groups.withCard, false)}
      {group("group-data-only", "dataOnlyGroup", groups.dataOnly, true)}
    </>
  );
}
