/**
 * Número de parche de los datos importados (RF-27).
 *
 * aoe2techtree no guarda el parche dentro de los datos; solo aparece en el mensaje de
 * algunos commits ("Implement DE Update 188329"). Otros commits de datos no lo llevan
 * ("Add The Viking Sagas"). En ese caso el mantenedor debe indicarlo con --patch; sin
 * número, la importación se detiene y no se publica nada.
 */

export class PatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatchError";
  }
}

export interface ResolvedPatch {
  patch: string;
  /** De dónde salió: del mensaje del commit o indicado por el mantenedor. */
  origin: "commit" | "manual";
}

/** Patrón real de aoe2techtree, al inicio de la primera línea del mensaje. */
const COMMIT_PATTERN = /^Implement DE Update (\d+)\b/;
/** Un número de build: solo dígitos. */
const BUILD_PATTERN = /^\d+$/;

export function patchFromCommitMessage(message: string): string | null {
  const firstLine = message.split(/\r?\n/, 1)[0] ?? "";
  return COMMIT_PATTERN.exec(firstLine)?.[1] ?? null;
}

export function resolvePatch(input: { commitMessage: string; manualPatch?: string }): ResolvedPatch {
  const { commitMessage, manualPatch } = input;

  if (manualPatch !== undefined && !BUILD_PATTERN.test(manualPatch)) {
    throw new PatchError(`--patch debe ser un número de build (solo dígitos, p. ej. 188329); se recibió "${manualPatch}"`);
  }

  const fromCommit = patchFromCommitMessage(commitMessage);
  const firstLine = commitMessage.split(/\r?\n/, 1)[0] ?? "";

  if (fromCommit !== null) {
    if (manualPatch !== undefined && manualPatch !== fromCommit) {
      throw new PatchError(
        `El commit indica el parche ${fromCommit} pero --patch indica ${manualPatch}. ` +
          `Revisa cuál es correcto y vuelve a ejecutar (sin --patch si el del commit es correcto).`,
      );
    }
    return { patch: fromCommit, origin: "commit" };
  }

  if (manualPatch !== undefined) return { patch: manualPatch, origin: "manual" };

  throw new PatchError(
    `El último commit de datos ("${firstLine}") no indica el número de parche. ` +
      `Consulta el parche correspondiente e indícalo con --patch <número>, p. ej. --patch 188329.`,
  );
}
