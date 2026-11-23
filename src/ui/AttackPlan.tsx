import type { ComponentChildren } from "preact";
import type { NamedEntity, TacticalView } from "../core/card-view.ts";
import { t, type MessageKey } from "../core/i18n.ts";
import type { Lang } from "../core/types.ts";
import { RichText } from "./RichText.tsx";

function Row({ id, label, lang, children }: { id: string; label: MessageKey; lang: Lang; children: ComponentChildren }) {
  return (
    <p data-row={id}>
      <strong class="label">{t(lang, label)}</strong> {children}
    </p>
  );
}

const names = (entities: NamedEntity[]) => entities.map((entity) => entity.name).join(", ");

/** RF-14: un único plan de ataque. Las filas sin unidades (p. ej. sin apoyo) no se muestran. */
export function AttackPlan({ attack, lang }: { attack: TacticalView["attack"]; lang: Lang }) {
  const { transition } = attack;
  return (
    <section aria-labelledby="attack" class="attack">
      <h2 id="attack">{t(lang, "attackTitle")}</h2>
      <Row id="when" label="whenLabel" lang={lang}>
        <RichText segments={attack.when} />
      </Row>
      {attack.core.length > 0 && (
        <Row id="core" label="coreLabel" lang={lang}>
          {names(attack.core)}
        </Row>
      )}
      {attack.support.length > 0 && (
        <Row id="support" label="supportLabel" lang={lang}>
          {names(attack.support)}
        </Row>
      )}
      {(transition.units.length > 0 || transition.note) && (
        <Row id="transition" label="transitionLabel" lang={lang}>
          {names(transition.units)}
          {transition.note && (
            <>
              {transition.units.length > 0 && " — "}
              <RichText segments={transition.note} />
            </>
          )}
        </Row>
      )}
      <ol class="upgrades" aria-label={t(lang, "upgradesLabel")}>
        {attack.upgrades.map((upgrade) => (
          <li key={upgrade.ref}>{upgrade.name}</li>
        ))}
      </ol>
    </section>
  );
}
