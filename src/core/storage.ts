/**
 * Preferencias del usuario en el almacenamiento local (RF-3, RF-9, RF-23).
 * El almacenamiento puede no existir o lanzar errores (modo privado, cuota llena, cookies
 * bloqueadas): en ese caso se usan los valores por defecto y la app sigue funcionando.
 */
import { DEFAULT_NOMENCLATURE, detectInitialLang } from "./i18n.ts";
import { MAP_IDS, type MapId, type Preferences } from "./types.ts";

/** Lo que se usa de `localStorage`; en los tests, un almacenamiento en memoria. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PREFS_KEY = "guia-age:prefs";
const DEFAULT_MAP: MapId = "arabia";

/** `localStorage`, o null si el navegador no deja acceder a él. */
export function browserStore(host: { readonly localStorage: Storage } = globalThis as unknown as Window): KeyValueStore | null {
  try {
    return host.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Preferencias guardadas, valor por valor: lo que falte o no sea válido toma su valor por defecto
 * (idioma del navegador — RF-22 —, nomenclatura de Latinoamérica, Arabia y sin última tarjeta).
 */
export function loadPreferences(store: KeyValueStore | null, browserLanguages: readonly string[]): Preferences {
  const saved = readSaved(store);
  const lastCard = isRecord(saved.lastCard) ? saved.lastCard : {};
  return {
    lang: saved.lang === "es" || saved.lang === "en" ? saved.lang : detectInitialLang(browserLanguages),
    nomenclature: saved.nomenclature === "mx" || saved.nomenclature === "es" ? saved.nomenclature : DEFAULT_NOMENCLATURE,
    lastMap: isMap(saved.lastMap) ? saved.lastMap : DEFAULT_MAP,
    lastCard:
      typeof lastCard.civ === "string" && lastCard.civ !== "" && isMap(lastCard.map)
        ? { civ: lastCard.civ, map: lastCard.map }
        : null,
  };
}

/** Guarda las preferencias; si el almacenamiento falla, no hace nada. */
export function savePreferences(store: KeyValueStore | null, preferences: Preferences): void {
  try {
    store?.setItem(PREFS_KEY, JSON.stringify(preferences));
  } catch {
    // Sin almacenamiento disponible: las preferencias duran lo que dure la visita.
  }
}

function readSaved(store: KeyValueStore | null): Record<string, unknown> {
  try {
    const raw = store?.getItem(PREFS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMap(value: unknown): value is MapId {
  return MAP_IDS.includes(value as MapId);
}
