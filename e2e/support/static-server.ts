/**
 * Servidor estático mínimo para los e2e de actualización (RF-40): sirve una carpeta de build y permite
 * cambiarla en caliente para simular que se publica una versión nueva. Las rutas sin archivo devuelven
 * index.html (como el hosting real con fallback SPA).
 */
import { createServer, type Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
};

export interface StaticServer {
  url: string;
  /** Rutas pedidas al servidor (lo que la copia local del service worker resuelve no llega aquí). */
  requests: string[];
  /** Carpeta que se sirve a partir de ahora. */
  serve(dir: string): void;
  close(): Promise<void>;
}

/** `port` 0 elige un puerto libre (los navegadores corren en paralelo). */
export async function startStaticServer(port: number, dir: string): Promise<StaticServer> {
  let root = dir;
  const requests: string[] = [];
  const server: Server = createServer(async (req, res) => {
    requests.push(req.url ?? "/");
    const path = normalize(decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)).replace(/^([\\/])+/, "");
    let file = join(root, path);
    try {
      if (!(await stat(file)).isFile()) throw new Error("no es un archivo");
    } catch {
      file = join(root, "index.html");
    }
    const body = await readFile(file);
    // Como en producción: el service worker y el HTML siempre se revalidan.
    const revalidate = file.endsWith("sw.js") || file.endsWith(".html");
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "cache-control": revalidate ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(port, "localhost", resolve));
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  return {
    url: `http://localhost:${actualPort}`,
    requests,
    serve: (next) => void (root = next),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
