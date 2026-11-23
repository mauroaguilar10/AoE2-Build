/**
 * Descarga de aoe2techtree en un commit FIJO (constitución §3: fuente versionada).
 * Usa la API de GitHub solo para 2 consultas (resolver el commit y el último commit de datos);
 * el resto se descarga de raw.githubusercontent.com.
 */
import type { CivId, GameLocale, RawDataJson, RawSource, RawStrings, RawTree } from "../../src/core/types.ts";
import { GAME_LOCALES } from "../../src/core/types.ts";

export const SOURCE_REPO = "SiegeEngineers/aoe2techtree";

const HEADERS: Record<string, string> = {
  "User-Agent": "guia-age-importer",
  Accept: "application/vnd.github+json",
};

async function request(url: string, api: boolean): Promise<Response> {
  const headers = { ...HEADERS };
  const token = process.env["GITHUB_TOKEN"];
  if (api && token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GET ${url} → HTTP ${response.status}`);
  return response;
}

const raw = (repo: string, sha: string, path: string) => `https://raw.githubusercontent.com/${repo}/${sha}/${path}`;

async function rawJson<T>(repo: string, sha: string, path: string): Promise<T> {
  return (await (await request(raw(repo, sha, path), false)).json()) as T;
}

/** Resuelve una rama, etiqueta o commit parcial al SHA completo. */
export async function resolveCommit(repo: string, ref: string): Promise<string> {
  const body = (await (await request(`https://api.github.com/repos/${repo}/commits/${ref}`, true)).json()) as {
    sha: string;
  };
  return body.sha;
}

/** Mensaje del commit más reciente que modificó data/data.json hasta `sha` (RF-27). */
export async function latestDataCommitMessage(repo: string, sha: string): Promise<{ sha: string; message: string }> {
  const url = `https://api.github.com/repos/${repo}/commits?path=data/data.json&sha=${sha}&per_page=1`;
  const [latest] = (await (await request(url, true)).json()) as { sha: string; commit: { message: string } }[];
  if (!latest) throw new Error(`No se encontró ningún commit que modifique data/data.json hasta ${sha}`);
  return { sha: latest.sha, message: latest.commit.message };
}

export interface DownloadedSource {
  source: RawSource;
  /** Escudo PNG de cada civilización. */
  shields: Record<CivId, Uint8Array>;
}

export async function downloadSource(repo: string, sha: string): Promise<DownloadedSource> {
  const data = await rawJson<RawDataJson>(repo, sha, "data/data.json");
  const civs = Object.keys(data.civs);

  const stringsEntries = await Promise.all(
    GAME_LOCALES.map(async (locale) => [locale, await rawJson<RawStrings>(repo, sha, `data/locales/${locale}/strings.json`)] as const),
  );
  const treeEntries = await Promise.all(
    civs.map(async (civ) => [civ, await rawJson<RawTree>(repo, sha, `data/trees/${civ.toUpperCase()}.json`)] as const),
  );
  const shieldEntries = await Promise.all(
    civs.map(async (civ) => {
      const response = await request(raw(repo, sha, `img/Civs/${civ.toLowerCase()}.png`), false);
      return [civ, new Uint8Array(await response.arrayBuffer())] as const;
    }),
  );

  return {
    source: {
      data,
      trees: Object.fromEntries(treeEntries),
      strings: Object.fromEntries(stringsEntries) as Record<GameLocale, RawStrings>,
      meta: { repo, commit: sha },
    },
    shields: Object.fromEntries(shieldEntries),
  };
}
