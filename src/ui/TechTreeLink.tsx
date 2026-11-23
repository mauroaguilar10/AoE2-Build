import { useState } from "preact/hooks";
import { t } from "../core/i18n.ts";
import type { CivId, Lang } from "../core/types.ts";

/** RF-18: árbol tecnológico completo de la civilización (sitio externo). */
export function techTreeUrl(civ: CivId): string {
  return `https://aoe2techtree.net/#${encodeURIComponent(civ)}`;
}

interface TechTreeLinkProps {
  civ: CivId;
  lang: Lang;
  /** Estado de la conexión en el momento de pulsar (en el navegador, `navigator.onLine`). */
  isOnline: () => boolean;
}

/** RF-18, RF-19: siempre visible; sin conexión, en vez de abrirlo muestra un aviso. */
export function TechTreeLink({ civ, lang, isOnline }: TechTreeLinkProps) {
  const [offline, setOffline] = useState(false);

  const onClick = (event: MouseEvent) => {
    const online = isOnline();
    setOffline(!online);
    if (!online) event.preventDefault();
  };

  return (
    <p class="tech-tree">
      <a href={techTreeUrl(civ)} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {t(lang, "techTreeLink")}
      </a>
      {offline && (
        <span role="alert" class="notice">
          {t(lang, "techTreeOffline")}
        </span>
      )}
    </p>
  );
}
