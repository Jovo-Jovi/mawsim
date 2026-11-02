# MAWSIM — Development journal

Append-only. Newest last.

## 2026-11-02 — Blueprint

`devos init` ran the blueprint (Claude Code, `claude-opus-5-5`). It read the developer's answers, `mwasim-ref.txt`,
`produce.json` and the four reference images; chose Profile A adapted (no personal data, no database); wrote the fit
research, brief, glossary, stack, decisions OD-01 to OD-08, scope, the content, boundary, security and i18n models,
the design contract ("Almanac in the sun"), the ten-task ledger and fence T01; copied the sample data byte for byte
to `content/produce.json`; and configured `devos/project.json` (screens, i18n catalogues, modules `produce`,
`guide`, `home`). Open questions: photography, and the default locale.

## 2026-11-02 — Blueprint revision: the developer's answers

Arabic becomes the default language: `/` redirects to `/ar` (one temporary redirect, no loop), `/en` stays fully
supported, the language link keeps the equivalent page, and Arabic is the primary composition (D-01, I18N_MODEL §2,
UA-20). Licensed photography joins the identity (OD-09): a licence manifest `content/photos.json` (empty until the
developer adds images), self-hosted files in `public/photos/` (outside the builder's surface), `next/image` frames
with a designed fallback, art direction in DESIGN_SYSTEM §11, credits on the about page, and a new task T05 (photo
slots); later tasks renumbered to T06–T11. Pinterest pins are not a licence; no image was sourced by the blueprint.
Fence T01 now sets `defaultLocale = "ar"`.
