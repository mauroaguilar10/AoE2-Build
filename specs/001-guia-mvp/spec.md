# Spec 001 — Guía táctica MVP (Arabia, Arena y Selva Negra · 1v1)

> Estado: APROBADA (2026-11-22).
> Origen: entrevista y clarificación registradas en `entrevista.md` (decisiones 1–32). Clarificación completada (18 puntos resueltos).

## Contexto y objetivo
Durante la pantalla de carga de una partida de Age of Empires II: DE el jugador dispone de unos 30 segundos para decidir su plan. La información útil existe, pero está dispersa en enciclopedias de datos sin criterio táctico, en bibliotecas de build orders que solo cubren la apertura y en vídeos largos o PDF que envejecen con cada parche, casi siempre en un solo idioma. Esta iteración entrega una guía bilingüe (español/inglés) consultable al instante desde el móvil o un segundo monitor. Para cada civilización y mapa muestra una tarjeta con qué hacer con los aldeanos y cuándo y con qué atacar. Además, el mantenedor sabe qué tarjetas revisar cuando un parche puede haber dejado obsoleto su contenido (decisión 34). El objetivo es validar que esa tarjeta resulta útil antes de ampliar mapas, roles y civilizaciones.

## Usuarios / actores
* **Jugador:** jugador de nivel casual a intermedio de AoE2:DE que consulta la guía antes o al inicio de una partida 1v1, desde el móvil o un segundo monitor, en español o en inglés.
* **Mantenedor:** el responsable del proyecto, que revisa y aprueba cada ficha táctica antes de publicarla y la revisa de nuevo tras los parches. El enfoque táctico y su redacción los investiga y propone Claude a partir de fuentes publicadas (que cada ficha cita, RF-34); el mantenedor puede cambiarlos antes de aprobar.

## Historias de usuario
* H1: Como jugador en la pantalla de carga quiero llegar a la tarjeta de mi civilización y mapa en pocos toques para aprovechar el poco tiempo disponible.
* H2: Como jugador intermedio quiero ver qué hacer con mis aldeanos y cuándo y con qué atacar para tener un plan claro desde el inicio.
* H3: Como jugador quiero consultar las bonificaciones y los elementos únicos de cualquier civilización, incluida la de mi rival, para saber a qué me enfrento.
* H4: Como jugador hispanohablante que consume contenido en inglés (o viceversa) quiero cambiar de idioma al instante, sin perder lo que estoy viendo, y ver los nombres oficiales de mi región.
* H5: Como mantenedor quiero saber qué tarjetas pueden haber quedado desactualizadas por un parche para revisarlas antes de que el jugador siga un consejo obsoleto. *(Cambiado por la decisión 34: antes era una historia del jugador.)*
* H6: Como mantenedor quiero que no se pueda publicar contenido táctico incoherente con el juego y saber exactamente qué revisar tras cada parche para mantener la guía con poco esfuerzo.
* H7: Como jugador quiero consultar la guía sin conexión para usarla aunque la red falle.

## Requisitos funcionales (criterios de aceptación en EARS)

### Navegación y selección (H1)
* RF-1: CUANDO el usuario abra la pantalla principal, EL SISTEMA mostrará un selector de mapa (Arabia, Arena, Selva Negra) y una cuadrícula con todas las civilizaciones presentes en los datos oficiales del juego, cada una con su nombre y escudo.
* RF-2: EL SISTEMA mostrará en la cuadrícula primero las civilizaciones con ficha táctica y después el resto, marcadas como "solo datos".
* RF-3: CUANDO el usuario abra la pantalla principal por primera vez, EL SISTEMA tendrá seleccionado el mapa Arabia; en visitas posteriores, tendrá seleccionado el último mapa usado.
* RF-4: EL SISTEMA ordenará alfabéticamente las civilizaciones dentro de cada grupo (con ficha / solo datos) según el idioma y la nomenclatura activos, y reordenará la cuadrícula al cambiarlos.
* RF-5: CUANDO el usuario escriba en el buscador, EL SISTEMA filtrará la cuadrícula a las civilizaciones cuyo nombre contenga el texto en cualquiera de los idiomas o nomenclaturas disponibles (inglés, español de Latinoamérica, español de España), sin distinguir mayúsculas ni tildes.
* RF-6: SI el texto del buscador no coincide con ninguna civilización, ENTONCES EL SISTEMA mostrará un mensaje de "sin resultados" sin vaciar el selector de mapa.
* RF-7: CUANDO el usuario seleccione una civilización, EL SISTEMA mostrará la tarjeta de esa civilización para el mapa seleccionado.
* RF-8: MIENTRAS se muestra una tarjeta, EL SISTEMA permitirá cambiar de mapa desde la propia tarjeta y actualizará su contenido sin volver a la pantalla principal.
* RF-9: CUANDO el usuario vuelva a abrir la aplicación después de haber consultado una tarjeta, EL SISTEMA ofrecerá en la pantalla principal un acceso destacado a la última civilización y mapa consultados.
* RF-10: EL SISTEMA asignará a cada tarjeta una dirección (URL) compartible que identifique civilización y mapa (no el idioma ni la nomenclatura); CUANDO alguien abra esa dirección, EL SISTEMA mostrará directamente esa tarjeta en el idioma y la nomenclatura de quien la abre (RF-22, RF-23).
* RF-11: SI la dirección abierta hace referencia a una civilización o mapa inexistente, ENTONCES EL SISTEMA mostrará la pantalla principal con un aviso de que no se encontró la tarjeta.

