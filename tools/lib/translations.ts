/**
 * Resolución de textos oficiales del juego en sus 3 variantes con respaldo (RF-35,
 * constitución §6 enmienda 1): si a un texto importado le falta una variante, se usa la
 * más cercana disponible, NO se bloquea la publicación y se informa al mantenedor.
 */
import type { GameLocale, GameText, RawStrings } from "../../src/core/types.ts";

/** Orden de respaldo por variante: primero la otra variante de español, después inglés. */
export const FALLBACK_ORDER: Record<GameLocale, readonly GameLocale[]> = {
  mx: ["es", "en"],
  es: ["mx", "en"],
  en: ["mx", "es"],
};

const LOCALES: readonly GameLocale[] = ["en", "es", "mx"];

export interface MissingTranslation {
  stringId: string;
  /** Variante que falta. */
  locale: GameLocale;
  /** Variante que se usó en su lugar. */
  usedLocale: GameLocale;
  /** Dónde se usa el texto, p. ej. "civ Franks: name". */
  context: string;
}

export class TranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationError";
  }
}

/** Acumula las traducciones faltantes de toda una importación. */
export class TranslationReport {
  readonly entries: MissingTranslation[] = [];

  add(entry: MissingTranslation): void {
    this.entries.push(entry);
  }

  /** Forma que se guarda en data/reports/missing-translations.json. */
  toJSON(): { count: number; missing: MissingTranslation[] } {
    return { count: this.entries.length, missing: this.entries };
  }

  /** Resumen legible para la consola. */
  summary(): string {
    const count = this.entries.length;
    if (count === 0) return "Sin traducciones faltantes.";
    const title = count === 1 ? "1 traducción faltante" : `${count} traducciones faltantes`;
    const lines = this.entries.map((e) => `  ${e.locale} ← ${e.usedLocale} · ${e.stringId} · ${e.context}`);
    return [`${title} (se usó la variante más cercana):`, ...lines].join("\n");
  }
}

function lookup(strings: Record<GameLocale, RawStrings>, locale: GameLocale, stringId: string): string | undefined {
  const value = strings[locale][stringId];
  return value !== undefined && value.trim().length > 0 ? value : undefined;
}

/**
 * Devuelve el texto de `stringId` en las 3 variantes. Si falta alguna, usa la más cercana
 * según FALLBACK_ORDER y lo anota en `report`. Solo falla si no existe en ninguna variante.
 */
export function resolveGameText(
  stringId: string,
  strings: Record<GameLocale, RawStrings>,
  report: TranslationReport,
  context: string,
): GameText {
  const result = {} as GameText;
  for (const locale of LOCALES) {
    const own = lookup(strings, locale, stringId);
    if (own !== undefined) {
      result[locale] = own;
      continue;
    }
    const usedLocale = FALLBACK_ORDER[locale].find((candidate) => lookup(strings, candidate, stringId) !== undefined);
    if (usedLocale === undefined) {
      throw new TranslationError(`El texto ${stringId} no existe en ninguna variante (${context})`);
    }
    result[locale] = lookup(strings, usedLocale, stringId)!;
    report.add({ stringId, locale, usedLocale, context });
  }
  return result;
}
