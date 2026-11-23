# Plan 001 — Guía táctica MVP

> Estado: APROBADO (2026-11-22). Aceptado tal cual: los nodos `RegionalBuilding` se muestran como "Edificios propios", y el primer despliegue a producción requiere las 30 fichas aprobadas.
> Entradas: `docs/constitution.md` (con enmienda 1) y `specs/001-guia-mvp/spec.md` (aprobada, RF-1 a RF-41).
> Sin código: este documento define módulos, datos, decisiones y tests. La notación `[RF-n]` indica qué requisitos cubre cada parte.

---

## 1. Hechos verificados de la fuente de datos (22/11/2026)

Se inspeccionaron los archivos reales de `SiegeEngineers/aoe2techtree` (rama `master`, commit `e56728e`, "Implement DE Update 188329"):

| Hecho | Consecuencia para el plan |
|---|---|
| `data/data.json` contiene `civs` (**56** civilizaciones, clave = nombre inglés, p. ej. `"Franks"`) con arrays `Unit`, `Tech`, `Building` de IDs disponibles, más `name_string_id` y `help_string_id`. | Disponibilidad por civ para validar [RF-33]; lista de civs para la cuadrícula [RF-1]. |
| `data.json → data.{Unit, Tech, Building, unit_upgrades}` indexados por ID (string) con `Cost`, `HP`, `Attack`, `Armours`, `Range`, `LanguageNameId`, etc. | Costes de unidades/tecnologías únicas [RF-17]; base para detectar cambios mecánicos [RF-28]. |
| `data/locales/{en,es,mx}/strings.json`: mapa plano `string_id → texto con HTML ligero` (`<br>`, `<b>`). Hoy no falta ninguna clave en `es` ni `mx`. | Nombres oficiales en 3 variantes [RF-24, RF-25]; el respaldo de [RF-35] queda preparado aunque hoy no se active. |
| *(Hallazgo en T4)* `strings.json` **no** trae el nombre de las entidades en su `LanguageNameId`. El nombre oficial está en negrita dentro del texto de ayuda, en el id `LanguageNameId + 21000` (488 de 496 entidades, en las 3 variantes). Las 8 restantes son variantes técnicas (p. ej. trebuchet desmontado). | Nombre oficial = negrita del texto de ayuda; respaldo: etiqueta del árbol sin `<br>` [RF-17, RF-25]. Descripción de edificios propios = resto del texto de ayuda. |
| El texto de ayuda de la civ (`help_string_id`) es un bloque con estructura fija: especialidad / viñetas de bonificaciones / unidad única / tecnologías únicas (con efecto entre paréntesis) / bonificación de equipo. | Se parsea en la importación para obtener las secciones de [RF-17]. |
| `data/trees/<CIV>.json` (56 archivos) marca cada nodo con `node_type`: `UniqueUnit`, `UniqueTech`, `RegionalBuilding`, `RegionalUnit`, … | Identificación fiable de unidades/tecnologías únicas y de edificios propios [RF-17]. |
| **No hay número de parche dentro de los datos.** Solo aparece en mensajes de commit del tipo `Implement DE Update 188329`; otros commits de datos no lo llevan (p. ej. "Add The Viking Sagas"). | Justifica [RF-27]: detección automática por mensaje de commit y, si no aparece, número indicado por el mantenedor. |
| Licencia del código: MIT. Los iconos y textos del juego quedan bajo las Microsoft Game Content Usage Rules. | Aviso legal obligatorio [RF-41]; no se reutiliza código del repositorio, solo datos. |

**Interpretación a confirmar:** los datos no tienen un tipo "edificio único"; tienen `RegionalBuilding`, que puede estar compartido por varias civilizaciones (p. ej. la Iglesia fortificada de Armenios y Georgianos). La sección de RF-17 mostrará los nodos `RegionalBuilding` de la civilización bajo el título "Edificios propios".

---

## 2. Stack y dependencias (constitución §1: cada dependencia se justifica)

