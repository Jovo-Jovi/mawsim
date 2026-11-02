# MAWSIM — Glossary

Precedence 1 (with `PRODUCT_BRIEF.md`). The vocabulary every document, type, route and field uses.

## 1. Entities (exact PascalCase names)

| Name | Meaning | Arabic (interface) |
|---|---|---|
| `Produce` | one fruit, vegetable or leafy green in `content/produce.json`, found by its `slug` | منتج زراعي (copy uses the produce's own name) |
| `ProduceKind` | the produce's kind: `fruit` · `vegetable` · `leafy` (shown as "Leafy greens") | فاكهة · خضار · ورقيات |
| `CalendarMonth` | a month number, 1 (January) to 12 (December) | شهر |
| `SeasonMonths` | the `CalendarMonth`s a `Produce` is in season (`months` in the data) | موسم |
| `StorageTip` | the produce's storage tip in one locale (`tip_en`, `tip_ar`) | نصيحة الحفظ |
| `ProducePhoto` | a licensed photograph of a `Produce` (or the hero), with its manifest row in `content/photos.json` | صورة |
| `PhotoCredit` | the author, source and licence of a `ProducePhoto`, shown on the about page | حقوق الصورة |
| `Locale` | `ar` (default) or `en`, read from the URL only | — |
| `Direction` | `ltr` or `rtl`, derived from the `Locale` | — |

## 2. Terms

- **In season** — a `Produce` whose `SeasonMonths` includes the given `CalendarMonth`.
- **This month** — the current `CalendarMonth` in Egypt (`Africa/Cairo`), computed on the server.
- **Kind chip** — a link on the guide page that filters the card grid by `ProduceKind` (or shows all).
- **Month scroller** — the row of twelve month links on the guide page.
- **Season bar** — the twelve-cell bar on a produce page; in-season months are filled.
- **Sample-data notice** — the line that says the data is sample data, not farming or nutrition advice (OD-06).
- **Photo frame** — the fixed-ratio slot a `ProducePhoto` fills; without one it shows the **fallback tile** (the
  kind-colour tile with the season ring) in the same size (OD-09).

## 3. Forbidden bare nouns

A bare noun below is a defect in a type, interface, class, enum, route segment or content field name
(`guard:naming`). Copy and local variables are outside the rule.

```
item · items · product · products · category · categories · season · month · tip · data · info · user · users · account · order · price · cart · record · entry · type
```

Qualified replacements:

- `item`, `entry`, `record`, `data`, `info` → name the entity: `Produce`, `StorageTip`, `CalendarMonth`.
- `product` → `Produce` (Mawsim sells nothing; "product" implies a shop).
- `category` → `ProduceKind`.
- `season` → `SeasonMonths` (the months), or "in season" (the predicate `isInSeason`).
- `month` → `CalendarMonth`.
- `tip` → `StorageTip`.
- `user`, `account` → **forbidden**: Mawsim has no accounts and knows nothing about its visitors.
- `order`, `price`, `cart` → **forbidden**: nothing is sold.
- `type` → name what it types (`ProduceKind`).
