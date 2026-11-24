# Tareas 001 — Guía táctica MVP

> Estado: APROBADO (2026-11-22). Implementación secuencial: una tarea por vez, con parada y revisión tras cada una.
> Entradas: `spec.md` (RF-1 a RF-41) y `plan.md` (aprobados).
> Reglas (AGENTS.md): se implementa una tarea por vez. En cada una se escriben primero los tests (con `RF-n` en el nombre), luego el código; se ejecuta la suite, se marca la tarea y se PARA.
> Cada tarea está pensada para unos 20–30 min de implementación. Las tareas de contenido (bloque E) incluyen además tu revisión.

---

## A. Base del proyecto

- [x] **T1 — Inicializar el proyecto**
  Git, `package.json`, TypeScript estricto, Vite + Preact, Vitest y `.gitignore`. Scripts: `dev`, `build`, `test`, `lint`. Completar la sección "Comandos" de AGENTS.md.
  RF: — (infraestructura)
  Hecho cuando: `npm test` ejecuta un test trivial en verde, `npm run lint` termina sin errores y `npm run dev` sirve una página vacía.

- [x] **T2 — Tipos de dominio y fixtures**
  `src/core/types.ts` (civilización, entidad, ficha, dataset, preferencias). Fixtures recortados de los datos reales de aoe2techtree en `tests/fixtures/`: Franks, Aztecs y Armenians, con sus árboles y sus cadenas `en`/`es`/`mx`.
  RF: base para RF-17, RF-32 y RF-33
  Depende de: T1
  Hecho cuando: los tipos compilan y existe un test que carga los fixtures y comprueba que hay 3 civilizaciones.

## B. Importación de datos del juego

- [x] **T3 — Parseo del texto de ayuda de la civilización**
  Extraer especialidad, bonificaciones, unidad(es) única(s), tecnologías únicas con su efecto y bonificación de equipo, convertidos a texto estructurado sin HTML.
  RF: RF-17
  Depende de: T2
  Hecho cuando: los tests pasan para las 3 civilizaciones de los fixtures × 3 variantes (`en`, `es`, `mx`).

- [x] **T4 — Unidades, tecnologías y edificios propios**
  Identificarlos por `node_type` (`UniqueUnit`, `UniqueTech`, `RegionalBuilding`), con coste y edad.
  RF: RF-17
  Depende de: T2
  Hecho cuando: los tests verifican el lanzador de hachas y las 2 tecnologías únicas de los Francos, y la Iglesia fortificada de los Armenios, con sus costes.

- [x] **T5 — Traducciones con respaldo**
  Si falta `mx` se usa `es`, si falta `es` se usa `mx`, y si faltan ambas se usa `en`. Se genera el informe de faltantes.
  RF: RF-35
  Depende de: T2
  Hecho cuando: los tests cubren los 3 casos de respaldo y comprueban que el informe lista cada cadena que falta.

- [x] **T6 — Detección del número de parche**
  Patrón `Implement DE Update <n>` en el commit de datos más reciente. Sin coincidencia y sin `--patch`, error que detiene la importación.
  RF: RF-27
  Depende de: T1
  Hecho cuando: los tests cubren tres casos: mensaje con número, mensaje sin número con `--patch` y mensaje sin número sin `--patch` (error).

- [x] **T7 — Huellas mecánicas**
  Hash de los campos mecánicos de cada entidad. Para una civilización: su disponibilidad más el texto inglés de bonificaciones.
  RF: RF-28 (base)
  Depende de: T2
  Hecho cuando: los tests demuestran que cambiar un coste o el HP cambia la huella, y que cambiar solo un texto `es` o `mx` no la cambia.

- [x] **T8 — Script `data:update` completo**
  Descarga del commit fijado y generación de `data/game.json`, `data/history/<parche>.json`, `data/source.json` y `data/shields/`.
  RF: RF-1, RF-17, RF-26, RF-27, RF-35
  Depende de: T3–T7
  Hecho cuando: ejecutado contra aoe2techtree real, `game.json` tiene 56 civilizaciones, `source.json` indica el parche, y el test de parseo de **56 civilizaciones × 3 variantes** está en verde.

