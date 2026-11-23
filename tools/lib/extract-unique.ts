/**
 * Identifica en el árbol de una civilización sus unidades únicas, tecnologías únicas y
 * edificios propios, con coste y edad (RF-17).
 *
 * Reglas (verificadas con los datos reales de aoe2techtree, ver plan §1):
 *  - UniqueUnit  → CANDIDATAS: todos los nodos UniqueUnit sin repetir id (base, élite y las
 *                  únicas que mejoran una unidad común, p. ej. el Savar). La lista oficial sale
 *                  del texto de ayuda y se asocia por nombre en la importación (T8).
 *  - UniqueTech  → todas; coste desde data.Tech.
 *  - RegionalBuilding → "Edificios propios" (pueden compartirse con otras civs).
 *  - RegionalUnit / RegionalTech NO son únicas y se ignoran.
 *  - Nodos con node_status "NotAvailable" se ignoran.
 */
import type {
  Age,
  CivId,
  Cost,
  EntityKind,
  EntityRef,
  RawCost,
  RawDataJson,
  RawEntity,
  RawTree,
  RawTreeNode,
} from "../../src/core/types.ts";

export class ExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractError";
  }
}

/**
 * Convención de aoe2techtree: el texto de ayuda oficial de una entidad está en el id
 * LanguageNameId + 21000 y contiene su nombre en negrita ("Research <b>Chivalry</b> …").
 * strings.json no incluye el nombre en el propio LanguageNameId.
 */
export const HELP_STRING_OFFSET = 21000;

export interface ExtractedEntity {
  id: EntityRef;
  age: Age;
  cost: Cost;
  /** Id del texto de ayuda oficial (nombre en negrita + descripción); se localiza en la importación. */
  helpStringId: number | null;
  /** Id de la etiqueta del árbol (con saltos <br>); respaldo si falta el texto de ayuda. */
  labelStringId: number;
}

export interface UniqueEntities {
  uniqueUnitCandidates: ExtractedEntity[];
  uniqueTechs: ExtractedEntity[];
  ownBuildings: ExtractedEntity[];
}

const AGES: Record<number, Age> = { 1: "dark", 2: "feudal", 3: "castle", 4: "imperial" };
const AGE_ORDER: Record<Age, number> = { dark: 1, feudal: 2, castle: 3, imperial: 4 };

export function ageFromId(ageId: number): Age {
  const age = AGES[ageId];
  if (!age) throw new ExtractError(`age_id desconocido: ${ageId}`);
  return age;
}

export function toCost(raw: RawCost): Cost {
  return {
    food: raw.Food ?? 0,
    wood: raw.Wood ?? 0,
    gold: raw.Gold ?? 0,
    stone: raw.Stone ?? 0,
  };
}

function entityTable(data: RawDataJson, kind: EntityKind): Record<string, RawEntity> {
  if (kind === "unit") return data.data.Unit;
  if (kind === "tech") return data.data.Tech;
  return data.data.Building;
}

function toExtracted(civ: CivId, node: RawTreeNode, kind: EntityKind, data: RawDataJson): ExtractedEntity {
  const entity = entityTable(data, kind)[String(node.node_id)];
  if (!entity) {
    throw new ExtractError(`${civ}: el nodo "${node.name}" (${kind} ${node.node_id}) no tiene datos mecánicos en data.json`);
  }
  return {
    id: `${kind}:${node.node_id}`,
    age: ageFromId(node.age_id),
    cost: toCost(entity.Cost),
    helpStringId: entity.LanguageNameId === undefined ? null : entity.LanguageNameId + HELP_STRING_OFFSET,
    labelStringId: node.name_string_id,
  };
}

/** Orden estable por edad; a igual edad se mantiene el orden del árbol. */
function byAge(entities: ExtractedEntity[]): ExtractedEntity[] {
  return entities
    .map((entity, index) => ({ entity, index }))
    .sort((a, b) => AGE_ORDER[a.entity.age] - AGE_ORDER[b.entity.age] || a.index - b.index)
    .map(({ entity }) => entity);
}

export function extractUniqueEntities(civ: CivId, data: RawDataJson, tree: RawTree): UniqueEntities {
  const nodes = [...tree.units_techs, ...tree.buildings].filter((node) => node.node_status !== "NotAvailable");

  // Una misma unidad puede aparecer en dos edificios (p. ej. Huskarl en Castillo y Cuartel).
  const uniqueUnitNodes = new Map<number, RawTreeNode>();
  for (const node of nodes) {
    if (node.node_type === "UniqueUnit" && !uniqueUnitNodes.has(node.node_id)) uniqueUnitNodes.set(node.node_id, node);
  }
  const uniqueUnitCandidates = [...uniqueUnitNodes.values()].map((node) => toExtracted(civ, node, "unit", data));

  const uniqueTechs = nodes
    .filter((node) => node.node_type === "UniqueTech")
    .map((node) => toExtracted(civ, node, "tech", data));

  const ownBuildings = nodes
    .filter((node) => node.node_type === "RegionalBuilding")
    .map((node) => toExtracted(civ, node, "building", data));

  return {
    uniqueUnitCandidates: byAge(uniqueUnitCandidates),
    uniqueTechs: byAge(uniqueTechs),
    ownBuildings: byAge(ownBuildings),
  };
}