| Pieza | Elección | Justificación | Alternativa descartada |
|---|---|---|---|
| Lenguaje | TypeScript (estricto) | Constitución §1. | — |
| UI | **Preact** | API tipo React en ~4 KB: carga < 1 s en móvil [NFR Rapidez]; cambio de idioma en memoria sin recargar [RF-21]. | *React* (~45 KB, sin beneficio aquí). *Astro* (multipágina: navegar entre páginas recarga y complica mantener idioma, buscador y estado plegado [RF-21]; aporta poco porque todo el contenido cabe en memoria). |
| Build y desarrollo | **Vite** + `@preact/preset-vite` | Estándar, rápido y con salida estática. | Webpack (más configuración sin beneficio). |
| Offline / PWA | **vite-plugin-pwa** (Workbox) en modo *prompt* sin mostrar aviso | Precachea todo [RF-38]. La versión nueva queda "en espera" y se activa al reabrir la app, sin recargar nada mientras se lee [RF-40]. | Modo *autoUpdate* (recarga la página activa, incumple RF-40). Service worker hecho a mano (más riesgo y más tests). |
| Estilos | CSS propio con variables y CSS Modules (incluido en Vite) | Cero dependencias; diseño sencillo de una columna. | Tailwind (dependencia y build extra para pocas pantallas). |
| Contenido curado | **YAML** (`yaml`) + validación con **Zod** (`zod`) | YAML admite texto multilínea legible para revisar las fichas; Zod da esquemas tipados y mensajes de error claros [RF-32 a RF-36]. Ambas se usan solo en build, no van al navegador. | JSON (incómodo para texto largo y para revisar). JSON Schema + Ajv (más verboso y peor integración con TypeScript). |
| Scripts de mantenimiento | **Node 24 con TypeScript nativo** (sin dependencia extra; `@types/node` solo para tipos) | Las herramientas (importar, validar, aprobar, pendientes) comparten tipos y lógica con la app. Cambio en T2: se descarta `tsx` porque Node 24 ya ejecuta `.ts`. | `tsx` (dependencia innecesaria en Node 24). Scripts en Python (dos lenguajes y tipos duplicados). |
| Tests unitarios y de componentes | **Vitest** + `@testing-library/preact` + `happy-dom` | Integrado con Vite; rápido. | Jest (configuración extra con ESM/TS). |
| Tests extremo a extremo | **Playwright** | Único modo fiable de probar el service worker, offline, peticiones de red y tiempo de carga con CPU limitada [RF-38 a RF-40, NFR Rapidez]. | Cypress (soporte limitado de service workers y del modo offline). |
| Lint | `tsc --noEmit` (tipado estricto) | Suficiente para el MVP sin añadir dependencias. | ESLint (se puede añadir más adelante si hace falta). |
| Hosting | **Cloudflare Pages** (gratuito) | Estático, con CDN y *fallback* SPA para URLs como `/civ/franks` [RF-10]. | GitHub Pages (sin *fallback* SPA; obliga a trucos con `404.html`). |

**Dependencia de runtime:** solo `preact`. Todo lo demás es de desarrollo o build.

---

## 3. Estructura de módulos

```
Guia-Age/
├── content/                         # contenido curado (versionado en Git)
│   ├── cards/                       # 30 fichas: <civ>.<mapa>.1v1.yaml
│   ├── reviews/                     # foto de referencia por ficha al aprobarla (generada)
│   └── ui/{es,en}.json              # textos de interfaz
├── data/                            # datos del juego importados (generados, versionados)
│   ├── source.json                  # repo, commit, parche, fecha de importación
│   ├── game.json                    # dataset compacto para la app
│   ├── history/<parche>.json        # huellas mecánicas por entidad y parche
│   ├── shields/<civ>.png            # escudos
│   └── reports/missing-translations.json
├── src/
│   ├── core/                        # lógica PURA, sin UI ni navegador (constitución §4)
│   │   ├── types.ts                 # tipos de dominio
│   │   ├── i18n.ts                  # textos UI, nombres oficiales, respaldo de variantes
│   │   ├── card.ts                  # construir la vista de una tarjeta
│   │   ├── tokens.ts                # resolver referencias a entidades en texto táctico
│   │   ├── search.ts                # normalizar (sin tildes/mayúsculas) y filtrar
│   │   ├── sort.ts                  # orden alfabético por idioma (Intl.Collator)
│   │   ├── staleness.ts             # ¿la ficha cambió desde su parche de revisión?
│   │   ├── routes.ts                # URL ↔ (civ, mapa)
│   │   └── validate.ts              # reglas de integridad (usadas por las herramientas)
│   ├── platform/                    # adaptadores del navegador
│   │   ├── storage.ts               # preferencias con try/catch (modo privado)
│   │   ├── network.ts               # estado de conexión
│   │   └── sw.ts                    # registro del service worker
│   └── ui/                          # componentes Preact (solo presentan)
│       ├── App.tsx, Home.tsx, MapSelector.tsx, CivGrid.tsx, SearchBox.tsx
│       ├── Card.tsx, EconomyPlan.tsx, AttackPlan.tsx, GameData.tsx
│       ├── LangToggle.tsx, NomenclatureSelect.tsx, Footer.tsx, Notice.tsx
└── tools/                           # herramientas del mantenedor (Node + tsx)
    ├── import-data.ts               # importar datos del juego
    ├── build-content.ts             # validar y compilar fichas (se ejecuta antes del build)
    ├── approve.ts                   # aprobar una ficha en el parche vigente
    ├── pending.ts                   # listar fichas pendientes de revisión
    └── preview.ts                   # ver una ficha resuelta (ES y EN) en la terminal para revisarla
```

