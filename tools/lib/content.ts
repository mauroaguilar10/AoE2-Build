/**
 * Compilación del contenido táctico: esquema (T9) + integridad (T10) → fichas publicables.
 *
 *  - Errores de formato y de coherencia con el juego (RF-32, RF-33, RF-34) BLOQUEAN siempre.
 *  - Fichas que faltan (RF-36): bloquean en producción; en modo borrador (`allowIncomplete`)
 *    son avisos, para poder desarrollar la app mientras se escribe el contenido.
 *  - Aprobación (T12): si se pasan `reviews`, cada ficha debe estar aprobada y sin cambios desde
 *    su aprobación; bloquea en producción y es aviso en borrador.
 *  - Lo publicado no incluye las fuentes (RF-37).
 */
import type { CardReviewStatus, PatchHistory, PublishedCard, ReviewSnapshot, TacticalCard } from "../../src/core/types.ts";
import { computeStaleness } from "../../src/core/staleness.ts";
import { CardSchemaError, expectedFileName, parseCard } from "./card-schema.ts";
import { formatIssues, validateCards, type CardFile, type IntegrityContext } from "./integrity.ts";
import { cardHash, cardKey } from "./review.ts";

export interface SourceFile {
  file: string;
  text: string;
}

export interface CompileResult {
  /** Vacío si hay cualquier error: nunca se publica contenido a medias. */
  cards: PublishedCard[];
  errors: string[];
  warnings: string[];
}

/** RF-37: quita las fuentes antes de publicar; añade el estado de revisión (RF-28). */
export function toPublished(card: TacticalCard, review: CardReviewStatus | null): PublishedCard {
  const { sources: _sources, ...published } = card;
  return { ...published, review };
}

/** Estado de revisión de una ficha: null si no está aprobada (solo posible en borrador). */
function reviewStatus(
  card: TacticalCard,
  reviews: Record<string, ReviewSnapshot> | undefined,
  histories: PatchHistory[],
): CardReviewStatus | null {
  const snapshot = reviews?.[cardKey(card)];
  if (!snapshot) return null;
  return { reviewedPatch: snapshot.reviewedPatch, stale: computeStaleness(snapshot, histories).stale };
}

/** Solo faltar fichas es tolerable en borrador; duplicadas o fuera de alcance, nunca. */
const isMissingCard = (message: string) => message.startsWith("falta la ficha");

/** Fichas sin aprobar o editadas después de aprobarlas. */
function approvalProblems(parsed: CardFile[], reviews: Record<string, ReviewSnapshot>): string[] {
  const problems: string[] = [];
  for (const { file, card } of parsed) {
    const key = cardKey(card);
    const review = reviews[key];
    const shortKey = key.replace(/\.1v1$/, "");
    if (!review) {
      problems.push(`${file}:\n  - [aprobación] ficha sin aprobar (revisa y ejecuta: npm run approve -- ${shortKey})`);
    } else if (review.cardHash !== cardHash(card)) {
      problems.push(
        `${file}:\n  - [aprobación] ficha modificada después de aprobarla ` +
          `(revisa y vuelve a ejecutar: npm run approve -- ${shortKey})`,
      );
    }
  }
  return problems;
}

export function compileContent(
  files: SourceFile[],
  ctx: IntegrityContext,
  options: {
    allowIncomplete: boolean;
    /** Fotos de aprobación por clave de ficha ("franks.arabia.1v1"). Si se omite, no se comprueba. */
    reviews?: Record<string, ReviewSnapshot>;
    /** Huellas de los parches importados, para calcular si cada ficha quedó desactualizada (RF-28). */
    histories?: PatchHistory[];
  },
): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed: CardFile[] = [];

  for (const { file, text } of files) {
    try {
      parsed.push({ file, card: parseCard(text, file) });
    } catch (error) {
      if (error instanceof CardSchemaError) errors.push(error.message);
      else throw error;
    }
  }

  const issues = validateCards(parsed, ctx);
  const tolerated = issues.filter((i) => options.allowIncomplete && i.rule === "RF-36" && isMissingCard(i.message));
  const blocking = issues.filter((i) => !tolerated.includes(i));
  if (blocking.length > 0) errors.push(formatIssues(blocking));
  if (tolerated.length > 0) warnings.push(formatIssues(tolerated));

  if (options.reviews) {
    const approval = approvalProblems(parsed, options.reviews);
    if (approval.length > 0) (options.allowIncomplete ? warnings : errors).push(approval.join("\n"));
  }

  if (errors.length > 0) return { cards: [], errors, warnings };

  const cards = parsed
    .map(({ card }) => card)
    .sort((a, b) => expectedFileName(a).localeCompare(expectedFileName(b)))
    .map((card) => toPublished(card, reviewStatus(card, options.reviews, options.histories ?? [])));
  return { cards, errors, warnings };
}
