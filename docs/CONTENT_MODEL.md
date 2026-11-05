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

## 5. Photographs (`content/photos.json` + `public/photos/`) — version 2 (OD-10)

The manifest of every image in a photo frame (OD-09, amended by OD-10), developer-owned like the produce rows. It is
an empty array until the owner adds images. Image files live in `public/photos/`: the hero in `public/photos/hero/`,
produce in `public/photos/produce/`, the background texture in `public/photos/texture/`. They are self-hosted and never
hotlinked. The builder never edits either. The owner writes rows by hand or with `scripts/images/generate.mjs`
(OD-10 §3), which he runs on his own computer.

**Every row:**

| Field | Type | Rule |
|---|---|---|
| `key` | string | `"hero"`, `"texture"` or a `slug` of `content/produce.json`; unique |
| `file` | string | a path under `/photos/` that exists in `public/` (`.avif`, `.webp`, `.jpg` or `.png`), with no `..` |
| `width`, `height` | number | the file's pixel size, positive integers; width at least 1600 for the hero, 1200 for produce, 1024 for the texture |
| `alt_en`, `alt_ar` | string | what the image shows, in each language, non-empty (the texture is drawn with empty alt text because it is decorative; its alt text names it in the credits) |
| `source` | string | `"generated"`, `"licensed"` or `"own"` (OD-10 §2) |
| `credit_required` | boolean | `true` when the about page must credit it; the generator always writes `true` |

**And the fields of its source** (a row carries exactly these; any other key is ignored, never copied):

| `source` | Field | Rule |
|---|---|---|
| `generated` | `model` | the model id, non-empty (for example `grok-imagine-image-2.0`) |
| `generated` | `prompt` | the prompt that made the image, non-empty |
| `generated` | `generated_on` | the date, `YYYY-MM-DD`, a real calendar date |
| `generated` | `terms_url` | the provider's terms of use (`https://`) |
| `licensed` | `author` | the photographer or rights holder, non-empty |
| `licensed` | `source_url` | the page the image was taken from (`https://`, shown as a credit link only) |
| `licensed` | `licence` | the licence's name, non-empty: Unsplash License, Pexels License, CC0 or CC BY (never share-alike, non-commercial or unclear) |
| `licensed` | `licence_url` | where the licence or permission can be read (`https://`) |
| `own` | `author` | who made it for Mawsim, non-empty (for example `Mawsim`) |

A unit test checks every rule against the real file. A slot without a row shows its designed fallback: for the hero
and produce, the kind-colour tile in the same frame (`docs/DESIGN_SYSTEM.md` §6, §11); for the texture, the SVG pattern
(§12).
