---
title: Datos y actualidad
description: Origen y actualidad de los datos, ventana de estado y caché local.
eyebrow: Datos
lead: Los objetos de bomberos proceden de OpenStreetMap. OpenFireMap los prepara para cargarlos rápidamente y solicita cambios recientes.
order: 4
---

## Origen de los datos {#quelle}

La comunidad de [OpenStreetMap](https://www.openstreetmap.org/) añade hidrantes, puntos de agua, parques de bomberos y desfibriladores. OpenFireMap los muestra sin modificarlos.

## Cómo se cargan los datos {#ladeweg}

- **Teselas preparadas:** Alemania, Austria, Suiza, Liechtenstein, Luxemburgo y otros 40 países europeos usan teselas creadas de antemano.
- **API Overpass:** en otras zonas, el mapa consulta directamente el área visible y un margen alrededor.

En los países cubiertos, Overpass solo recibe solicitudes de cambios posteriores a la fecha de los datos base.

### Qué es Overpass {#overpass}

[Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) es un servicio público para consultar objetos de OpenStreetMap por zona. La carga del servidor y el tamaño de la consulta afectan a la velocidad. OpenFireMap prueba varios servidores y guarda zonas cargadas en la caché del navegador.

## Actualidad de los datos {#aktualitaet}

| Zona | Datos base | Cambios recientes |
|---|---|---|
| DACHLiLu | teselas normalmente diarias | se solicitan a Overpass |
| otros 40 países europeos | teselas normalmente semanales | Overpass si la base tiene como máximo 10 días |
| resto del mundo | estado de Overpass | en cada consulta |

### Por qué tarda en aparecer un cambio {#verzoegerung}

Overpass debe procesar el cambio. La caché del área, la caché local o una interrupción pueden retrasarlo; no se puede prometer un plazo fijo. Los objetos eliminados desaparecen con la siguiente actualización de los datos base.

## Ventana “Data status & origin” {#popover}

Muestra fuente, fecha base y estado de la actualización en vivo. En ordenador se abre desde el cuadro de estado; en móvil, tocándolo.

## Página de estado {#statusseite}

:::figure data frame=plain
La ventana muestra la fuente y el estado de la actualización en vivo.
:::

La [página de estado](/status/) muestra la antigüedad de los datos y el número de objetos por país.

## Caché local {#cache}

En **Local Cache**, dentro de “Info & Legal”, elige desactivada, 1 hora, 1 día, 3 días, 7 días (predeterminado) o 30 días. Los datos permanecen en tu dispositivo y se comprueban al volver a abrir una zona.

## Sin internet {#offline}

OpenFireMap no es un mapa sin conexión. Las zonas en caché pueden seguir visibles, pero las nuevas zonas y búsquedas requieren conexión. Usa un [plano urbano](../town-plan/) o una [exportación](../export/) impresa.

## Si tarda en cargar {#laden}

Acércate para reducir la consulta y prueba de nuevo más tarde. Si todos los servidores Overpass están ocupados, habrá que esperar.

:::warn No es una herramienta operativa
Los datos pueden estar incompletos, desactualizados o ser incorrectos. No sustituyen la información de los centros de emergencia ni de las compañías de agua. En una emergencia, llama al número correspondiente.
:::
