---
title: Adicionar hidrantes
description: Adicione hidrantes, pontos de água e desfibrilhadores ao OpenStreetMap.
eyebrow: Contribuir
lead: Todos os hidrantes do mapa foram adicionados por alguém. Pode adicionar os que faltam com uma conta gratuita do OpenStreetMap.
order: 7
---

## Antes de começar {#vorher}

O OpenFireMap mostra dados do [OpenStreetMap](https://www.openstreetmap.org/) (OSM). A edição é feita no OSM, não no OpenFireMap.

:::steps
1. Crie uma conta em openstreetmap.org.
2. Confirme o endereço de e-mail.
3. Inicie sessão numa das ferramentas abaixo.
:::

:::warn Três regras
- Adicione apenas o que verificou pessoalmente no local.
- Não copie plantas protegidas sem autorização.
- Ao guardar, descreva brevemente a alteração.
:::

## Escolher uma ferramenta {#werkzeug}

| Situação | Ferramenta |
|---|---|
| No local com telemóvel | **Hydrantenjäger** |
| Completar dados durante um passeio | **StreetComplete** ou **Every Door** |
| Editar no computador | editor **iD** |
| Trabalho avançado ou muitos hidrantes | **JOSM** ou **Vespucci** |

## Com Hydrantenjäger {#hydrantenjaeger}

Inicie sessão com a conta OSM, fique a poucos metros do hidrante, escolha tipo e posição e carregue. Indique diâmetro e número apenas se os souber. Consulte o [guia](https://hydrantenjaeger.de/help/).

## StreetComplete ou Every Door {#apps}

O StreetComplete ajuda a completar dados de objetos existentes. O Every Door permite adicionar pontos: escolha **Fire Hydrant** e preencha os campos.

## Com o editor iD {#id}

:::steps
1. Inicie sessão em openstreetmap.org e aproxime o mapa do local.
2. Escolha **Edit** e coloque o ponto exatamente no hidrante.
3. Pesquise “hydrant” e escolha **Fire Hydrant**.
4. Preencha tipo, posição e detalhes conhecidos.
5. Escolha **Save**, escreva um comentário curto e carregue as alterações.
:::

Também pode corrigir objetos existentes da mesma forma. Só elimine um hidrante se confirmar que já não existe.

## JOSM ou Vespucci {#josm}

O [JOSM](https://josm.openstreetmap.de/) para computador e o [Vespucci](https://vespucci.io/) para Android mostram todas as etiquetas e são adequados a tarefas maiores.

## Etiquetas importantes {#tags}

| Objeto | Etiqueta |
|---|---|
| Hidrante | `emergency=fire_hydrant` |
| Tipo | `fire_hydrant:type=underground` (também pillar, wall, pipe) |
| Diâmetro | `fire_hydrant:diameter=80` |
| Número | `ref=123` |
| Ponto de aspiração | `emergency=suction_point` |
| Depósito de água | `emergency=water_tank` |
| Desfibrilhador | `emergency=defibrillator` |
| Quartel | `amenity=fire_station` |

Consulte [símbolos do mapa](/symbols/) e a [wiki do OpenStreetMap](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant).

## Quando aparece a alteração? {#anzeige}

O hidrante aparece quando o Overpass processa a alteração. O prazo varia. Consulte [Dados e atualidade](../data/#verzoegerung).