| Módulo | Cubre |
|---|---|
| `core/card.ts` | RF-12, RF-13, RF-14, RF-15, RF-16, RF-17 |
| `core/tokens.ts` | RF-25 |
| `core/i18n.ts` | RF-21, RF-22, RF-24, RF-35 (en ejecución) |
| `core/search.ts` + `core/sort.ts` | RF-2, RF-4, RF-5, RF-6 |
| `core/routes.ts` | RF-10, RF-11 |
| `core/staleness.ts` | RF-28, RF-29 |
| `core/validate.ts` + `tools/build-content.ts` | RF-32, RF-33, RF-34, RF-36, RF-37 |
| `tools/import-data.ts` | RF-1 (lista de civs), RF-17 (datos), RF-26, RF-27, RF-35 |
| `tools/approve.ts` | RF-29, RF-30 |
| `tools/pending.ts` | RF-31 |
| `platform/storage.ts` | RF-3, RF-9, RF-23, caso límite "almacenamiento no disponible" |
| `platform/sw.ts` + configuración PWA | RF-38, RF-39, RF-40 |
| `platform/network.ts` + `ui/GameData.tsx` | RF-18, RF-19 |
| `ui/*` | Presentación de todos los RF de UI; RF-20, RF-41 (pie) |

---

## 4. Modelo de datos

### 4.1 Identificadores canónicos (constitución §3)
* **Civilización:** clave inglesa de `data.json` (`"Franks"`). En la URL se usa en minúsculas: `/civ/franks`.
* **Mapa:** `arabia`, `arena`, `black_forest`. **Rol:** `1v1`.
* **Entidad del juego:** `<tipo>:<id>` con el ID de `data.json`, p. ej. `unit:38` (Caballero) o `tech:199` (Emplumado de flechas). Es estable entre parches y no depende del idioma. La legibilidad para quien revisa la resuelve `tools/preview.ts`, que muestra los nombres reales.

### 4.2 Ficha táctica — `content/cards/franks.arabia.1v1.yaml` (ejemplo ilustrativo)

```yaml
civ: Franks
map: arabia
role: 1v1
sources:                                  # obligatorias [RF-34]; nunca llegan al navegador [RF-37]
  - title: "Ejemplo: guía de Francos en Arabia (vídeo)"
    url: "https://…"
economy:
  opening: { es: "Scouts (exploradores) en Feudal", en: "Feudal scouts" }
  age_up_pop: { feudal: 21, castle: 29 }
  villagers:                              # reparto aproximado [RF-12]
    feudal: { food: 13, wood: 8, gold: 0, stone: 0 }
    castle: { food: 14, wood: 9, gold: 6, stone: 0 }
  build_order:                            # paso a paso, plegado por defecto [RF-13]
    - { pop: 6, es: "6 a ovejas", en: "6 on sheep" }
    - { pop: 10, es: "4 a madera; atrae el jabalí con el [[unit:448]]", en: "4 on wood; lure the boar with the [[unit:448]]" }
attack:                                   # un único plan [RF-14]
  when: { es: "Al llegar a Feudal, con 3-4 [[unit:448]]", en: "On reaching Feudal with 3-4 [[unit:448]]" }
  core: [unit:448]                        # referencias estructuradas → validadas contra el árbol [RF-33]
  support: [unit:<id>]
  transition: { units: [unit:38], note: { es: "…", en: "…" } }
  upgrades: [tech:<id>, tech:<id>]        # 2-3, en orden de prioridad
```

