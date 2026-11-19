---
title: Acessibilidade
description: Usar o OpenFireMap com teclado, leitor de ecrã, ampliação e movimento reduzido.
eyebrow: Acessibilidade
lead: O OpenFireMap deve funcionar sem rato, com leitor de ecrã e com grande ampliação. Veja as funções e limitações conhecidas.
order: 8
---

## O nosso objetivo {#ziel}

O mapa segue as orientações WCAG 2.2 nível AA. As verificações automáticas analisam teclado, etiquetas, contraste, ampliação a 400% e tamanho dos controlos.

:::note Estado atual
As verificações automáticas não detetam tudo. Ainda faltam testes completos com leitores de ecrã em dispositivos. Avise-nos se encontrar um problema.
:::

## Com teclado {#tastatur}

| Tecla | Ação |
|---|---|
| <kbd>Tab</kbd> | controlo seguinte; o primeiro é “Ir para o mapa” |
| Setas | deslocar o mapa quando tem o foco |
| <kbd>+</kbd>/<kbd>−</kbd> | aproximar e afastar |
| <kbd>Tab</kbd> a partir do nível 17 | percorrer símbolos |
| <kbd>Enter</kbd>/<kbd>Espaço</kbd> | abrir detalhes |
| <kbd>Escape</kbd> | fechar detalhes, menus e diálogos |

O foco está sempre visível. Na exportação, **Use visible area** seleciona a vista atual sem arrastar. Na planta, mova os elementos com as setas.

## Com leitor de ecrã {#screenreader}

O mapa é uma região identificada; os símbolos têm nomes e as notificações são anunciadas. A caixa de estado permanece silenciosa durante os movimentos. As etiquetas existem em todos os idiomas do mapa. Esta ajuda está disponível em português, alemão e inglês.

:::tip Muitos símbolos
Abaixo do nível 17, os pontos não podem ser percorridos individualmente, evitando centenas de paragens. Aproxime com <kbd>+</kbd> até surgirem os símbolos.
:::

## Visão e ampliação {#sehen}

- O contraste foi verificado em fundos claros e escuros.
- Com ampliação do navegador a 400%, a interface passa para uma vista estreita com menu.
- Os hidrantes também se distinguem pelas letras, não apenas pela cor.
- **Print (Light)** e **Night (Dark)** podem ajudar com o encandeamento.

## Movimento {#bewegung}

Com “Reduce motion” ativo no sistema, o mapa salta para os resultados sem animações.

## Telemóvel {#smartphone}

Os controlos têm pelo menos 24 × 24 píxeis. Toque num símbolo para abrir detalhes. VoiceOver e TalkBack permitem percorrer os botões do menu. Consulte [O mapa num telemóvel](../phone/).

## Ainda não testado {#offen}

- testes completos com VoiceOver, TalkBack e NVDA
- contraste dos símbolos em todos os fundos, especialmente satélite
- assistente da planta com leitor de ecrã

## Comunicar uma barreira {#melden}

Escreva para **[info@openfiremap.org](mailto:info@openfiremap.org)** e indique dispositivo, navegador e leitor de ecrã. Também pode abrir um [problema no GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).
