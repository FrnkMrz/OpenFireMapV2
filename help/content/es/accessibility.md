---
title: Accesibilidad
description: Usa OpenFireMap con teclado, lector de pantalla, ampliación y movimiento reducido.
eyebrow: Accesibilidad
lead: OpenFireMap debe funcionar sin ratón, con lector de pantalla y con gran ampliación. Aquí se describen las funciones y las limitaciones conocidas.
order: 8
---

## Nuestro objetivo {#ziel}

El mapa sigue las pautas WCAG 2.2 nivel AA. Las comprobaciones automáticas revisan el teclado, las etiquetas, el contraste, la ampliación al 400 % y el tamaño de los controles.

:::note Estado real
Las comprobaciones automáticas no detectan todo. Aún falta una prueba completa con lectores de pantalla en dispositivos. Avísanos si encuentras algún problema.
:::

## Con teclado {#tastatur}

| Tecla | Función |
|---|---|
| <kbd>Tab</kbd> | siguiente control; el primero es “Saltar al mapa” |
| Flechas | desplazar el mapa cuando tiene el foco |
| <kbd>+</kbd>/<kbd>−</kbd> | acercar o alejar |
| <kbd>Tab</kbd> desde zoom 17 | recorrer los símbolos |
| <kbd>Enter</kbd>/<kbd>Space</kbd> | abrir detalles |
| <kbd>Escape</kbd> | cerrar detalles, menús y diálogos |

El foco siempre es visible. Al abrir un menú o diálogo, el foco permanece dentro hasta cerrarlo. En la exportación, **Use visible area** selecciona la vista actual sin arrastrar. En el diseño del plano, mueve los elementos con las flechas.

## Con lector de pantalla {#screenreader}

El mapa está identificado como una región; los símbolos tienen nombres y los avisos se anuncian. El cuadro de estado no se anuncia con cada movimiento para evitar interrupciones. Las etiquetas están disponibles en los idiomas del mapa. Esta ayuda está disponible en español, alemán e inglés.

:::tip Muchos símbolos
Por debajo del nivel 17, los puntos no se pueden recorrer uno por uno. Acércate con <kbd>+</kbd> hasta que aparezcan los símbolos.
:::

## Visión y ampliación {#sehen}

- El contraste se comprueba sobre fondos claros y oscuros.
- Con zoom del navegador hasta 400 %, la interfaz cambia a la vista estrecha.
- Los hidrantes se distinguen también por letras, no solo por color.
- Los fondos **Print (Light)** y **Night (Dark)** pueden ayudar con el deslumbramiento.

## Movimiento {#bewegung}

Si el sistema tiene activada la opción “Reduce motion”, el mapa salta a los resultados en vez de animarse.

## Móvil {#smartphone}

Los controles miden al menos 24 × 24 px. Puedes abrir los símbolos tocándolos. VoiceOver y TalkBack permiten recorrer los botones del menú. Consulta [El mapa en un móvil](../phone/).

## Pendiente de probar {#offen}

- pruebas completas con VoiceOver, TalkBack y NVDA
- contraste de símbolos sobre todos los fondos
- asistente del plano urbano con lector de pantalla

## Informar de una barrera {#melden}

Escribe a **[info@openfiremap.org](mailto:info@openfiremap.org)** e indica dispositivo, navegador y lector de pantalla. También puedes abrir una incidencia en [GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).