**Reglas de validación** (`core/validate.ts`, se ejecutan en cada build):
* Existe la civilización y cada entidad referenciada, tanto en los campos estructurados como en los `[[tipo:id]]` del texto [RF-32].
* Toda entidad de `core`, `support`, `transition.units` y `upgrades` está en el árbol de esa civilización [RF-33]. Las referencias dentro del texto libre solo deben existir, porque el texto puede mencionar unidades enemigas.
* Todo texto tiene `es` y `en` no vacíos, y hay al menos una fuente [RF-34].
* Hay exactamente 30 fichas: 10 civilizaciones × 3 mapas [RF-36]. `upgrades` tiene de 2 a 3 elementos [RF-14].
* Para el build de producción, cada ficha debe estar aprobada (tener foto en `content/reviews/`).

### 4.3 Foto de revisión — `content/reviews/franks.arabia.1v1.json` (la genera `approve`)

```json
{
  "reviewed_patch": "188329",
  "approved_at": "2026-12-01",
  "fingerprints": { "civ:Franks": "a91f…", "unit:448": "03bc…", "unit:38": "77d2…", "tech:199": "e10a…" }
}
```

**Huella mecánica** (`fingerprint`): hash de los campos mecánicos de la entidad (`Cost`, `HP`, `Attack`, `Attacks`, `Armours`, `MeleeArmor`, `PierceArmor`, `Range`, `Speed`, `TrainTime`/`ResearchTime`…). Para la civilización: su lista de disponibilidad (`Unit`/`Tech`/`Building`) más el texto **inglés** de bonificaciones. Al no usar `es` ni `mx`, los cambios solo de traducción no cuentan como cambio [RF-28].

### 4.4 Dataset del juego — `data/game.json` (lo genera `import-data`)

```json
{
  "patch": "188329",
  "civs": {
    "Franks": {
      "name": { "en": "Franks", "mx": "Francos", "es": "Francos" },
      "shield": "shields/franks.png",
      "specialty": { "en": "Cavalry civilization", "mx": "…", "es": "…" },
      "bonuses": { "en": ["Foragers work +15% faster", "…"], "mx": ["…"], "es": ["…"] },
      "team_bonus": { "en": "Knight-line +2 line of sight", "mx": "…", "es": "…" },
      "unique_units": [{ "id": "unit:281", "cost": { "food": 0, "wood": 0, "gold": 0, "stone": 0 } }],
      "unique_techs": [{ "id": "tech:493", "age": "castle", "cost": {}, "effect": { "en": "Stables work +40% faster", "mx": "…", "es": "…" } }],
      "own_buildings": []
    }
  },
  "entities": { "unit:38": { "name": { "en": "Knight", "mx": "…", "es": "…" } } }
}
```

* *(Ajuste en T8)* Se incluyen los nombres de **todas** las entidades con nombre (490): así cualquier ficha puede mencionar cualquier unidad sin reimportar, y `game.json` ocupa solo 39 KB comprimido. La disponibilidad por civilización va en `data/availability.json`, que solo usa el build y no llega al navegador.
* *(Ajuste en T8)* Las unidades únicas salen de la **lista oficial** del texto de la civilización (con su clase, p. ej. "Savar (Cavalry)") y se asocian por nombre inglés a los nodos `UniqueUnit` del árbol para obtener id y coste. 2 de 91 no tienen nodo con nombre (Ratha y Blackwood Archer, fuera de las 10 civilizaciones con ficha): se muestran sin coste.
* El texto del juego se convierte a **texto estructurado** durante la importación: viñetas y negritas. Nunca se inserta HTML de la fuente en la página.
* `data/history/<parche>.json` guarda las huellas de **todas** las entidades y civilizaciones en cada parche importado. Con eso, `pending` puede decir en qué parche cambió cada cosa [RF-31].

### 4.5 Preferencias del usuario (almacenamiento local, con try/catch)
`lang` (`es`|`en`), `nomenclature` (`mx`|`es`), `lastMap`, `lastCard` (`{civ, map}`) [RF-3, RF-9, RF-23]. Si el almacenamiento no está disponible, se usan los valores por defecto sin errores.

---

## 5. Flujos

