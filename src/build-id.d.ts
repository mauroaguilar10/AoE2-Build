/**
 * Identificador del build (variable de entorno GUIA_BUILD_ID al compilar; "local" si no se indica).
 * No se muestra al jugador: queda en `<html data-build>` para saber qué versión tiene abierta una página
 * (diagnóstico y tests de actualización, RF-40).
 */
declare const __BUILD_ID__: string;
