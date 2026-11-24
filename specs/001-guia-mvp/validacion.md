# Validación — Spec 001 (fase 7)

> Fecha: 2026-11-24. Commit validado: `7779930` (desplegado en https://aoe2-build.pages.dev).

## Criterios de finalización

| Criterio | Estado | Evidencia |
|---|---|---|
| Todos los RF cubiertos por al menos un test automático, con la suite en verde | ✅ | Los 41 RF tienen tests que los nombran (tabla de abajo). `npm test`: 433/433. `npm run test:e2e` sobre el build de producción, Chromium y WebKit: 30 pasan, 4 omitidos a propósito (mediciones de rendimiento solo en Chromium). `npm run lint`: sin errores. |
| 30 fichas sin errores de integridad, aprobadas y con al menos una fuente | ✅ | `npm run build` (estricto: RF-32, RF-33, RF-34, RF-36 y aprobación): "30 fichas tácticas compiladas (modo producción)". |
| Demostración manual en un móvil | ⏳ | Pendiente del mantenedor (ver abajo). |
| Demostración de la detección de cambios por parche | ✅ | Ver abajo. |

## Demostración de la detección de cambios por parche (RF-28, RF-29, RF-31)

Sobre una copia de `data/` y `content/reviews/` (el repositorio no se modificó), se simuló un parche 999999 en el
que cambia la huella del Caballero (`unit:38`):

1. `pending` listó las 8 fichas que lo mencionan (Francos ×3, Jemeres · Arabia, Persas · Arabia, Españoles ×3),
   cada una con "unit:38 · Knight · cambió en el parche 999999".
2. `approve -- franks.arena` registró la revisión: "parche 188329 → 999999".
3. `pending` volvió a listar 7: `franks.arena` ya no aparece.

La tarjeta del jugador no muestra ningún aviso de parche (decisión 34): lo comprueban
`tests/ui/card-tactical.test.tsx` ("RF-28 la tarjeta no muestra ningún aviso de parche"),
`tests/core/card-view.test.ts` y `tests/tools/pending.test.ts` (ficha publicada tras un cambio de coste, sin aviso).

## Verificación en producción (T45)

En https://aoe2-build.pages.dev, con Chromium y WebKit: `/civ/franks?map=arena` abre directamente (200, tarjeta y
plan); sin conexión tras la primera visita se abren otras tarjetas por URL y el inicio con las 56 civilizaciones;
el pie muestra el aviso legal de las Game Content Usage Rules con enlace a la política oficial.

## Cobertura por RF

| RF | Tests que lo nombran |
|---|---|
| RF-1 | tests/data/imported-data, tests/tools/build-dataset, tests/ui/home |
| RF-2 | tests/core/search, tests/ui/home, tests/ui/search-box |
| RF-3 | tests/core/storage, tests/ui/home, tests/ui/navigation |
| RF-4 | tests/core/search, tests/ui/home, tests/ui/search-box |
| RF-5 | tests/core/search, tests/ui/search-box |
| RF-6 | tests/core/search, tests/ui/search-box |
| RF-7 | tests/ui/navigation, e2e/main-flow |
| RF-8 | tests/ui/navigation, e2e/main-flow |
| RF-9 | tests/core/storage, tests/ui/navigation |
| RF-10 | tests/core/routes, tests/ui/navigation, e2e/main-flow |
| RF-11 | tests/core/routes, tests/ui/navigation, e2e/main-flow |
| RF-12 | tests/core/card-view, tests/tools/card-schema, tests/ui/card-tactical |
| RF-13 | tests/core/card-view, tests/tools/card-schema, tests/ui/card-tactical |
| RF-14 | tests/core/card-view, tests/tools/card-schema, tests/tools/review, tests/ui/card-tactical |
| RF-15 | tests/core/card-view |
| RF-16 | tests/core/card-view, tests/core/i18n, tests/ui/card-data |
| RF-17 | tests/core/card-view, tests/core/format, tests/data/imported-data, tests/fixtures, tests/tools/build-dataset, tests/tools/extract-unique, tests/tools/parse-civ-help, tests/ui/card-data |
| RF-18 | tests/ui/card-data |
| RF-19 | tests/core/i18n, tests/ui/card-data |
| RF-20 | tests/ui/layout |
| RF-21 | tests/core/card-view, tests/ui/card-data, tests/ui/language, e2e/main-flow |
| RF-22 | tests/core/i18n, tests/core/storage, tests/ui/first-load |
| RF-23 | tests/core/storage, tests/ui/language, tests/ui/layout |
| RF-24 | tests/core/card-view, tests/core/i18n, tests/ui/language |
| RF-25 | tests/core/tokens, tests/tools/build-dataset, tests/ui/card-tactical |
| RF-26 | tests/data/imported-data, tests/tools/build-dataset, tests/ui/layout |
| RF-27 | tests/data/imported-data, tests/tools/patch |
| RF-28 | tests/core/card-view, tests/core/i18n, tests/core/staleness, tests/data/imported-data, tests/tools/build-dataset, tests/tools/fingerprint, tests/tools/pending, tests/ui/card-tactical |
| RF-29 | tests/tools/pending, tests/tools/review |
| RF-30 | tests/tools/review |
| RF-31 | tests/tools/pending |
| RF-32 | tests/fixtures, tests/tools/build-content, tests/tools/integrity |
| RF-33 | tests/data/imported-data, tests/fixtures, tests/tools/build-content, tests/tools/build-dataset, tests/tools/integrity, tests/tools/review |
| RF-34 | tests/tools/build-content, tests/tools/card-schema |
| RF-35 | tests/data/imported-data, tests/tools/build-dataset, tests/tools/translations |
| RF-36 | tests/tools/build-content, tests/tools/integrity |
| RF-37 | tests/tools/build-content, tests/tools/preview |
| RF-38 | tests/build/pwa, e2e/offline |
| RF-39 | tests/core/i18n, tests/ui/first-load, e2e/offline |
| RF-40 | tests/build/pwa, e2e/update |
| RF-41 | tests/ui/layout |

Requisitos no funcionales con test automático: Rapidez (1) y (2) y presupuesto de tamaño en `e2e/performance.spec.ts`;
funcionamiento sin conexión en `e2e/offline.spec.ts`.

## Observaciones

* `e2e/update.spec.ts` (RF-40) falló una vez en Chromium con toda la suite en paralelo. No se pudo reproducir:
  8/8 aislado con 4 repeticiones en paralelo y 60/60 en dos pasadas completas. Si reaparece, el reporte de
  Playwright guarda la traza.
* El párrafo de contexto de `spec.md` decía que la guía "avisa cuando un parche puede haber dejado obsoleto su
  contenido", algo que la decisión 34 quitó de la pantalla del jugador. Corregido: ahora dice que es el
  mantenedor quien sabe qué tarjetas revisar.