### 5.1 Importar datos del juego — `npm run data:update [-- --ref <commit>] [--patch <n>]`
1. Descarga, de un commit concreto de aoe2techtree (por defecto, el último de `master`): `data.json`, `locales/{en,es,mx}/strings.json`, los 56 `trees/*.json` y los escudos de `img/Civs/`. Fijar el commit hace que la fuente sea versionada (constitución §3).
2. **Parche [RF-27]:** busca el commit más reciente que tocó `data/data.json` hasta ese commit. Si su mensaje sigue el patrón `Implement DE Update <n>`, el parche es `<n>`. Si no lo sigue (p. ej. "Add The Viking Sagas") y no se pasa `--patch`, la importación **se detiene** y pide el número.
3. Construye `game.json` (parseo del texto de ayuda en las 3 variantes, unidades, tecnologías y edificios por `node_type`) y `history/<parche>.json`.
4. **Traducciones [RF-35]:** si falta una cadena en `mx` se usa `es`, si falta en `es` se usa `mx`, y si faltan las dos se usa `en`. Cada respaldo se anota en `reports/missing-translations.json` y se muestra en la consola. No bloquea.
5. Si el parseo del texto de ayuda falla para alguna civilización, la importación falla y lo indica. No se publica un dato a medias.
6. Escribe `source.json` (repo, commit, parche, fecha). Todo queda en Git y se revisa con un diff.

### 5.2 Validar y compilar contenido — `npm run build` (ejecuta `build-content` y luego `vite build`)
*(Ajuste en T11)* Dos modos. **Producción** (`npm run build`): exige las 30 fichas (RF-36). **Borrador** (`npm run dev`, `npm run build:draft`): las fichas que faltan son avisos, para poder desarrollar y probar la app mientras se escribe el contenido. Formato, entidades inexistentes, árbol de la civilización y duplicados bloquean en ambos modos. La salida va a `src/generated/cards.json` (generada, fuera de Git).

`build-content` lee las fichas y la foto de revisión, aplica las reglas de §4.2 y genera `cards.json` **sin fuentes** [RF-37], indicando si cada ficha está aprobada (las no aprobadas solo existen en borrador). *(Ajuste por la decisión 34: el navegador ya no recibe la vigencia, porque no muestra ningún aviso de parche; la vigencia solo la usa `pending` [RF-28, RF-31].)* Ante cualquier error, el build falla con un mensaje que indica la ficha, el campo y el motivo.

### 5.3 Revisar y aprobar fichas
1. Yo redacto la ficha YAML (acordado en la entrevista, decisión 2).
2. `npm run preview -- franks.arabia` muestra la ficha resuelta en ES y EN, con los nombres oficiales, para que la revises. También se ve en `npm run dev`, marcada como **BORRADOR** mientras no esté aprobada.
3. Si la apruebas: `npm run approve -- franks.arabia` guarda la foto con el parche vigente [RF-30]. Si ya estaba aprobada y la vuelves a revisar tras un parche, el mismo comando la actualiza y deja de estar pendiente [RF-29].
4. `npm run pending` lista las fichas con cambios desde su revisión, con la entidad y el parche de cada cambio [RF-31].

### 5.4 En el navegador
* Al arrancar: carga `game.json`, `cards.json` y los textos de interfaz (todo precacheado), lee las preferencias y resuelve la ruta.
* Con todo en memoria, cambiar de idioma, nomenclatura, mapa o tarjeta solo cambia el estado y vuelve a pintar, **sin peticiones de red** [NFR Rapidez, RF-21].
* El estado de la vista (civilización, mapa, texto del buscador, plegado) está separado del idioma, y por eso se conserva al cambiarlo [RF-21].
* **Primera visita sin conexión:** no hay service worker que responda, así que el navegador mostraría su error. Para cumplir [RF-39], el HTML inicial incluye un mensaje mínimo en línea ("Se necesita conexión para la primera carga") que se muestra si la app no consigue cargar los datos.

---

## 6. Decisiones de interfaz relevantes

* **Rutas:** `/` (inicio) y `/civ/<civ>?map=<mapa>` [RF-10]. Si la ruta no es válida, se muestra el inicio con un aviso [RF-11]. La URL no incluye el idioma [RF-10].
* **Idioma inicial:** *(corregido en T16 para ajustarse a la spec)* si el idioma **preferido** (el primero de `navigator.languages`) es cualquier variante de español, ES; en cualquier otro caso, EN [RF-22].
* **Nombres oficiales en mayúscula o minúscula** *(T16)*: dentro de una frase se muestran tal cual (la traducción de España escribe 265 de 490 en minúscula, p. ej. "guerrillero"); solos, en listas o etiquetas, con la primera letra en mayúscula.
* **Búsqueda:** se compara el texto normalizado (minúsculas y sin tildes, con normalización Unicode NFD) contra los nombres en `en`, `mx` y `es` a la vez [RF-5].
* **Orden:** `Intl.Collator` del idioma activo, aplicado a los nombres según la nomenclatura activa [RF-4].
* **Enlace al árbol:** `https://aoe2techtree.net/#<Civ>`. Si `navigator.onLine` es falso al tocarlo, se muestra el aviso en lugar de navegar [RF-18, RF-19].
* **Vista compacta:** `Card` recibe todo lo que necesita por props y no depende de la página que la contiene. Así podrá mostrarse en una ventana flotante en el futuro [NFR modo flotante].
* **Pie:** "Datos del juego: parche X" [RF-26] + aviso legal [RF-41] con el texto de la plantilla oficial: *"Age of Empires II © Microsoft Corporation. Guia-Age was created under Microsoft's "Game Content Usage Rules" using assets from Age of Empires II, and it is not endorsed by or affiliated with Microsoft."* y un enlace a `https://www.xbox.com/en-us/developers/rules`. El texto exacto se copia de la página oficial al implementarlo. El nombre del proyecto no debe dar a entender que lo publica Microsoft, ni se usan logotipos del juego como logotipo propio.

