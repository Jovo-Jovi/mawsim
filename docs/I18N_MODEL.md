# MAWSIM — i18n model

Precedence 6.

## 1. Locales

| Locale | Language | Direction | Font | Default |
|---|---|---|---|---|
| `ar` | Arabic (Egypt) | `rtl` | IBM Plex Sans Arabic | yes (D-01) |
| `en` | English | `ltr` | Inter | — |

`src/i18n/config.ts` exports `locales = ["ar", "en"] as const`, `defaultLocale = "ar"`, the `Locale` type,
`isLocale()` and `directionOf(locale)`.

## 2. Language from the URL only

Every page is under `src/app/[locale]/`. The root layout sets `<html lang={locale} dir={directionOf(locale)}>` from the
route parameter, never a literal (`guard:i18n`). `/` redirects to `/ar` with one temporary (307) redirect, the only
redirect in the product: `/ar…` and `/en…` never redirect, so there is no loop. Nothing about the visitor (header,
cookie, device) chooses the language. The header's language link goes to the **same page** in the other locale,
keeping the guide's query parameters (a page that exists in one locale exists in both); it is labelled in the target
language (`العربية` / `English`) with `lang` and `hreflang` set.

**Arabic first, both adapted.** The Arabic layout is the primary composition: RTL reading order, navigation starting
from the right, IBM Plex Sans Arabic with its own size and line height, no letter-spacing or case changes, and copy
written for Arabic readers. The English layout is its LTR adaptation with Inter's own scale. Neither is a translated
copy of the other (`docs/DESIGN_SYSTEM.md` §5, UA-07).

## 3. Catalogues

`src/i18n/messages/en.json` and `ar.json`, identical keys, no empty value (`guard:i18n`). A typed getter loads the
catalogue for a locale on the server (no i18n library: the App Router's dictionary pattern is enough). Produce names
and tips come from the data (`en`/`ar`, `tip_en`/`tip_ar`). Month names are catalogue keys `months.1` … `months.12`.

## 4. Direction and layout

- Logical properties only (`margin-inline-start`, `padding-block`, `inset-inline-end`, `text-align: start`);
  `guard:design` fails physical ones.
- Direction-bearing glyphs (arrows, the month scroller's order, the season bar) follow the inline direction: the
  season bar and scroller run January → December from the inline start, so right to left in Arabic.
- A Latin string inside Arabic text (none planned) is wrapped in `<bdi>`.

## 5. Numerals

Months are shown by name from the catalogue, never as a bare number. Where a count is shown
(for example "4 in season"), it uses `Intl.NumberFormat(locale)`: Western digits in `en`, the locale default in `ar`
(`ar` → Arabic-Indic digits). *Assumption:* `ar` (not `ar-EG` specific options) is acceptable for Egyptian readers.

## 6. Metadata

Each page sets a localised `<title>` and description, and `alternates.languages` pointing to the other locale.
Photograph alt text comes from the manifest by locale (`alt_ar`, `alt_en`).
