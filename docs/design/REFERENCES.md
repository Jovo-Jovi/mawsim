# MAWSIM — Design references

The developer's references first (images kept in `docs/design/references/`, notes in
`devos/intake-docs/mwasim-ref.txt`), then the library picks (`docs/method/DESIGN_METHOD.md` §5). A reference is
learned from, never copied: no layout, illustration, photography, logo, copy or code is reproduced (PR-59).

| Ref | Source | What we take | What we leave |
|---|---|---|---|
| R1 | `ref-hero-motion.png` (developer; "Animated Hero Website Design") | a hero with one confident, oversized headline beside a single bold visual; the energy of saturated fruit colour against a flat field; a pill-shaped active state in the navigation | the diagonal two-colour split, the exploding-strawberry render, the cart and price, the social rail, the shop copy, the side pager dots |
| R2 | `ref-layout-sections.png` (developer; "Food Website Layout") | editorial pacing: a large serif-like headline scale, small letter-spaced overlines, generous negative space, tall narrow panels in a row, a hairline rule under a label | the organic blob masks, the dark moody photography, the script annotations, the circular badge, the stats row, the farmer story |
| R3 | `ref-seasonal-editorial.png` (developer) | the abundance of a market spread: many produce colours side by side, warm oranges with deep greens, the idea that colour itself says "in season" | the photograph itself (it is not licensed to Mawsim); its art direction informs `DESIGN_SYSTEM.md` §11 |
| R4 | `ref-visual-style.png` (developer) | a tight, centred wordmark set large over a rich field; deep cabbage green as a ground colour for the dark theme | the serif wordmark, "EST. 2023", the dark photo background |
| R5 | `mwasim-ref.txt` — brand line (developer) | warm sand background, deep Nile green, terracotta accent; Inter and IBM Plex Sans Arabic; cream backgrounds, orange, lemon yellow and tomato red accents; large, beautiful fruit and vegetable photography (licensed, OD-09); rounded cards; subtle glass | heavy glass |
| R6 | `mwasim-ref.txt` — "Food Dashboard UI" (developer, title only, no image or link) | — | not used: Mawsim has no dashboard (A-09) |
| R7 | `mwasim-ref.txt` — "Organic Color Palette" (developer, title only) | the principle of earth-derived hues with one fresh green | — |
| L1 | DESIGN_METHOD §5.2, type `web-app` | quick feedback, motion only for state, keyboard paths first | dense dashboard layouts (Mawsim is a reading guide, closer to editorial) |
| L2 | DESIGN_METHOD §5.1 — CSS transitions and scroll-driven animations | all motion, with no dependency | — |
| L3 | `devos/skills/` — `frontend-design`, `taste/references/{type,colour,layout}.md`, `impeccable/reference/{typeset,layout,colorize,operate}.md` (Blueprint rows of `devos/skills/INDEX.md`) | the type scale, the colour roles, the layout grid and the craft floor used in `DESIGN_SYSTEM.md` | any default look they describe |
| L4 | Galleries (Refero, Mobbin; DESIGN_METHOD §5.2 for `web-app`) — not browsed by the blueprint; a fence may cite one for a pattern | the common convention of a horizontally scrolling, snap-aligned month row | any specific site's look |

**Version 2 (OD-10, issue #17).** The request names no new screenshot or link. It names libraries and sources, which
are recorded here with what Mawsim takes and leaves.

| Ref | Source | What we take | What we leave |
|---|---|---|---|
| L5 | DESIGN_METHOD §5.1 — three.js and React Three Fiber (MIT) | real 3D for one small, slowly turning scene of stylised produce built in code (`DESIGN_SYSTEM.md` §13) | Drei, model files, post-processing, any scene from an example or gallery |
| L6 | The owner's imagery sources (issue #17 thread): `grok-imagine-image-2.0`; the Unsplash License, the Pexels License, CC0 and CC BY on Wikimedia Commons and Openverse | images made or chosen for Mawsim under `DESIGN_SYSTEM.md` §11, each with its manifest row | any image without a usable licence, share-alike or non-commercial terms, and any reference screenshot |

**Version 3 (OD-11, issue #28).** The request names two families of sites by name, with no link or image, and two
libraries. Nothing was fetched. Each is recorded with what Mawsim takes and what it leaves.

| Ref | Source | What we take | What we leave |
|---|---|---|---|
| R8 | Anthropic's sites, named in issue #28 ("calm and typographic") | motion that serves the words: a headline that changes like a turned page, a quiet cross-fade in a fixed slot, generous space around one idea, and no bounce or flourish | their typefaces, colours, illustrations, layouts, copy and code; any specific page |
| R9 | Apple's product pages, named in issue #28 ("scroll-driven and pinned") | a section that holds still while the scroll scrubs one story through it, step by step, and lets go at the end; the scroll as the only clock | the product photography, the scale of the type, the black stage, any sequence, layout or code; the device-frame imagery |
| L7 | DESIGN_METHOD §5.1: GSAP (`gsap`: core, ScrollTrigger, Flip; GreenSock's Standard "no charge" licence) | the year story's scrubbed timeline and the guide's shared-layout re-sort (`DESIGN_SYSTEM.md` §7, §13) | `@gsap/react`, every other plugin, any demo or CodePen effect |
| L8 | DESIGN_METHOD §5.1: Lenis (`lenis`, MIT) | smooth scrolling for the home page's story, off under reduced motion | Lenis on any other page; scroll-jacking of any kind (snap, inertia that keeps moving, hijacked keys) |

L5 (three.js and React Three Fiber) is retired in version 3: the hero scene is removed (OD-11 §6).
