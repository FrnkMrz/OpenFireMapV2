---
title: Dados e atualidade
description: Origem e atualidade dos dados, janela de estado e cache local.
eyebrow: Dados
lead: Os objetos dos bombeiros vêm do OpenStreetMap. O OpenFireMap prepara-os para carregar rapidamente e consulta alterações recentes.
order: 4
---

## Origem dos dados {#quelle}

A comunidade do [OpenStreetMap](https://www.openstreetmap.org/) adiciona hidrantes, pontos de água, quartéis e desfibrilhadores. O OpenFireMap apresenta os dados sem os alterar.

## Como são carregados os hidrantes {#ladeweg}

- **Blocos preparados:** Alemanha, Áustria, Suíça, Liechtenstein, Luxemburgo e mais 40 países europeus usam dados preparados antecipadamente.
- **API Overpass:** noutros locais, o mapa consulta diretamente a área visível e uma margem.

Nos países abrangidos, o Overpass só é usado para alterações posteriores à data dos dados de base.

### O que é a API Overpass {#overpass}

A [Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) é um serviço público que pesquisa objetos do OpenStreetMap por área. A velocidade depende da carga do servidor e do tamanho da consulta. O OpenFireMap tenta vários servidores e guarda áreas carregadas na cache do navegador.

## Atualidade dos dados {#aktualitaet}

| Área | Dados de base | Objetos novos e alterados |
|---|---|---|
| DACHLiLu | blocos geralmente atualizados diariamente | consultados pelo Overpass |
| mais 40 países europeus | geralmente semanalmente | Overpass se os dados de base tiverem no máximo 10 dias |
| resto do mundo | estado do servidor Overpass | em cada consulta |

### Porque é que um objeto novo não aparece logo? {#verzoegerung}

O Overpass tem primeiro de processar a alteração. A cache da área, a cache local ou uma interrupção podem atrasar a apresentação; não é possível prometer um prazo. Objetos eliminados desaparecem na próxima atualização da base.

## Janela “Data status & origin” {#popover}

:::figure data frame=plain
A janela mostra a origem e o estado da atualização em direto.
:::

No computador, abra através de “Data status details”; no telemóvel, toque na caixa de estado. São mostradas a origem, a data de base e a atualização em direto.

## Página de estado {#statusseite}

A [página de estado](/status/) mostra a antiguidade dos dados e o número de objetos por país.

## Cache local {#cache}

Em **Local Cache**, dentro de “Info & Legal”, escolha: desligada, 1 hora, 1 dia, 3 dias, 7 dias (predefinição) ou 30 dias. Os dados ficam no dispositivo e são verificados ao reabrir a área.

## Sem internet {#offline}

O OpenFireMap não é um mapa offline. As áreas em cache podem continuar visíveis, mas novas áreas e pesquisas precisam de internet. Use uma [planta impressa](../town-plan/) ou uma [exportação](../export/).

## Carregamento demorado {#laden}

Aproxime para reduzir a consulta e tente novamente mais tarde. Se todos os servidores Overpass estiverem sobrecarregados, terá de esperar.

:::warn Não é uma ferramenta operacional
Os dados podem estar incompletos, desatualizados ou incorretos e não substituem informações dos centros de emergência ou empresas de água. Em emergência, ligue para o número local.
:::