### Contenido táctico (H2)
* RF-12: CUANDO se muestre la tarjeta de una civilización con ficha táctica, EL SISTEMA mostrará el plan de economía resumido: apertura recomendada, población objetivo para avanzar a Feudal y a Castillos, y reparto aproximado de aldeanos por recurso (comida, madera, oro, piedra) en Feudal y en Castillos. La Edad Imperial no forma parte del plan de economía (sí puede aparecer como momento de ataque en RF-14).
* RF-13: CUANDO el usuario despliegue el detalle económico, EL SISTEMA mostrará el build order paso a paso; mientras no lo despliegue, permanecerá plegado.
* RF-14: CUANDO se muestre la tarjeta de una civilización con ficha táctica, EL SISTEMA mostrará un único plan de ataque: cuándo atacar (edad o momento clave), con qué (unidad núcleo, apoyo y transición a la siguiente edad) y las 2–3 mejoras clave en orden de prioridad. Un posible segundo momento de ataque se expresa solo a través de la transición.
* RF-15: EL SISTEMA mostrará en cada tarjeta el contenido de la ficha táctica específica de esa civilización en ese mapa (rol 1v1). Cada ficha es autocontenida: incluye completos el plan de economía (RF-12, RF-13) y el plan de ataque (RF-14), sin combinarse con otras fichas.
* RF-16: SI la civilización no tiene ficha táctica, ENTONCES EL SISTEMA mostrará sus datos automáticos (RF-17) y el mensaje "Ficha táctica aún no disponible para esta civilización", sin ningún contenido táctico.

### Datos del juego (H3)
* RF-17: CUANDO se muestre la tarjeta de cualquier civilización, EL SISTEMA mostrará, obtenidos de los datos oficiales del juego: nombre, escudo y especialidad; bonificaciones de civilización; bonificación de equipo; unidad(es) única(s) con su coste; tecnologías únicas de Castillos e Imperial con su coste y efecto; y, si la civilización los tiene, edificio(s) único(s) con su coste y descripción (la sección no aparece si no tiene ninguno).
* RF-18: EL SISTEMA ofrecerá en cada tarjeta un enlace externo al árbol tecnológico completo de la civilización en aoe2techtree.net.
* RF-19: SI el usuario activa el enlace al árbol tecnológico sin conexión, ENTONCES EL SISTEMA mostrará el aviso "Necesitas conexión para ver el árbol completo" en lugar de intentar abrirlo; el enlace permanece siempre visible.

### Idioma y nomenclatura (H4)
* RF-20: EL SISTEMA mostrará un control ES/EN siempre visible en la parte superior de todas las pantallas.
* RF-21: CUANDO el usuario pulse el control ES/EN, EL SISTEMA cambiará todos los textos visibles al otro idioma sin recargar la página y conservando la civilización, el mapa, el texto del buscador y el estado plegado/desplegado.
* RF-22: CUANDO el usuario visite la aplicación por primera vez, EL SISTEMA elegirá español si el idioma preferido del navegador es cualquier variante de español, e inglés en cualquier otro caso.
* RF-23: CUANDO el usuario elija un idioma o nomenclatura, EL SISTEMA lo recordará en las siguientes visitas.
* RF-24: MIENTRAS el idioma activo sea español, EL SISTEMA ofrecerá un selector secundario de nomenclatura oficial (Latinoamérica por defecto, España opcional) que cambia únicamente los nombres oficiales de civilizaciones, unidades, edificios y tecnologías, no el texto táctico.
* RF-25: EL SISTEMA mostrará toda unidad, edificio o tecnología mencionada en el texto táctico con su nombre oficial en el idioma y la nomenclatura activos.