## C. Contenido: validación y herramientas de revisión

- [x] **T9 — Esquema de la ficha y carga de YAML**
  Esquema Zod de la ficha (economía, build order, ataque, fuentes, textos `es`/`en`).
  RF: RF-12, RF-13, RF-14 (estructura), RF-34
  Depende de: T2
  Hecho cuando: los tests aceptan una ficha válida y rechazan, con mensaje que indica el campo, una sin fuente, una sin texto `en` y una con 1 o con 4 mejoras.

- [x] **T10 — Reglas de integridad**
  Existencia de la civilización y las entidades, disponibilidad en el árbol de los campos estructurados, y exactamente 30 fichas (10 civilizaciones × 3 mapas).
  RF: RF-32, RF-33, RF-36
  Depende de: T8, T9
  Hecho cuando: los tests detectan una civilización inexistente, una entidad inexistente en el texto, scouts recomendados a los Aztecas y una combinación de civilización y mapa que falta, cada caso con su mensaje.

- [x] **T11 — `build-content` integrado en el build**
  Genera `cards.json` sin las fuentes e integrado en `npm run build`, que falla si hay errores.
  RF: RF-34, RF-36, RF-37
  Depende de: T10
  Hecho cuando: un test verifica que `cards.json` no contiene `sources`, y `npm run build` falla con un mensaje claro si una ficha es inválida.

- [x] **T12 — Herramienta `approve`**
  Guarda la foto de revisión (parche vigente y huellas de lo que menciona la ficha).
  RF: RF-29, RF-30
  Depende de: T7, T11
  Hecho cuando: los tests verifican que aprobar crea la foto con el parche vigente, y que volver a aprobar tras un parche la actualiza.

- [x] **T13 — Vigencia y herramienta `pending`**
  `core/staleness.ts` más la lista de fichas pendientes, con la entidad y el parche de cada cambio.
  RF: RF-28, RF-31
  Depende de: T12
  Hecho cuando: los tests simulan un cambio de coste en un parche posterior: la ficha queda marcada, aparece en `pending` con la entidad y el parche, y deja de aparecer tras `approve`.

- [x] **T14 — Herramienta `preview`**
  Muestra en la terminal una ficha resuelta en ES y EN, con los nombres oficiales.
  RF: apoya la revisión (decisión 2 de la entrevista)
  Depende de: T11
  Hecho cuando: `npm run preview -- <ficha>` muestra la ficha de prueba con los nombres reales en lugar de `[[unit:id]]`.

## D. Ficha piloto (valida el modelo con contenido real antes de seguir)

- [x] **T15 — Ficha piloto: Francos · Arabia**
  Tú indicas el enfoque, yo redacto la ficha con al menos una fuente, la revisas con `preview` y la apruebas con `approve`.
  RF: RF-12, RF-13, RF-14, RF-34
  Depende de: T14
  Hecho cuando: la ficha pasa la validación, la has aprobado y confirmas que el formato sirve para las otras 29. Si no sirve, se ajusta la spec antes de seguir.

## E. Lógica de la aplicación (núcleo puro)

- [x] **T16 — i18n**
  Textos de interfaz `es`/`en`, nombres oficiales según la nomenclatura e idioma inicial según el navegador.
  RF: RF-22, RF-24
  Depende de: T8
  Hecho cuando: los tests cubren `es-AR` → ES, `fr` → EN, y "Feretorios" (`mx`) frente a "Relicarios" (`es`).

- [x] **T17 — Referencias en el texto**
  Resolver `[[tipo:id]]` a segmentos con el nombre oficial del idioma y la nomenclatura activos.
  RF: RF-25
  Depende de: T16
  Hecho cuando: los tests resuelven el mismo texto en `en`, `es` y `mx` con los nombres correctos.

- [x] **T18 — Búsqueda y orden**
  Normalización sin tildes ni mayúsculas, búsqueda en las 3 variantes, grupos (con ficha / solo datos) y `Intl.Collator`.
  RF: RF-2, RF-4, RF-5, RF-6
  Depende de: T16
  Hecho cuando: los tests verifican que "espanoles", "SPANISH" y "españoles" encuentran la misma civilización, que una búsqueda sin coincidencias devuelve vacío, que las civilizaciones con ficha van primero y que el orden cambia con el idioma.

