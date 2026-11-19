---
title: O mapa num computador
description: Pesquisa, localização, camadas, detalhes dos hidrantes, partilha e teclado.
eyebrow: Mapa
lead: As ferramentas estão no canto superior esquerdo e a data dos dados no canto inferior direito. Veja o que faz cada botão.
order: 1
---

## Visão geral {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap num computador.
:::

1. **Pesquisar:** encontre um local ou endereço.
2. **A minha localização:** mostre onde está.
3. **Camadas do mapa:** altere o fundo.
4. **Exportar:** guarde uma planta ou pontos.
5. **Partilhar:** copie uma ligação para esta vista.
6. **Hidrante:** passe o cursor para ver detalhes ou clique para mostrar um raio de 100 metros.
7. **Estado:** nível de zoom e data dos dados.
8. **Informações e legal:** ajuda, símbolos e informações jurídicas.

## Encontrar um local {#suche}

Escreva um local, rua ou endereço na pesquisa e prima <kbd>Enter</kbd> ou a lupa. O mapa vai para o primeiro resultado no nível 16. A pesquisa usa Nominatim e encontra locais e moradas, não hidrantes individuais.

## A minha localização {#standort}

O botão mostra a sua posição e aproxima para o nível 17. O navegador pede autorização na primeira utilização. A posição não é guardada.

:::tip Sem localização?
Verifique se o navegador permite a localização em openfiremap.org. Num computador sem GPS, a posição pode ser aproximada.
:::

## Hidrantes e outros objetos {#objekte}

| Zoom | O que aparece |
|---|---|
| abaixo de 12 | nenhum objeto |
| a partir de 12 | quartéis |
| a partir de 14 | símbolos dos quartéis e limites municipais |
| a partir de 15 | hidrantes, pontos de água e desfibrilhadores |
| a partir de 17 | símbolos com letras |
| a partir de 18 | detalhes ao passar o cursor |

:::figure marker frame=plain
Clicar num hidrante desenha um raio de 100 metros.
:::

A partir do nível 18, passe o cursor sobre o símbolo para ver os detalhes. Com o teclado, selecione-o com <kbd>Tab</kbd> desde o nível 17 e prima <kbd>Enter</kbd>. O raio surge desde o nível 16; depois de usar **A minha localização**, uma linha mostra também a distância. Os dados vêm do OpenStreetMap. Consulte [Contribuir](../contribute/) para completar informações.

Veja [Camadas e símbolos](../layers/) para conhecer cores e símbolos.

## Camadas do mapa {#ebenen}

O botão do mapa oferece fundos padrão, impressão, noite, satélite, topográfico, OSM e BayernAtlas. Os objetos dos bombeiros aparecem sempre por cima.

## Partilhar e ligações {#teilen}

O botão de partilha copia uma ligação para esta vista exata, incluindo local, zoom e fundo. O endereço do navegador acompanha o mapa e pode ser guardado como favorito.

## Estado e data dos dados {#status}

No canto inferior direito aparecem o zoom e a data. “+Sync” indica que foram carregadas alterações recentes. “Data status details” mostra a origem e a antiguidade. Consulte [Dados e atualidade](../data/).

## Informações, legal e definições {#info}

“Info & Legal” contém ligações para esta ajuda, símbolos, sobreposição, privacidade e licenças. Também permite configurar a cache local: desligada, 1 hora, 1 dia, 3 dias, 7 dias (predefinição) ou 30 dias.

## Com teclado {#tastatur}

- O primeiro <kbd>Tab</kbd> leva a “Ir para o mapa”.
- As setas deslocam o mapa; <kbd>+</kbd> e <kbd>−</kbd> alteram o zoom.
- Desde o nível 17, use <kbd>Tab</kbd> para percorrer símbolos. <kbd>Enter</kbd> ou <kbd>Espaço</kbd> abre detalhes; <kbd>Escape</kbd> fecha.
- Nos menus e diálogos, o foco permanece até fechar.
- Na exportação, **Use visible area** seleciona a vista atual sem desenhar um retângulo.
