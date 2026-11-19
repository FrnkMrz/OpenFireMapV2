---
title: Accessibility
description: Using OpenFireMap with a keyboard, screen reader, magnification and reduced motion – what works, how it works and what has not been tested yet.
eyebrow: Accessibility
lead: OpenFireMap should work for everyone, including without a mouse, with a screen reader or with strong magnification. Here is how, and where gaps remain.
order: 9
---

## Our goal {#ziel}

The map follows the **WCAG 2.2, level AA** guidelines. Every change to OpenFireMap goes through automated checks: keyboard operation, screen reader labels, colour contrast, display at 400% zoom and minimum size of controls. This help and the map symbols page are checked the same way.

:::note Honest status
Automated checks do not find everything. A test with a real screen reader on a device is still to be done. If you notice something, please write to us (contact below). Every hint helps.
:::

## With a keyboard {#tastatur}

Everything you can do with a mouse also works with a keyboard:

| Key | Effect |
|---|---|
| <kbd>Tab</kbd> | to the next control. The first tab stop is “Skip to map”. |
| Arrow keys | pan the map when it has focus |
| <kbd>+</kbd> and <kbd>−</kbd> | zoom in and out |
| <kbd>Tab</kbd> from zoom level 17 | from symbol to symbol on the map |
| <kbd>Enter</kbd> or <kbd>Space</kbd> on a symbol | open details; for hydrants also draw the 100 metre circle |
| <kbd>Escape</kbd> | close details, circle, menus and dialogs; cancel area selection in the export |

Focus is always clearly visible. When a menu or dialog opens, focus moves into it and stays there until you close it. It then returns to the button that opened it.

**Export without a mouse:** in the export menu, **Use visible area** takes the current map view as the selection. You do not need to drag a rectangle. [Export](../export/) explains the rest.

**Town plan without a mouse:** in step 3 of the assistant, select title, legend and the other boxes with <kbd>Tab</kbd> and move them with the arrow keys, with <kbd>Shift</kbd> in larger steps. <kbd>Alt</kbd> + arrow keys resizes the map. More under [Town plan](../town-plan/#schritt-3).

## With a screen reader {#screenreader}

- **Map:** the map is marked up as a named region and explains how to use it with a keyboard.
- **Symbols:** from zoom level 17, every symbol has a name, for example “Hydrant” with type and number. When you open the details with <kbd>Enter</kbd>, the screen reader reads them out.
- **Messages:** notices such as “Link copied” or loading errors are announced, errors with priority. The status box with zoom and data date is deliberately silent, so it does not speak every time you pan.
- **Languages:** all screen reader labels exist in all languages of the map. This help is available in German and English.

:::tip Many symbols at once
Below zoom level 17, the dots on the map cannot be reached one by one, otherwise there would be hundreds of tab stops. Zoom in with <kbd>+</kbd> until the symbols appear.
:::

## Seeing and magnifying {#sehen}

- **Contrast:** text on the panels reaches at least a contrast ratio of 4.5:1, large text and symbols 3:1. Because the panels are semi-transparent over the map, OpenFireMap measures contrast against both light and dark map backgrounds.
- **Magnifying:** you can zoom the page in your browser up to 400%. It then switches to the narrow view with a menu, and all menus stay reachable and scrollable.
- **Not colour alone:** hydrants differ not only by colour but also by the letter in the symbol (U, O, Ø …).
- **Background:** for weak contrast or glare, the **Print (Light)** or **Night (Dark)** backgrounds help. See [Layers & symbols](../layers/).

## Motion {#bewegung}

If **Reduce motion** is switched on in your operating system, OpenFireMap does without animations: the map jumps when searching and locating instead of flying. This help also shows no motion then.

## On a smartphone {#smartphone}

Controls are at least 24 × 24 pixels. You open a symbol's details with a tap, from zoom level 17. With VoiceOver or TalkBack you reach the buttons through the menu at the top left. More under [Map on a smartphone](../phone/).

## Not yet tested {#offen}

- a full test with screen readers on devices (VoiceOver, TalkBack, NVDA)
- contrast of the symbols against all background maps, especially satellite
- using the town plan assistant with a screen reader

## Found a barrier? {#melden}

Tell us what did not work, with which device, browser and screen reader if any: **[info@openfiremap.org](mailto:info@openfiremap.org)**. If you are technically minded, you can also open an [issue on GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).