- [x] **T19 — Rutas**
  URL ↔ (civilización, mapa), sin idioma; detección de rutas inválidas.
  RF: RF-10, RF-11
  Depende de: T2
  Hecho cuando: los tests convierten en ambos sentidos `/civ/franks?map=arena` y marcan como inválidas una civilización inexistente y `map=nomad`.

- [x] **T20 — Construcción de la vista de tarjeta**
  Datos del juego más la ficha, o "sin ficha", más el estado de vigencia.
  RF: RF-12, RF-14, RF-15, RF-16, RF-17, RF-28
  Depende de: T13, T17
  Hecho cuando: los tests cubren tres casos: civilización con ficha (economía y ataque completos), civilización sin ficha (solo datos y mensaje) y ficha marcada como desactualizada.

- [x] **T21 — Preferencias**
  Idioma, nomenclatura, último mapa y última tarjeta, con try/catch.
  RF: RF-3, RF-9, RF-23
  Depende de: T1
  Hecho cuando: los tests verifican que se guardan y se recuperan, y que con un almacenamiento que lanza errores se usan los valores por defecto sin fallar.

## F. Interfaz

- [x] **T22 — Estructura de la app, cabecera y pie**
  Control ES/EN siempre visible y pie con el parche y el aviso legal (texto copiado literalmente de la página oficial de Microsoft).
  RF: RF-20, RF-26, RF-41
  Depende de: T16, T21
  Hecho cuando: los tests de componentes verifican que el control ES/EN, "Datos del juego: parche X" y el aviso con su enlace aparecen en todas las pantallas.

- [x] **T23 — Pantalla principal: selector de mapa y cuadrícula**
  RF: RF-1, RF-2, RF-3, RF-4
  Depende de: T18, T22
  Hecho cuando: los tests verifican que aparecen las 56 civilizaciones con escudo, que las 10 con ficha van primero, que el resto está marcado "solo datos" y que Arabia está seleccionada en la primera visita y el último mapa en las siguientes.

- [x] **T24 — Buscador**
  RF: RF-5, RF-6
  Depende de: T23
  Hecho cuando: los tests verifican que escribir filtra la cuadrícula, y que sin coincidencias aparece "sin resultados" sin tocar el selector de mapa.

- [x] **T25 — Tarjeta: datos del juego y enlace externo**
  RF: RF-16, RF-17, RF-18, RF-19
  Depende de: T20, T22
  Hecho cuando: los tests verifican las secciones de datos (con edificios propios solo si existen), el mensaje de "sin ficha" y el aviso del enlace sin conexión.

- [x] **T26 — Tarjeta: economía, build order y ataque**
  *(Cambiado por la decisión 34: la tarjeta ya no muestra el aviso de parche.)* Quitar de la app lo que solo servía para ese aviso: la vigencia en `cards.json` y en la vista de tarjeta (T11, T20) y el texto `staleNotice`.
  RF: RF-12, RF-13, RF-14, RF-25, RF-28
  Depende de: T25
  Hecho cuando: los tests verifican que el build order está plegado por defecto y se despliega, que las entidades aparecen con su nombre oficial y que una ficha desactualizada se muestra sin ningún aviso de parche (mientras `pending` la sigue listando).

- [x] **T27 — Navegación**
  Abrir una tarjeta, cambiar de mapa dentro de ella, enlace directo y acceso "Continuar".
  RF: RF-7, RF-8, RF-9, RF-10, RF-11
  Depende de: T19, T24, T26
  Hecho cuando: los tests verifican que tocar una civilización abre su tarjeta con el mapa elegido, que el mapa cambia sin volver al inicio, que una URL directa abre la tarjeta, que una URL inválida muestra el inicio con aviso y que aparece "Continuar: <civ> · <mapa>".

