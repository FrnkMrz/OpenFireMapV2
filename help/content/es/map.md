---
title: El mapa en un ordenador
description: Búsqueda, ubicación, capas, detalles de hidrantes, compartir y teclado.
eyebrow: Mapa
lead: Las herramientas están arriba a la izquierda y la fecha de los datos abajo a la derecha. Aquí se explica cada botón.
order: 1
---

## Vista general {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap en un ordenador.
:::

1. **Buscar:** encuentra un lugar o dirección.
2. **Mi ubicación:** ve a tu posición.
3. **Capas:** cambia el mapa de fondo.
4. **Exportar:** guarda un plano en PNG/PDF o puntos en GPX/CSV.
5. **Compartir:** copia el enlace a esta vista.
6. **Hidrante:** señala el símbolo para ver detalles; pulsa para mostrar un radio de 100 metros.
7. **Estado:** nivel de zoom y fecha de los datos.
8. **Información y legal:** ayuda, símbolos y avisos.

## Buscar un lugar {#suche}

Escribe un lugar, calle o dirección en el campo de búsqueda y pulsa <kbd>Enter</kbd> o la lupa. El mapa irá al primer resultado y se acercará al nivel 16. La búsqueda usa Nominatim y encuentra lugares y direcciones, no hidrantes individuales.

## Mi ubicación {#standort}

El botón muestra dónde estás y acerca al nivel 17. La primera vez, el navegador solicita permiso. La posición solo se usa en tu navegador y no se guarda.

:::tip ¿No aparece la ubicación?
Comprueba que el navegador permite la ubicación para openfiremap.org. En un ordenador sin GPS puede ser aproximada.
:::

## Hidrantes y otros objetos {#objekte}

| Nivel de zoom | Qué aparece |
|---|---|
| menor que 12 | aún no hay objetos |
| desde 12 | parques de bomberos |
| desde 14 | símbolos de parques y límites municipales |
| desde 15 | hidrantes, puntos de agua y desfibriladores |
| desde 17 | símbolos con letras |
| desde 18 | detalles al pasar el cursor |

:::figure marker frame=plain
Al pulsar un hidrante se dibuja un radio de 100 metros.
:::

Desde el nivel 18, señala un símbolo para ver sus datos. Con teclado, selecciónalo con <kbd>Tab</kbd> desde el nivel 17 y pulsa <kbd>Enter</kbd>. El círculo de 100 metros aparece desde el nivel 16. Tras usar **Mi ubicación**, también se muestra la distancia. Los datos (tipo, diámetro, número y operador) proceden de OpenStreetMap. [Contribuir](../contribute/) explica cómo completar información.

Consulta [Capas y símbolos](../layers/) para conocer los símbolos y colores.

## Capas del mapa {#ebenen}

El botón del mapa permite elegir entre estándar, impresión, noche, satélite, topográfico, estilos OSM y BayernAtlas. Los objetos de bomberos siempre aparecen encima. Más información en [Capas y símbolos](../layers/).

## Compartir y enlaces {#teilen}

El botón de compartir copia un enlace a esta vista exacta, con lugar, zoom y fondo. La dirección del navegador cambia al mover el mapa y también puedes guardarla como marcador.

## Estado y fecha de datos {#status}

Abajo a la derecha aparecen el nivel de zoom y la fecha de los datos. “+Sync” indica que ya se cargaron cambios recientes. “Data status details” muestra la fuente y antigüedad. Consulta [Datos y actualidad](../data/).

## Información, legal y ajustes {#info}

“Info & Legal” abre enlaces a esta ayuda, símbolos, overlay, privacidad y licencias. También permite configurar la caché local: desactivada, 1 hora, 1 día, 3 días, 7 días (predeterminado) o 30 días.

## Uso con teclado {#tastatur}

- El primer <kbd>Tab</kbd> lleva a “Saltar al mapa”.
- Las flechas desplazan el mapa; <kbd>+</kbd> y <kbd>−</kbd> cambian el zoom.
- Desde el nivel 17 se accede a símbolos con <kbd>Tab</kbd>. <kbd>Enter</kbd> o <kbd>Space</kbd> abre los detalles; <kbd>Escape</kbd> los cierra.
- En menús y diálogos, el foco permanece hasta cerrarlos.
- En exportación, **Use visible area** selecciona la vista actual sin dibujar un rectángulo.
