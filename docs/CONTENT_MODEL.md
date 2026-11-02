# MAWSIM — Content model

Precedence 3. There is no database (`stores_data` false); the content is one developer-owned file.

## 1. `content/produce.json`

A JSON array of `Produce` rows, the developer's sample data (OD-06), byte-identical to
`devos/intake-docs/produce.json`. The builder never edits it.

| Field | Type | Rule |
|---|---|---|
| `slug` | string | unique, lowercase `a-z` and `-`; the route segment of the produce page |
| `en` | string | English name, non-empty |
| `ar` | string | Arabic name, non-empty |
| `kind` | `"fruit"` · `"vegetable"` · `"leafy"` | the `ProduceKind` |
| `months` | number[] | `SeasonMonths`: unique integers 1–12, at least one |
| `tip_en` | string | English `StorageTip`, non-empty |
| `tip_ar` | string | Arabic `StorageTip`, non-empty |

Ten rows today: tomato, mango, orange, strawberry, watermelon, guava, pomegranate, okra, molokhia, dates (count:
`node -e "console.log(require('./content/produce.json').length)"` → `10`).

## 2. How the product reads it

- Only `src/modules/produce/` imports the file. It exposes typed functions through `src/modules/produce/index.ts`
  (for example `listProduce()`, `getProduceBySlug(slug)`), and the pure season logic lives in `src/domain/`.
- A unit test checks every rule of §1 against the real file; a broken row fails `pnpm run test`.
- Order on screen: the file's order, within a filter (no ranking is invented).

## 3. Routes

| Route | Source |
|---|---|
| `/{locale}` | rows in season this month |
| `/{locale}/guide?month=&kind=` | rows filtered by `CalendarMonth` (default this month) and `ProduceKind` (default all); an invalid value falls back to the default |
| `/{locale}/produce/{slug}` | one row; an unknown slug is a 404 |
| `/{locale}/about` | catalogue strings and the photo credits (§5) |
| `/` | redirects to `/ar` (D-01) |

## 4. Interface strings

Every string that is not produce data is in `src/i18n/messages/en.json` and `ar.json` (`docs/I18N_MODEL.md`). Month
names come from the catalogues (Egyptian Arabic usage: يناير … ديسمبر), never from the visitor's device.

## 5. Photographs (`content/photos.json` + `public/photos/`)

The licence manifest of every photograph (OD-09), developer-owned like the produce rows. It is an empty array today;
the developer adds a row with each licensed image. Image files live in `public/photos/` (the hero in
`public/photos/hero/`, produce in `public/photos/produce/`), self-hosted, never hotlinked. The builder never edits
either.

| Field | Type | Rule |
|---|---|---|
| `key` | string | `"hero"` or a `slug` of `content/produce.json`; unique |
| `file` | string | a path under `/photos/` that exists in `public/` (`.avif`, `.webp` or `.jpg`) |
| `width`, `height` | number | the file's pixel size; at least 1600 wide for the hero, 1200 for produce |
| `alt_en`, `alt_ar` | string | what the photograph shows, in each language, non-empty |
| `author` | string | the photographer or rights holder, non-empty |
| `source_url` | string | the page the image was licensed from (an `https://` link, shown as a credit link only) |
| `licence` | string | the licence's name, non-empty (for example a stock licence or a written permission) |
| `licence_url` | string | where the licence or permission can be read (`https://`) |
| `credit_required` | boolean | `true` when the licence asks for attribution; the about page lists those credits (and may list all) |

A unit test (T05) checks every rule against the real file. A produce or hero slot without a row shows the designed
fallback in the same frame (`docs/DESIGN_SYSTEM.md` §6, §11).
