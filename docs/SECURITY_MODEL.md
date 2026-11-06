# MAWSIM — Security model

Precedence 5. Small because the product is small: no principals, no input, no secrets.

## 1. Principals

Anonymous visitors only. No sign-in, no roles, no privileged key, no database policy.

## 2. Input

None from forms. The only request-derived values are route parameters (`locale`, `slug`) and the guide's query
parameters (`month`, `kind`): each is checked against its closed set (`en|ar`, a known slug, `1…12`,
`fruit|vegetable|leafy`); an unknown `locale` or `slug` is a 404, an invalid `month` or `kind` falls back to its
default. Nothing is reflected unescaped (React escapes text); no `dangerouslySetInnerHTML`.

## 3. Secrets

None in the product. No `.env` file is needed; `LOG_LEVEL` is optional and not secret.

## 4. Headers baseline (T02, risk 3)

Set for every route in `next.config.ts` `headers()`:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'` (production; development adds `'unsafe-eval'` to `script-src` for React's dev tooling only) |
| `Strict-Transport-Security` | `max-age=86400` (short until a deploy exists; never `includeSubDomains` without an OD) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=()` |
| `X-Frame-Options` | `DENY` |

`poweredByHeader: false`. `'unsafe-inline'` in `script-src` is accepted because Next.js inlines its bootstrap scripts
and a nonce would make every page dynamic; the CSP's job here is to refuse every third-party origin (R-1).

**The theme's pre-paint script (OD-12 §4).** `public/theme-init.js` is a same-origin file loaded synchronously from the
root layout's `<head>`, so `script-src 'self'` allows it and the CSP does not change. No hash or nonce is added for it:
a hash or nonce in `script-src` makes CSP Level 2+ browsers ignore `'unsafe-inline'`, and that would block Next.js's
inline bootstrap. The script reads one `localStorage` key (`mawsim-theme`), accepts only `light` or `dark`, sets
`data-theme` on `<html>`, and catches every error. It makes no request and defines no global. The stored value is
parsed against its closed set (`light` · `dark` · `system`) wherever it is read. Any other value is System.

## 5. Errors

Thrown errors are logged through `logger` and the visitor sees a safe message (`docs/STACK.md` §4, §6). No stack
trace, path or version reaches a response.

## 6. Dependencies

Each new dependency is named in its fence with the line that needs it (PR-47); a high-severity advisory in a
production dependency is a FAIL at review.
