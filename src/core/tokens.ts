/**
 * Referencias a entidades del juego dentro del texto táctico: "[[unit:448]]", "[[tech:199]]".
 * En pantalla se sustituyen por el nombre oficial en el idioma y la nomenclatura activos (RF-25).
 */
import type { EntityRef, GameEntity, Lang, Nomenclature } from "./types.ts";
import { officialName } from "./i18n.ts";

const TOKEN = /\[\[([^\]]*)\]\]/g;
const VALID_REF = /^(unit|tech|building):\d+$/;
/** Lo que precede a un inicio de frase: nada, o un signo de fin de frase / dos puntos (+ espacios). */
const SENTENCE_START = /(^|[.!?:¡¿])\s*$/;

export interface FoundToken {
  /** Texto literal encontrado, p. ej. "[[unit:448]]". */
  raw: string;
  /** Referencia canónica, o null si el contenido no tiene un formato válido. */
  ref: EntityRef | null;
}

/** Trozo de texto listo para pintar: texto normal o nombre de entidad (la UI puede resaltarlo). */
export type TextSegment = { kind: "text"; text: string } | { kind: "entity"; ref: EntityRef; name: string };

function parseRef(inner: string): EntityRef | null {
  const ref = inner.trim();
  return VALID_REF.test(ref) ? (ref as EntityRef) : null;
}

/** Sustituye cada referencia válida por lo que devuelva `nameOf`; las mal escritas se dejan tal cual. */
export function replaceTokens(text: string, nameOf: (ref: EntityRef) => string): string {
  return text.replace(TOKEN, (raw, inner: string) => {
    const ref = parseRef(inner);
    return ref ? nameOf(ref) : raw;
  });
}

export function findTokens(text: string): FoundToken[] {
  return [...text.matchAll(TOKEN)].map((match) => ({ raw: match[0], ref: parseRef(match[1] ?? "") }));
}

/**
 * RF-25: convierte un texto táctico en segmentos con el nombre oficial de cada entidad.
 * Dentro de la frase el nombre va tal cual (la traducción de España usa minúsculas);
 * al inicio de una frase, con la primera letra en mayúscula.
 * Referencias mal escritas o desconocidas se dejan como texto (el build ya las habría rechazado).
 */
export function resolveText(
  text: string,
  entities: Record<EntityRef, GameEntity>,
  lang: Lang,
  nomenclature: Nomenclature,
): TextSegment[] {
  const segments: TextSegment[] = [];
  let rendered = "";

  const pushText = (value: string) => {
    if (value === "") return;
    rendered += value;
    const last = segments[segments.length - 1];
    if (last?.kind === "text") last.text += value;
    else segments.push({ kind: "text", text: value });
  };

  let cursor = 0;
  for (const match of text.matchAll(TOKEN)) {
    pushText(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const ref = parseRef(match[1] ?? "");
    const entity = ref ? entities[ref] : undefined;
    if (!ref || !entity) {
      pushText(match[0]);
      continue;
    }
    let name = officialName(entity.name, lang, nomenclature);
    if (SENTENCE_START.test(rendered)) name = name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
    rendered += name;
    segments.push({ kind: "entity", ref, name });
  }
  pushText(text.slice(cursor));
  return segments;
}

/** Texto plano de unos segmentos (para etiquetas accesibles, títulos, etc.). */
export function segmentsToString(segments: TextSegment[]): string {
  return segments.map((segment) => (segment.kind === "text" ? segment.text : segment.name)).join("");
}