---

## 7. Estrategia de tests

| Nivel | Herramienta | Qué prueba | RF |
|---|---|---|---|
| Unitario (lógica pura) | Vitest | Construcción de la tarjeta, tokens, i18n y respaldos, búsqueda, orden, rutas, vigencia, reglas de validación | RF-2, 4, 5, 6, 10, 11, 12–17, 21, 22, 24, 25, 28, 32–37 |
| Herramientas | Vitest + *fixtures* | Importación con datos reales recortados de aoe2techtree (3 civilizaciones y sus cadenas): parseo del texto de ayuda en `en`/`es`/`mx`, detección de parche (con y sin número en el commit), respaldo de traducciones, `approve` y `pending` | RF-17, 26, 27, 29, 30, 31, 35 |
| Parseo completo | Vitest (datos reales importados) | El parseo del texto de ayuda funciona en **las 56 civilizaciones × 3 variantes** | RF-17 |
| Componentes | Vitest + Testing Library + happy-dom | Pantalla principal, cuadrícula, selector, tarjeta, plegado, ES/EN, nomenclatura, pie y avisos | RF-1, 3, 7, 8, 9, 13, 16, 18, 19, 20, 21, 23, 24, 26, 28, 41 |
| Extremo a extremo | Playwright (build de producción) | Navegación completa; URL directa; offline tras la primera visita; primera visita offline; actualización en espera que se aplica al reabrir; **ninguna petición de red** al navegar tras la carga; **≤ 1 s** hasta ver contenido con CPU ×4 más lenta y móvil emulado | RF-10, 11, 38, 39, 40, NFR Rapidez |

* **Tests primero** en cada tarea (AGENTS.md): cada tarea de `tasks.md` empieza por los tests de los RF que cubre.
* **Comandos previstos:** `npm test` (Vitest), `npm run test:e2e` (Playwright), `npm run lint` (`tsc --noEmit`), `npm run build`.
* **Matriz RF → test:** en la fase de validación se recorre RF por RF, y cada test incluye `RF-n` en su nombre para poder rastrearlo.

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| aoe2techtree cambia su formato o deja de mantenerse | Se fija el commit; la importación falla en voz alta ante cambios de formato; plan B documentado: `genieutils-py` + archivos de cadenas del juego. |
| El texto de ayuda de alguna civilización no sigue la estructura habitual | Test sobre las 56 × 3; la importación falla si una civilización no se puede parsear. |
| El contenido táctico es erróneo o queda obsoleto | Fuentes obligatorias, aprobación explícita por ficha, aviso por parche y lista de pendientes. |
| Safari o iOS limitan el almacenamiento del service worker | Se acepta: si la copia se borra, se vuelve a descargar con conexión. RF-39 cubre el caso de no tener conexión. |
| El tamaño del paquete compromete el límite de 1 s | Dataset reducido a lo que se muestra; presupuesto: JS ≤ 60 KB y datos ≤ 300 KB comprimidos, comprobado en el test e2e. |

---

## 9. Cobertura de RF (comprobación)

Todos los RF de la spec (RF-1 a RF-41) aparecen en al menos un módulo (§3) y un nivel de test (§7). Los requisitos no funcionales se cubren así: Rapidez (§5.4 y e2e), Escaneabilidad (diseño en una columna, comprobado en la demo), Plataformas (PWA y Playwright en Chromium y WebKit), Modo flotante (§6), Crecimiento (`map`/`role` en cada ficha y en la ruta), Legal (§6 y ausencia de anuncios o pagos), Accesibilidad (HTML semántico, contraste y foco visible, comprobado en tests de componentes).
