/**
 * Tarjeta de una civilización en un mapa. Recibe todo por props y no depende de la página
 * que la contiene, para poder mostrarse sola (p. ej. en una ventana flotante en el futuro).
 */
import type { CardView } from "../core/card-view.ts";
import { t } from "../core/i18n.ts";
import type { Lang, MapId } from "../core/types.ts";
import { AttackPlan } from "./AttackPlan.tsx";
import { EconomyPlan } from "./EconomyPlan.tsx";
import { GameData } from "./GameData.tsx";
import { MapSelector } from "./MapSelector.tsx";
import { shieldUrl } from "./shields.ts";
import { TechTreeLink } from "./TechTreeLink.tsx";

interface CardProps {
  view: CardView;
  lang: Lang;
  isOnline: () => boolean;
  /** RF-8: si se indica, la tarjeta ofrece cambiar de mapa sin salir de ella. */
  onMapChange?: (map: MapId) => void;
}

export function Card({ view, lang, isOnline, onMapChange }: CardProps) {
  return (
    <article class="card">
      <div class="card-header">
        <img src={shieldUrl(view.shield)} alt="" width={64} height={64} />
        <h1 tabIndex={-1}>{view.name}</h1>
        <p class="specialty">{view.specialty}</p>
      </div>
      {onMapChange && <MapSelector lang={lang} value={view.map} onChange={onMapChange} />}

      {view.tactical ? (
        <>
          {view.tactical.draft && <p class="badge draft">{t(lang, "draftBadge")}</p>}
          <EconomyPlan economy={view.tactical.economy} lang={lang} />
          <AttackPlan attack={view.tactical.attack} lang={lang} />
        </>
      ) : (
        // RF-16: sin ficha para este mapa, solo el mensaje y los datos del juego.
        <p class="notice no-card">{t(lang, "noTacticalCard")}</p>
      )}

      <GameData view={view} lang={lang} />
      <TechTreeLink civ={view.civ} lang={lang} isOnline={isOnline} />
    </article>
  );
}
