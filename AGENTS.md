# AGENTS.md — Guia-Age

## Proyecto
Guía táctica bilingüe (ES/EN) de Age of Empires II: DE para consultar en ~30 segundos durante la pantalla de carga: tarjeta táctica por civilización + mapa + rol. PWA estática offline-first en TypeScript; datos mecánicos del juego importados automáticamente y contenido táctico curado que los referencia por ID canónico. Contexto de investigación: arquitectura-guia-tactica-bilinge-aoe2.md (datos no verificados; no usar como fuente de verdad). Framework y herramientas: se definen en el plan.

## Comandos
* Ejecutar (desarrollo): `npm run dev` (contenido en modo borrador: las fichas que faltan son avisos)
* Build de producción: `npm run build` (estricto: exige las 30 fichas; si falla, no se genera la app)
* Build de borrador (para pruebas e2e mientras se escribe el contenido): `npm run build:draft`
* Validar solo el contenido táctico: `npm run content:check`
* Importar datos del juego: `npm run data:update` (opciones: `-- --ref <commit>`, `-- --patch <n>`)
* Ver una ficha resuelta (ES/EN, fuentes, estado, problemas) para revisarla: `npm run preview -- <civ>.<mapa>` (`--nomenclature es` para España)
* Servir el build generado: `npm run serve`
* Fichas desactualizadas tras un parche: `npm run pending`
* Aprobar una ficha revisada por el usuario: `npm run approve -- <civ>.<mapa>` (p. ej. `franks.arabia`). Solo cuando el usuario la haya aprobado explícitamente.
* Tests: `npm test` (Vitest)
* Tests de extremo a extremo (Chromium y WebKit, sobre el build): `npm run test:e2e` (Playwright; la primera vez, `npx playwright install chromium webkit`)
* Lint (tipado estricto): `npm run lint`

## Estilo y convenciones
Node ≥ 24, TypeScript estricto, Vite + Preact. Código, identificadores y commits en inglés; specs, planes y documentación del proceso en español. La lógica pura vive en `src/core/` (sin dependencias de UI); la UI en `src/ui/`; las herramientas del mantenedor en `tools/`. Los tests van en `tests/` e incluyen `RF-n` en su nombre cuando cubren un requisito. Dependencias nuevas: solo las justificadas en el plan.

## Reglas
* Lee docs/constitution.md y la spec activa (specs/NNN-*/spec.md) antes de tocar código.
* En la entrevista de la spec, pregunta de una en una todas las veces que haga falta (sin límite fijo) hasta resolver las ambigüedades relevantes.
* No escribas código en las fases de constitución, spec, clarificación, plan o tareas.
* Implementa una sola tarea cada vez: tests primero, ejecuta la suite, marca la tarea y PARA.
* Ante un requisito nuevo: actualiza primero la spec y muestra el diff; no toques código.
* <Límites: qué no tocar, qué no añadir sin preguntar.>

## Al terminar cualquier tarea
* Ejecutar `npm test` y `npm run lint`; ambos deben pasar antes de marcar la tarea en `tasks.md`.
* Al reportar una tarea terminada, mostrar al usuario el código donde se cumple cada condición de su "Hecho cuando:" (fragmentos relevantes con enlace al archivo y línea), no solo el resultado de los tests.