- [x] **T28 — Cambio de idioma y nomenclatura conservando el estado**
  RF: RF-21, RF-23, RF-24
  Depende de: T27
  Hecho cuando: los tests verifican que al cambiar ES↔EN se conservan civilización, mapa, texto del buscador y plegado sin recargar, que el selector de nomenclatura solo aparece en ES y que la cuadrícula se reordena.

- [x] **T29 — Estilos y accesibilidad básica**
  Diseño de una columna pensado para móvil, contraste, foco visible y controles táctiles cómodos.
  RF: NFR Escaneabilidad, NFR Accesibilidad, NFR Modo flotante (tarjeta autónoma)
  Depende de: T28
  Hecho cuando: la tarjeta se ve completa y legible en 390 px de ancho, toda la app se maneja con teclado y `Card` se puede mostrar sola en un test sin la página que la contiene.

## G. Sin conexión y extremo a extremo

- [x] **T30 — PWA**
  Precache completo; nueva versión en espera hasta reabrir, sin avisos; app instalable.
  RF: RF-38, RF-40
  Depende de: T29
  Hecho cuando: `npm run build` genera el service worker y el manifiesto, y el navegador ofrece instalar la app en la vista previa del build.

- [x] **T31 — Primera visita sin conexión**
  Mensaje mínimo en el HTML inicial.
  RF: RF-39
  Depende de: T30
  Hecho cuando: un test verifica que el mensaje se muestra si los datos no cargan.

- [x] **T32 — Playwright y recorrido principal**
  RF: RF-7, RF-8, RF-10, RF-11, RF-21
  Depende de: T30
  Hecho cuando: `npm run test:e2e` recorre inicio → mapa → civilización → ES/EN → cambio de mapa, más URL directa e inválida, en verde en Chromium y WebKit.

- [x] **T33 — e2e sin conexión y actualización**
  RF: RF-38, RF-39, RF-40
  Depende de: T31, T32
  Hecho cuando: los e2e verifican que todo funciona sin conexión tras la primera visita, que la primera visita sin conexión muestra el mensaje y que una versión nueva no cambia la página abierta pero se aplica al reabrir.

- [x] **T34 — e2e de rendimiento**
  RF: NFR Rapidez
  Depende de: T32
  Hecho cuando: los e2e verifican cero peticiones de red al navegar tras la carga, ≤ 1 s hasta ver contenido con CPU ×4 más lenta y móvil emulado, y que se respeta el presupuesto de tamaño (JS ≤ 60 KB y datos ≤ 300 KB comprimidos).

## H. Contenido táctico (puede avanzar en paralelo a E–G una vez terminada T15)

Para cada tarea *(decisión 33)*: yo investigo el plan de cada mapa en fuentes publicadas, lo verifico contra los datos del juego y redacto la ficha citándolas; tú la revisas con `preview` y, solo con tu aprobación, ejecuto `approve`.
Hecho cuando (todas): las 3 fichas de la civilización pasan `build-content` y están aprobadas por ti.

- [x] **T35 — Francos · Arena y Selva Negra** (Arabia ya hecha en T15)
- [x] **T36 — Britanos · 3 mapas**
- [x] **T37 — Mayas · 3 mapas**
- [x] **T38 — Mongoles · 3 mapas**
- [x] **T39 — Aztecas · 3 mapas**
- [x] **T40 — Godos · 3 mapas**
- [x] **T41 — Turcos · 3 mapas**
- [x] **T42 — Jemeres · 3 mapas**
- [x] **T43 — Españoles · 3 mapas**
- [x] **T44 — Persas · 3 mapas**
  RF (todas): RF-12, RF-13, RF-14, RF-34, RF-36

## I. Publicación

- [x] **T45 — Despliegue en Cloudflare Pages**
  Requiere que crees una cuenta (gratuita) y conectes el repositorio. Necesita las 30 fichas aprobadas.
  RF: RF-10 (URLs en producción), RF-41
  Depende de: T34, T35–T44
  Hecho cuando: la URL pública abre `/civ/franks?map=arena` directamente, funciona sin conexión tras la primera visita y muestra el aviso legal.

---

**Después de T45:** fase 7 (validación RF por RF contra los tests y los criterios de finalización de la spec).
