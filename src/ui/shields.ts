/**
 * URL publicada de cada escudo de data/shields/. Vite los copia al build con un nombre con hash;
 * los datos del juego solo guardan la ruta relativa ("shields/franks.png").
 */
const URLS = import.meta.glob<string>("../../data/shields/*.png", { eager: true, query: "?url", import: "default" });

export function shieldUrl(shield: string): string | undefined {
  return URLS[`../../data/${shield}`];
}
