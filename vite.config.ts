/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  define: {
    // Ver src/build-id.d.ts. Fijo por defecto para que dos builds del mismo código sean idénticos.
    // En Cloudflare Pages, el commit desplegado (CF_PAGES_COMMIT_SHA lo pone el propio Cloudflare).
    __BUILD_ID__: JSON.stringify(process.env.GUIA_BUILD_ID ?? process.env.CF_PAGES_COMMIT_SHA ?? "local"),
  },
  build: {
    rollupOptions: {
      output: {
        // Datos del juego y fichas en su propio archivo: el presupuesto de tamaño los mide aparte del código
        // (NFR Rapidez: código ≤ 60 KB y datos ≤ 300 KB comprimidos, e2e/performance.spec.ts).
        manualChunks: (id) => (/[\\/](data[\\/]game|src[\\/]generated[\\/]cards)\.json$/.test(id) ? "data" : undefined),
      },
    },
  },
  plugins: [
    preact(),
    VitePWA({
      // RF-40: la versión nueva se descarga en segundo plano y queda en espera; se activa cuando
      // se vuelve a abrir la app (al cerrar todas sus pestañas). Sin avisos y sin recargar la página.
      registerType: "prompt",
      injectRegister: false, // se registra desde src/platform/sw.ts
      includeManifestIcons: false, // ya entran por globPatterns; así no se repiten en el precache
      manifest: {
        name: "Guía Age",
        short_name: "Guía Age",
        description: "Guía táctica bilingüe (ES/EN) de Age of Empires II: DE para la pantalla de carga",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#8a4a0b",
        background_color: "#f6f3ee",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // RF-38: todo el build en la copia local (código, estilos, datos, escudos e íconos).
        // El manifiesto lo añade el propio plugin.
        globPatterns: ["**/*.{html,js,css,png,svg}"],
        // Las direcciones /civ/… se sirven con la app aunque no haya conexión.
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        // En la primera instalación, la copia local toma el control de la página abierta (que no estaba
        // controlada por nadie): desde ese momento, nada se pide a la red (NFR Rapidez). No afecta a RF-40:
        // una versión nueva solo se activa cuando no queda ninguna pestaña de la app abierta.
        clientsClaim: true,
      },
    }),
  ],
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    // Los tests de componentes recorren la cuadrícula completa (56 civilizaciones) en happy-dom;
    // con toda la suite en paralelo pueden pasar de los 5 s por defecto.
    testTimeout: 15_000,
  },
});
