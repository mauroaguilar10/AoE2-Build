/**
 * Huellas mecánicas (base de RF-28): un hash que cambia solo si cambia algo que afecta
 * al juego, no si cambia una traducción ni el orden de los datos.
 *
 *  - Entidad: todos sus campos excepto los no mecánicos (lista de EXCLUSIÓN, para que un
 *    campo mecánico nuevo se detecte sin tocar código).
 *  - Unidad: además, su mejora en unit_upgrades (p. ej. el coste de pasar a élite).
 *  - Civilización: su disponibilidad (unidades, tecnologías, edificios) + su texto de
 *    bonificaciones en INGLÉS. Al no usar es/mx, los cambios solo de traducción no cuentan.
 */
import { createHash } from "node:crypto";
import type { CivId, EntityRef, RawDataJson, RawEntity, RawStrings } from "../../src/core/types.ts";

export class FingerprintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FingerprintError";
  }
}

/** Campos que no afectan al juego: nombre interno y puntero a textos. */
const NON_MECHANICAL_FIELDS: ReadonlySet<string> = new Set(["internal_name", "LanguageNameId"]);

const HASH_LENGTH = 16;

/** Serialización canónica: claves ordenadas y arrays ordenados por su propia forma canónica. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).sort().join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex").slice(0, HASH_LENGTH);
}

function mechanicalFields(entity: RawEntity): Record<string, unknown> {
  return Object.fromEntries(Object.entries(entity).filter(([field]) => !NON_MECHANICAL_FIELDS.has(field)));
}

export function entityFingerprint(entity: RawEntity): string {
  return hash(mechanicalFields(entity));
}

export function refFingerprint(ref: EntityRef, data: RawDataJson): string {
  const [kind, id] = ref.split(":") as [string, string];
  let payload: unknown;
  if (kind === "unit") {
    const unit = data.data.Unit[id];
    const upgrade = data.data.unit_upgrades[id];
    if (unit || upgrade) {
      payload = {
        unit: unit ? mechanicalFields(unit) : null,
        upgrade: upgrade ? mechanicalFields(upgrade) : null,
      };
    }
  } else if (kind === "tech") {
    const tech = data.data.Tech[id];
    if (tech) payload = mechanicalFields(tech);
  } else if (kind === "building") {
    const building = data.data.Building[id];
    if (building) payload = mechanicalFields(building);
  }
  if (payload === undefined) throw new FingerprintError(`La entidad ${ref} no existe en los datos del juego`);
  return hash(payload);
}

export function civFingerprint(civ: CivId, data: RawDataJson, englishStrings: RawStrings): string {
  const raw = data.civs[civ];
  if (!raw) throw new FingerprintError(`La civilización ${civ} no existe en los datos del juego`);
  const bonusText = (englishStrings[String(raw.help_string_id)] ?? "").replace(/\s+/g, " ").trim();
  return hash({ units: raw.Unit, techs: raw.Tech, buildings: raw.Building, bonusText });
}
