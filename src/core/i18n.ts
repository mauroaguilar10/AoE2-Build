/**
 * Idioma de la app (RF-21, RF-22, RF-24).
 *  - Textos de interfaz: content/ui/{es,en}.json, con las mismas claves en ambos (constitución §6).
 *  - Nombres oficiales del juego: en inglés, siempre `en`; en español, la nomenclatura elegida (mx/es).
 *  - Idioma inicial: el PREFERIDO del navegador (el primero de la lista); español si es cualquier
 *    variante de español, inglés en cualquier otro caso.
 *
 * El aviso legal (legalNotice) es el texto de la plantilla oficial de Microsoft y no se traduce.
 */
import es from "../../content/ui/es.json" with { type: "json" };
import en from "../../content/ui/en.json" with { type: "json" };
import type { GameLocale, GameText, Lang, Nomenclature } from "./types.ts";

export type MessageKey = keyof typeof es;
export type Messages = Record<MessageKey, string>;

export const MESSAGES: Record<Lang, Messages> = { es, en };

export const DEFAULT_LANG: Lang = "en";
export const DEFAULT_NOMENCLATURE: Nomenclature = "mx";

/** RF-22: idioma inicial a partir de navigator.languages (el primero es el preferido). */
export function detectInitialLang(preferred: readonly string[]): Lang {
  const first = preferred[0]?.toLowerCase() ?? "";
  return first === "es" || first.startsWith("es-") ? "es" : DEFAULT_LANG;
}

/** Variante de los textos oficiales del juego para un idioma y nomenclatura. */
export function gameLocale(lang: Lang, nomenclature: Nomenclature): GameLocale {
  return lang === "en" ? "en" : nomenclature;
}

/**
 * RF-24: nombre oficial en el idioma activo (en español, según la nomenclatura), TAL CUAL.
 * Úsalo dentro de frases: la traducción de España escribe muchos nombres en minúscula
 * ("guerrillero"), que es lo correcto en mitad de un texto.
 */
export function officialName(text: GameText, lang: Lang, nomenclature: Nomenclature): string {
  return text[gameLocale(lang, nomenclature)];
}

/** Nombre oficial para mostrarlo solo (listas, etiquetas): primera letra en mayúscula. */
export function displayName(text: GameText, lang: Lang, nomenclature: Nomenclature): string {
  const name = officialName(text, lang, nomenclature);
  return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
}

/** Texto de interfaz con parámetros {nombre}. Falla si falta un parámetro, para no mostrar "{patch}". */
export function t(lang: Lang, key: MessageKey, params: Record<string, string | number> = {}): string {
  return MESSAGES[lang][key].replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Falta el parámetro {${name}} en el texto "${key}"`);
    return String(value);
  });
}
