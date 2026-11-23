/**
 * Parseo del texto de ayuda de una civilización de aoe2techtree (RF-17).
 *
 * El texto tiene 5 secciones separadas por una línea en blanco, siempre en este orden
 * (los títulos en negrita cambian según el idioma, así que se parsea por POSICIÓN):
 *   0. Especialidad                    "Cavalry civilization"
 *   1. Bonificaciones (viñetas •)
 *   2. <b>Unidad(es) única(s)</b>       "A (Clase), B (Clase)"
 *   3. <b>Tecnologías únicas</b>        "• Nombre (efecto)"
 *   4. <b>Bonificación de equipo</b>
 *
 * La salida es texto plano: sin HTML, sin viñetas y sin saltos de línea.
 */

export interface UniqueTechText {
  name: string;
  effect: string;
}

export interface ParsedCivHelp {
  specialty: string;
  bonuses: string[];
  uniqueUnits: string[];
  uniqueTechs: UniqueTechText[];
  teamBonus: string;
}

export class CivHelpParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CivHelpParseError";
  }
}

const EXPECTED_SECTIONS = 5;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity);
}

/** Quita etiquetas y viñetas y colapsa espacios (conserva los espacios duros   internos). */
function cleanLine(rawLine: string): string {
  return rawLine
    .replace(/<[^>]*>/g, "")
    .replace(/^[\s•]+/, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Divide por comas que no estén dentro de paréntesis. */
function splitTopLevelCommas(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") depth++;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

/** "Nombre (efecto con (paréntesis) anidados)" → { name, effect }. */
function splitNameAndEffect(rawLine: string): UniqueTechText {
  // Algunos textos oficiales terminan con un punto tras el paréntesis (p. ej. Wu en es).
  const line = rawLine.replace(/\)\s*\.$/, ")");
  const open = line.indexOf("(");
  if (open <= 0 || !line.endsWith(")")) {
    throw new CivHelpParseError(`Tecnología única sin efecto entre paréntesis: "${line}"`);
  }
  return { name: line.slice(0, open).trim(), effect: line.slice(open + 1, -1).trim() };
}

/** Líneas de contenido de una sección con título en negrita (se descarta el título). */
function contentAfterHeading(rawSection: string, label: string): string[] {
  const [heading = "", ...rest] = rawSection.split("\n");
  if (!/<b>/i.test(heading)) {
    throw new CivHelpParseError(`La sección "${label}" no empieza con un título en negrita: "${heading.trim()}"`);
  }
  const lines = rest.map(cleanLine).filter((line) => line.length > 0);
  if (lines.length === 0) throw new CivHelpParseError(`La sección "${label}" está vacía`);
  return lines;
}

export function parseCivHelp(raw: string): ParsedCivHelp {
  const text = decodeEntities(raw)
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>[ \t]*\n?/gi, "\n");

  const sections = text
    .split(/\n[ \t ]*\n/)
    .map((section) => section.replace(/^\n+|\n+$/g, ""))
    .filter((section) => cleanLine(section).length > 0);

  if (sections.length !== EXPECTED_SECTIONS) {
    throw new CivHelpParseError(
      `Se esperaban ${EXPECTED_SECTIONS} secciones y hay ${sections.length}: "${cleanLine(raw).slice(0, 80)}…"`,
    );
  }
  const [specialtyRaw, bonusesRaw, uniqueUnitsRaw, uniqueTechsRaw, teamBonusRaw] = sections as [
    string,
    string,
    string,
    string,
    string,
  ];

  const specialty = specialtyRaw.split("\n").map(cleanLine).filter(Boolean).join(" ");
  const bonuses = bonusesRaw.split("\n").map(cleanLine).filter(Boolean);
  if (bonuses.length === 0) throw new CivHelpParseError("La sección de bonificaciones está vacía");

  const uniqueUnits = splitTopLevelCommas(contentAfterHeading(uniqueUnitsRaw, "unidad única").join(", "));
  const uniqueTechs = contentAfterHeading(uniqueTechsRaw, "tecnologías únicas").map(splitNameAndEffect);
  const teamBonus = contentAfterHeading(teamBonusRaw, "bonificación de equipo").join(" ");

  return { specialty, bonuses, uniqueUnits, uniqueTechs, teamBonus };
}
