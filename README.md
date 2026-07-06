# Dutch BV · DGA Tax Model (2026)

A calculator for the corporate and personal tax on a Dutch **BV** owned by a single
shareholder/director (**DGA**), for tax year 2026. Enter an hourly rate, billable days,
a salary and a dividend; it works through VPB, Box 1, Zvw, Box 2 and BTW to your
take-home pay and effective rates, and updates as you drag the inputs.

**Live:** https://bvtax.nl

## Running it

Open `index.html` in a browser. The calculations happen in JavaScript on your own
machine, so whatever figures you enter stay local and never reach a server.

## Features

- **Optimiser** — sweeps every salary/dividend split at your current total payout,
  marks the best compliant mix, and prices the next €1,000 of pre-tax profit taken
  as salary, as dividend, or retained in the BV.
- **Fiscal partner** — optionally splits the dividend 50/50 in Box 2 so both
  partners' low brackets are used.
- **Shareable scenarios** — inputs persist in the URL hash and localStorage, and
  the "Copy link" button puts an exact-scenario URL on the clipboard.
- The 2026 rates and thresholds — including the full arbeidskorting curve and the
  gebruikelijk loon minimum — sit in the **2026 tax parameters** panel and can all
  be edited.
- The colour theme follows your system setting and remembers it if you switch.

## Model notes

- The algemene heffingskorting phases out on **verzamelinkomen** (salary + Box 2
  income), as it has since 2025 — a dividend claws back the credit.
- Heffingskortingen offset the combined Box 1 + Box 2 levy and are never
  refundable; unused Box 1 credits reduce Box 2 tax.
- A corporate loss carries forward; VPB never goes negative.
- This is a planning aid, not tax advice. It leaves out Box 3, the 30% ruling,
  pension build-up, prior-year retained earnings and the gebruikelijkloon
  comparison test — check anything that matters with a Dutch accountant.

## Tests

`node --test tests/` exercises the tax model. The same suite runs in CI on every
push.
