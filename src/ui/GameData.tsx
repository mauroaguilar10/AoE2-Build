import type { ComponentChildren } from "preact";
import type { CardView } from "../core/card-view.ts";
import { formatCost } from "../core/format.ts";
import { t, type MessageKey } from "../core/i18n.ts";
import type { Age, Lang } from "../core/types.ts";

const AGE_LABEL: Record<Age, MessageKey> = { dark: "darkAge", feudal: "feudalAge", castle: "castleAge", imperial: "imperialAge" };

/** Subsección con título propio, identificable como región por los lectores de pantalla. */
function Section({ id, title, children }: { id: string; title: string; children: ComponentChildren }) {
  return (
    <section aria-labelledby={id} class="data-section">
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  );
}

/** RF-17: datos automáticos del juego, presentes en todas las civilizaciones. */
export function GameData({ view, lang }: { view: CardView; lang: Lang }) {
  const cost = (value: Parameters<typeof formatCost>[0]) => <span class="cost">{formatCost(value, lang)}</span>;

  return (
    <section aria-labelledby="game-data" class="game-data">
      <h2 id="game-data">{t(lang, "gameDataTitle")}</h2>

      <Section id="bonuses" title={t(lang, "bonusesLabel")}>
        <ul>
          {view.bonuses.map((bonus) => (
            <li key={bonus}>{bonus}</li>
          ))}
        </ul>
      </Section>

      <Section id="team-bonus" title={t(lang, "teamBonusLabel")}>
        <p>{view.teamBonus}</p>
      </Section>

      <Section id="unique-units" title={t(lang, "uniqueUnitsLabel")}>
        <ul>
          {view.uniqueUnits.map((unit) => (
            <li key={unit.name}>
              <span class="name">{unit.name}</span> {unit.cost && cost(unit.cost)}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="unique-techs" title={t(lang, "uniqueTechsLabel")}>
        <ul>
          {view.uniqueTechs.map((tech) => (
            <li key={tech.ref}>
              <span class="age">{t(lang, AGE_LABEL[tech.age])}</span> <span class="name">{tech.name}</span>{" "}
              {cost(tech.cost)} <span class="effect">{tech.effect}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* RF-17: la sección no aparece si la civilización no tiene edificios propios. */}
      {view.ownBuildings.length > 0 && (
        <Section id="own-buildings" title={t(lang, "ownBuildingsLabel")}>
          <ul>
            {view.ownBuildings.map((building) => (
              <li key={building.ref}>
                <span class="name">{building.name}</span> {cost(building.cost)}{" "}
                <span class="description">{building.description}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </section>
  );
}
