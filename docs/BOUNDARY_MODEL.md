# MAWSIM — Boundary model

Precedence 4. The non-waivable gate of Profile A (handbook §10.2). No OD can waive it.

<!-- devos:boundary {"profile":"A","zones":[{"name":"health","src":["src/app/api/health/**"],"urls":["/api/health"],"personal_data":false},{"name":"theme-preference","src":["src/components/theme/theme-storage.ts","src/components/theme/theme-storage.test.ts","public/theme-init.js","tests/theme-init.test.ts","e2e/theme-switch.spec.ts"],"urls":[],"personal_data":false}]} -->

## 1. The rule

No table, column, bucket, form, route handler or log accepts or keeps a visitor's data. Mawsim has no table or bucket
at all.

## 2. What is forbidden everywhere

- `<form>`, `<input>`, `<textarea>`, `<select>` — every control is a button or a link (R-2).
- Cookies (`document.cookie`, `cookies()`), `localStorage`, `sessionStorage`, `indexedDB`. The one exception is the
  zone `theme-preference` (OD-12): only its files (§3) may read and write the single `localStorage` key `mawsim-theme`
  (`light` · `dark` · `system`). That value is never sent, logged or read by the server, and no other key, cookie or
  store is allowed there either.
- `sendBeacon`, analytics and trackers of any kind, third-party scripts, third-party hosts in source.
- Hotlinked images: every photograph is a file in `public/photos/`, served from the site's own origin (OD-09); the
  manifest's `source_url`, `licence_url` and `terms_url` appear only as credit links on the about page. The image
  generator (`scripts/images/generate.mjs`, OD-10 §3) runs only on the owner's computer; the product never calls its host.
- Reading the visitor's language, location or device to change content (no `Accept-Language`, no geo-IP).
- Logging an IP address, user agent, cookie, header dump or request body.

`guard:boundary` fails the build on the source and built-HTML patterns; the reviewer reads the rest.

## 3. Zones (PR-19)

| Zone | Source | URL | Personal data | Why | OD |
|---|---|---|---|---|---|
| `health` | `src/app/api/health/**` | `/api/health` | no | the stack scaffold's health route; takes no input, returns `{ "status": "ok" }` or a safe error | OD-05 |
| `theme-preference` | shipped: `src/components/theme/theme-storage.ts`, `public/theme-init.js`; evidence only, which may name the key only to stub or read it: `src/components/theme/theme-storage.test.ts`, `tests/theme-init.test.ts`, `e2e/theme-switch.spec.ts` | none | no | the visitor's theme choice, kept in their own browser under one `localStorage` key, `mawsim-theme`, and applied before first paint; never sent, logged or read by the server; a display preference, not data about the visitor | OD-12 |

Nothing else is a zone. `public/theme-init.js` lies outside `guards.source_roots`, so `guard:boundary` does not scan
it: the reviewer reads every line of it, and its own test proves it touches nothing but that key and `data-theme`. Analytics and third-party scripts are never allowed by a zone.

## 4. Evidence at each gate

`guard:boundary` PASS (source and `.next/server/app/**/*.html`), the CSP header from T02 on every route, and the
reviewer's reading of any new route, dependency or log line.
