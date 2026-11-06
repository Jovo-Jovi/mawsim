# MAWSIM — Product brief

Precedence 1 (with `GLOSSARY.md`). Derived from `devos/answers.json` (the developer's brief, which wins over every
attached document) and `devos/intake-docs/`.

## 1. What it is

**Mawsim** (موسم, "season" in Arabic) is a small bilingual guide that shows which fruits and vegetables are in season
in Egypt, month by month, in English and Arabic. It is a test product; its data is sample data, not farming or
nutrition advice.

## 2. Who it is for

People in Egypt who shop at markets and want to know what is fresh now, on a phone or a laptop, in English or Arabic.

## 3. Pages

| # | Page | Route | What it shows |
|---|---|---|---|
| B-1 | Home | `/{locale}` | an animated hero and "in season this month": the `Produce` in season in the current month in Egypt |
| B-2 | Guide | `/{locale}/guide` | a 12-month scroller and kind chips (fruit, vegetable, leafy greens) that filter a card grid of `Produce` |
| B-3 | Produce | `/{locale}/produce/{slug}` | one `Produce`: its names, kind, a 12-month season bar and its storage tip |
| B-4 | About | `/{locale}/about` | what Mawsim is, that its data is sample data and not advice, and that it collects nothing |

`{locale}` is `ar` (the default) or `en`. `/` redirects to `/ar` (D-01).

## 4. Standing rules (from the brief)

- **R-1** No accounts, forms, search box, cookies, browser storage, analytics or trackers. (Amended by OD-12, issue
  #36: one exception, the `localStorage` key `mawsim-theme` holding the visitor's theme choice in their own browser.
  It is never sent anywhere and is kept in the zone `theme-preference`. Everything else on this list stands.)
- **R-2** Every control is a button or a link.
- **R-3** The colour theme follows the system (light and dark). (Amended by OD-12, issue #36: following the system is
  the default, "System". A header switch also offers Light and Dark, revealed as a circle from the switch, and the
  choice is remembered across pages and visits.)
- **R-4** The language comes from the URL (`/ar/…`, `/en/…`). Arabic is the default (`/` → `/ar`) and is laid out
  right to left with its own typography, navigation, spacing and alignment; English is laid out left to right. Both
  are adapted designs, not translations of one layout. Switching language keeps the equivalent page. No broken link,
  wrong direction or redirect loop in either language.
- **R-5** Motion is calm and purposeful, and it respects reduced motion. (Amended by OD-10, issue #17: purposeful
  motion now includes a slowly turning 3D hero scene that can be paused, card hover and focus feedback, and a reveal
  on scroll once. It stays calm.) (Amended by OD-11, issue #28: the 3D scene is removed. One twelve-month year dial
  carries the motion: the home page's year story turns with the scroll and stops when the scroll stops, the guide's
  dial picks the month and the cards re-sort, and the produce page's season arc draws in once. Nothing plays by
  itself. B-2's month scroller becomes the dial, with a year chart view; B-3's season bar becomes the season arc.)
- **R-6** Mobile-first; works at 390 and 1280 wide.
- **R-7** Accessible to WCAG 2.2 AA.
- **R-8** No layout shift.
- **R-9** The data is sample data, not farming or nutrition advice, and the product says so.
- **R-10** Licensed, high-quality fruit and vegetable photography is part of the visual identity: authentic, fresh,
  appetising, with consistent lighting and composition, optimised and responsive. Every image's licence allows
  commercial use. Until a licensed image exists for a slot, the designed fallback shows in the same frame (OD-09). (Amended by
  OD-10, issue #17: images generated for Mawsim, open photographs whose licence allows commercial use, and Mawsim's
  own artwork are all allowed, in that order of preference, each recorded in `content/photos.json`.)

## 5. The core flow

A shopper opens Mawsim at `/` and lands on the Arabic home page (or opens `/en`) → sees what is in season this month on the home page → opens the guide,
picks a month and a kind → opens a produce page and reads its season bar and storage tip → switches language and
lands on the same page in the other language.

## 6. The data

Ten sample `Produce` rows in `content/produce.json`, supplied by the developer: `slug`, `en`, `ar`, `kind`
(`fruit` · `vegetable` · `leafy`), `months` (1–12) and a storage tip in each language (`tip_en`, `tip_ar`).
`docs/CONTENT_MODEL.md` describes it.

## 7. Brand notes (developer)

From `devos/intake-docs/mwasim-ref.txt`: warm sand background, deep Nile green, a terracotta accent; fonts IBM Plex
Sans Arabic and Inter; warm cream backgrounds, fresh green as the primary, orange, lemon yellow and tomato red as
accents; large fruit and vegetable photography; rounded cards and subtle glass effects; English and Arabic typography
with proper RTL support. `docs/DESIGN_SYSTEM.md` turns these into the design contract.

The developer's answers to the blueprint's questions (2026-11-02): photography is part of the identity (R-10,
OD-09), and Arabic is the default language (R-4, D-01).
