/**
 * Esquema de la ficha táctica (content/cards/<civ>.<mapa>.<rol>.yaml) y su carga desde YAML.
 * Solo se usa en build y herramientas (zod y yaml no llegan al navegador).
 *
 * Cubre la ESTRUCTURA (RF-12, RF-13, RF-14, RF-34). La coherencia con el juego
 * (entidades que existen, árbol de la civilización, 30 fichas) es de T10.
 */
import { basename } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { EntityRef, TacticalCard } from "../../src/core/types.ts";
import { MAP_IDS } from "../../src/core/types.ts";

export interface CardIssue {
  path: string;
  message: string;
}

export class CardSchemaError extends Error {
  readonly issues: CardIssue[];
  constructor(fileName: string, issues: CardIssue[]) {
    super(`${fileName}:\n${issues.map((i) => `  - ${i.path || "(archivo)"}: ${i.message}`).join("\n")}`);
    this.name = "CardSchemaError";
    this.issues = issues;
  }
}

// ─── Piezas ─────────────────────────────────────────────────────────────────

const text = z
  .string({ error: (issue) => (issue.input === undefined ? "falta el texto" : "debe ser texto") })
  .refine((value) => value.trim().length > 0, { error: "el texto no puede estar vacío" });

/** Texto curado: obligatorio en español e inglés (constitución §6). */
const curated = z.strictObject({ es: text, en: text });

/** Referencia canónica de un tipo concreto, p. ej. "unit:38" o "tech:199". */
const ref = (kind: "unit" | "tech", example: string) => {
  const message = `debe ser una referencia de tipo ${kind} (p. ej. ${example})`;
  return z
    .string({ error: message })
    .regex(new RegExp(`^${kind}:\\d+$`), { error: message })
    .transform((value) => value as EntityRef);
};

const unitRef = ref("unit", "unit:38");
const techRef = ref("tech", "tech:199");

const count = z.number({ error: "debe ser un número" }).int({ error: "debe ser un número entero" }).min(0, {
  error: "no puede ser negativo",
});

const villagerSplit = z.strictObject({ food: count, wood: count, gold: count, stone: count });

const population = z.number({ error: "debe ser un número" }).int({ error: "debe ser un número entero" }).positive({
  error: "debe ser mayor que 0",
});

// ─── Ficha ──────────────────────────────────────────────────────────────────

export const cardSchema = z.strictObject({
  civ: text,
  map: z.enum(MAP_IDS as [string, ...string[]], { error: `debe ser uno de: ${MAP_IDS.join(", ")}` }),
  role: z.literal("1v1", { error: 'debe ser "1v1" en esta iteración' }),
  sources: z
    .array(z.strictObject({ title: text, url: z.url({ error: "debe ser una URL válida" }) }), {
      error: "falta la lista de fuentes",
    })
    .min(1, { error: "debe citar al menos una fuente (RF-34)" }),
  economy: z.strictObject({
    opening: curated,
    ageUpPop: z
      .strictObject({ feudal: population, castle: population })
      .refine((pop) => pop.castle > pop.feudal, { error: "la población para Castillos debe ser mayor que la de Feudal" }),
    villagers: z.strictObject({ feudal: villagerSplit, castle: villagerSplit }),
    buildOrder: z
      .array(z.strictObject({ pop: population, text: curated }))
      .min(1, { error: "el build order necesita al menos un paso" }),
  }),
  attack: z.strictObject({
    when: curated,
    core: z.array(unitRef).min(1, { error: "el núcleo del ejército necesita al menos una unidad" }),
    support: z.array(unitRef),
    transition: z.strictObject({ units: z.array(unitRef), note: curated.optional() }),
    upgrades: z
      .array(techRef)
      .min(2, { error: "debe tener entre 2 y 3 mejoras (RF-14)" })
      .max(3, { error: "debe tener entre 2 y 3 mejoras (RF-14)" }),
  }),
});

function toIssues(error: z.ZodError): CardIssue[] {
  return error.issues.map((issue) => {
    const path = issue.path.map(String).join(".");
    if (issue.code === "unrecognized_keys") {
      return { path, message: `campo desconocido: ${issue.keys.join(", ")}` };
    }
    return { path, message: issue.message };
  });
}

/** Nombre de archivo esperado para una ficha: "<civ en minúsculas>.<mapa>.<rol>.yaml". */
export function expectedFileName(card: Pick<TacticalCard, "civ" | "map" | "role">): string {
  return `${card.civ.toLowerCase()}.${card.map}.${card.role}.yaml`;
}

/** Parsea y valida una ficha. Lanza CardSchemaError con TODOS los problemas encontrados. */
export function parseCard(yamlText: string, filePath: string): TacticalCard {
  const fileName = basename(filePath);

  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (error) {
    throw new CardSchemaError(fileName, [{ path: "", message: `YAML inválido: ${(error as Error).message}` }]);
  }

  const result = cardSchema.safeParse(raw);
  if (!result.success) throw new CardSchemaError(fileName, toIssues(result.error));

  const card = result.data as TacticalCard;
  const expected = expectedFileName(card);
  if (fileName !== expected) {
    throw new CardSchemaError(fileName, [
      { path: "", message: `el archivo debería llamarse ${expected} según su civ, mapa y rol` },
    ]);
  }
  return card;
}