### Vigencia frente a parches (H5, H6)
* RF-26: EL SISTEMA mostrará en el pie de todas las páginas el parche al que corresponden los datos del juego ("Datos del juego: parche X").
* RF-27: CUANDO se actualicen los datos del juego, EL SISTEMA tomará el identificador de parche de la fuente de datos si esta lo proporciona; SI la fuente no lo proporciona, ENTONCES EL SISTEMA exigirá que el mantenedor lo indique e impedirá la publicación hasta que lo haga.
* RF-28: SI alguna entidad mencionada en la ficha táctica mostrada, o la propia civilización, cambió en los datos del juego después del parche en que se revisó esa ficha (cuenta como cambio cualquier variación de coste, estadísticas, disponibilidad o texto de bonificación; no los cambios solo de traducción), ENTONCES EL SISTEMA considerará esa ficha pendiente de revisión para el mantenedor (RF-31). La tarjeta que ve el jugador no muestra ningún aviso de parche. *(Cambiado por la decisión 34: antes mostraba en la tarjeta "Revisada en el parche X; ha habido cambios después".)*
* RF-29: CUANDO el mantenedor registre que una ficha se revisó en el parche vigente, EL SISTEMA dejará de considerarla pendiente de revisión (RF-28, RF-31).
* RF-30: CUANDO el mantenedor apruebe una ficha, EL SISTEMA registrará como su parche de revisión el parche vigente de los datos del juego y conservará el estado de las entidades que menciona en ese parche, que servirá de referencia para detectar cambios posteriores (RF-28).
* RF-31: CUANDO el mantenedor lo solicite, EL SISTEMA generará la lista de fichas tácticas pendientes de revisión, indicando para cada una las entidades que cambiaron y en qué parche.

### Integridad del contenido (H6)
* RF-32: SI una ficha táctica corresponde a una civilización inexistente en los datos del juego, o menciona una unidad, edificio o tecnología inexistente, ENTONCES EL SISTEMA impedirá la publicación e indicará la ficha y la referencia inválida.
* RF-33: SI una ficha táctica (civilización + mapa) recomienda una unidad o tecnología que esa civilización no tiene en su árbol tecnológico, ENTONCES EL SISTEMA impedirá la publicación e indicará la civilización, el mapa y la entidad.
* RF-34: SI una ficha táctica no tiene el texto en español y en inglés, o no cita al menos una fuente, ENTONCES EL SISTEMA impedirá la publicación e indicará qué falta.
* RF-35: SI a un nombre o texto oficial importado del juego le falta alguno de los idiomas o nomenclaturas (en, es-MX, es-ES), ENTONCES EL SISTEMA mostrará el disponible más cercano (la otra variante de español y, si tampoco existe, inglés), no impedirá la publicación e informará al mantenedor de las traducciones que faltan.
* RF-36: SI alguna de las civilizaciones con ficha táctica no tiene ficha para alguno de los tres mapas, ENTONCES EL SISTEMA impedirá la publicación e indicará qué combinación falta.
* RF-37: EL SISTEMA no mostrará al jugador las fuentes de las fichas tácticas; quedarán disponibles solo para el mantenedor.

### Disponibilidad y aspectos legales (H7)
* RF-38: MIENTRAS no haya conexión y el usuario haya visitado la aplicación al menos una vez con conexión, EL SISTEMA permitirá consultar todas las tarjetas, en ambos idiomas y nomenclaturas.
* RF-39: SI el usuario abre la aplicación por primera vez sin conexión, ENTONCES EL SISTEMA mostrará un mensaje que indique que se necesita conexión para la primera carga.
* RF-40: MIENTRAS haya conexión, EL SISTEMA descargará en segundo plano cualquier versión nueva publicada y la aplicará la siguiente vez que se abra la aplicación, sin cambiar el contenido que el usuario está viendo ni pedirle confirmación.
* RF-41: EL SISTEMA mostrará en el pie de todas las páginas el aviso legal exigido por las Microsoft Game Content Usage Rules, con enlace a la política oficial.

