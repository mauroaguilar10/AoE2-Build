# Constitución — Guia-Age

> Estado: APROBADA (2026-11-22). Enmienda 1 al principio 6 aprobada (2026-11-22, clarificación spec 001).

1. **Stack mínimo:** web estática (PWA) en TypeScript, sin servidor ni base de datos. Cada dependencia nueva se justifica en el plan.
2. **La spec manda:** no se escribe código sin un RF de una spec aprobada que lo respalde. Cualquier cambio de comportamiento actualiza primero la spec.
3. **Datos del juego automáticos:** estadísticas, costes, árboles tecnológicos y nombres oficiales se importan de una fuente versionada y nunca se escriben a mano. El contenido táctico referencia entidades solo por ID canónico.
4. **Lógica separada de la UI:** la composición de la ficha, el filtrado por árbol tecnológico y la resolución de textos viven en módulos puros sin dependencias de UI. La UI solo presenta.
5. **Tests y validación:** cada RF tiene al menos un test automático. La suite pasa en verde antes de marcar una tarea. Los datos y el contenido curado se validan con esquema en cada build, y un ID inexistente rompe el build.
6. **Bilingüe real:** todo texto curado (fichas e interfaz) existe en `es` y `en`; si falta, el build falla. Si a un nombre o texto oficial importado del juego le falta un idioma, se usa el más cercano disponible (la otra variante de español y, si tampoco existe, inglés) y se informa al mantenedor. Cambiar de idioma no recarga la página ni pierde la vista actual.
7. **Offline y sin dependencias críticas:** tras la primera visita funciona sin conexión. Ninguna API de terceros es necesaria en tiempo de ejecución.
8. **Legal y seguro:** se cumplen las Microsoft Game Content Usage Rules (aviso legal visible; sin anuncios, pagos ni suscripciones; solo donaciones). Nunca se lee ni se modifica la memoria o los archivos del juego.
9. **Idioma:** código, identificadores y commits en inglés. Specs, planes y documentación del proceso en español.
