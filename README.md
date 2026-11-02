# MAWSIM

Mawsim ("season" in Arabic) is a small bilingual guide that shows which fruits and vegetables are in season in Egypt, month by month, in English and Arabic. It is a test product, and its data is sample data, not farming or nutrition advice. It has:

a home page with an animated hero and "in season this month";
a guide page with a 12-month scroller and category chips (fruit, vegetable, leafy greens) that filter a card grid;
a page for each produce, with a 12-month season bar and storage tips;
an about page.

The site has no accounts, forms, search box, cookies, browser storage, analytics or trackers. Every control is a button or a link, and the colour theme follows the system. The language comes from the URL (/en/…, /ar/…), and Arabic is laid out right to left. Motion is calm and purposeful, and it respects reduced motion. It is mobile-first, works at 390 and 1280, is accessible to WCAG 2.2 AA, and there is no layout shift.

Users: people in Egypt who shop at markets and want to know what is fresh now, on a phone or a laptop, in English or Arabic.

- **For:** people in Egypt who shop at markets and want to know what is fresh now, on a phone or a laptop, in English or Arabic.
- **Type:** Web app
- **Stack:** Next.js (App Router, TypeScript)
- **Modules:** Observability: Structured logs
- **Deploy:** none
- **Languages:** en, ar

## How this project is built

DEV_OS builds this repository on GitHub, one task at a time, with the agents and models chosen at `devos init`:

- The plan is in `docs/`: the brief (`docs/PRODUCT_BRIEF.md`), the scope (`docs/SCOPE.md`) and the task ledger (`docs/PHASES.md`). Each task has a fence in `docs/fences/`.
- `devos-cycle` builds the next open task on a branch `task/Tnn` with the builder agent, runs the checks, and has the reviewer agent review it. A PASS merges by itself, unless the task waits at a human gate for your merge.
- A change is an issue with the "Dev OS change request" form: the reviewer agent plans it in an intake pull request.
- The settings the workflows need are in `SETUP.md`, and the issue "Dev OS: setup needed" on Jovo-Jovi/mawsim lists what is missing. The method is in `docs/method/`.
