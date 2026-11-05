# MAWSIM — Boundary model

Precedence 4. The non-waivable gate of Profile A (handbook §10.2). No OD can waive it.

<!-- devos:boundary {"profile":"A","zones":[{"name":"health","src":["src/app/api/health/**"],"urls":["/api/health"],"personal_data":false}]} -->

## 1. The rule

No table, column, bucket, form, route handler or log accepts or keeps a visitor's data. Mawsim has no table or bucket
at all.

## 2. What is forbidden everywhere

- `<form>`, `<input>`, `<textarea>`, `<select>` — every control is a button or a link (R-2).
- Cookies (`document.cookie`, `cookies()`), `localStorage`, `sessionStorage`, `indexedDB`.
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

Nothing else is a zone. Analytics and third-party scripts are never allowed by a zone.

## 4. Evidence at each gate

`guard:boundary` PASS (source and `.next/server/app/**/*.html`), the CSP header from T02 on every route, and the
reviewer's reading of any new route, dependency or log line.