## Requisitos no funcionales
* **Rapidez (medible):** (1) tras la primera carga, abrir una tarjeta, cambiar de idioma, de nomenclatura o de mapa no realiza ninguna petición de red (verificable con test automático); (2) con la aplicación ya guardada en el dispositivo, desde que se abre hasta que se muestra la pantalla principal o la última tarjeta transcurre como máximo 1 segundo, medido en un perfil de móvil de gama media emulado.
* **Escaneabilidad:** el resumen de economía y el plan de ataque deben poder leerse en unos 30 segundos; diseño pensado primero para móvil en una columna.
* **Plataformas:** navegadores modernos de escritorio y móvil (Chrome, Edge, Firefox, Safari); instalable como aplicación.
* **Preparado para modo flotante:** la tarjeta debe poder mostrarse de forma autónoma en una vista compacta, para añadir el modo flotante en una iteración futura sin rehacerla.
* **Crecimiento:** cada ficha táctica queda asociada a mapa y rol (1v1), de modo que añadir mapas o roles no obligue a rehacer el contenido existente.
* **Legal:** sin anuncios, pagos, suscripciones ni muros de pago. Nunca se accede a la memoria ni a los archivos del juego instalado del usuario.
* **Accesibilidad básica:** contraste legible, controles táctiles cómodos y navegación por teclado.

## Casos límite
* Civilización sin ficha táctica → RF-16.
* Búsqueda sin resultados → RF-6.
* Dirección con civilización o mapa inexistente → RF-11.
* Nueva civilización añadida por un parche → aparece automáticamente como "solo datos" (RF-1, RF-16).
* Entidad citada en una ficha, o la civilización de la ficha, que un parche elimina o renombra → RF-32 si desaparece; RF-28 si cambia.
* Ficha que recomienda algo que la civilización no tiene (p. ej. scouts para Aztecas o Mayas) → RF-33.
* Falta una traducción o la fuente de una ficha → RF-34.
* Idioma del navegador distinto de español e inglés → inglés (RF-22).
* Selector de nomenclatura con el idioma inglés activo → no se muestra (RF-24).
* Primera visita sin conexión → RF-39.
* Primera publicación: cada ficha toma como referencia el parche vigente al aprobarla, por lo que ninguna muestra aviso salvo que haya cambios posteriores a su aprobación (RF-30).
* Almacenamiento local del navegador no disponible (modo privado, bloqueado) → la aplicación funciona con los valores por defecto y simplemente no recuerda preferencias ni la última tarjeta.

## Fuera de alcance
* Roles de partidas por equipos (flanco y pocket); solo 1v1.
* Mapas distintos de Arabia, Arena y Selva Negra.
* Fichas tácticas para civilizaciones distintas de: Francos, Britanos, Mayas, Mongoles, Aztecas, Godos, Turcos, Jemeres, Españoles y Persas.
* Objetivo del ataque y señales de alerta para cambiar de plan.
* Modo flotante (Picture-in-Picture) y aplicación de escritorio.
* Vista del árbol tecnológico completo (solo enlace externo).
* Comparador de enfrentamientos, counters y buscador por jerga o sinónimos.
* Estadísticas de winrate, perfiles de jugador e integración con APIs externas.
* Editor visual de contenido y contribuciones de la comunidad.
* Fuentes visibles para el jugador.
* Donaciones.

## Criterios de finalización
* Todos los RF cubiertos por al menos un test automático, con la suite en verde.
* Las 10 civilizaciones con ficha táctica tienen ficha para los 3 mapas (30 fichas), sin errores de integridad (RF-32, RF-33, RF-34 y RF-36), cada una revisada y aprobada por el mantenedor y con al menos una fuente registrada.
* Demostración manual en un móvil: abrir la app → elegir mapa → elegir civilización → cambiar ES/EN y nomenclatura → cambiar de mapa → repetir sin conexión.
* Demostración de la detección de cambios por parche: simular un cambio en una entidad citada y comprobar que la ficha aparece en la lista de pendientes (RF-28, RF-31), que desaparece de ella tras la revisión (RF-29) y que la tarjeta del jugador no muestra ningún aviso.

## Dudas abiertas
* Ninguna. (Las 3 dudas iniciales se resolvieron: sin contenido táctico para civs sin ficha, acceso destacado en RF-9 y definición de "cambio" en RF-28.)
