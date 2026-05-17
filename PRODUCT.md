# Product

## Register

product

## Users

Primary user today is an individual tracking their own money against a Conscious Spending Plan (CSP): fixed costs, savings, investment, and guilt-free spending. Sessions are practical check-ins: enter or review income, see allocation against rules, and adjust behavior before the next pay cycle.

Pay timing is employer-dependent, not fixed to fortnightly. The product should speak in flexible periods (pay date, custom range) without baking in one cadence.

Future direction may include multi-user SaaS, but the default register and UX remain product-first: clarity and control over marketing polish.

## Product Purpose

Help people divide real income into CSP buckets, persist entries, and see whether they are inside their plan. Success is knowing where money went, staying within chosen rules, and feeling on track for savings and investing goals.

The Wealth Console shell (obsidian surfaces, mint/sky accents) is the working environment for that job, not a brochure.

## Brand Personality

Calm, precise, trustworthy. Direct when it matters (allocation truth, rule breaches) without shouty or gamified UI. Premium and quiet: confident hierarchy, restrained decoration, numbers and labels do the work.

Voice can carry Ramit-adjacent honesty in copy and empty states, but the interface stays instrument-panel, not coach-on-stage.

## Anti-references

- Generic SaaS: purple gradients, **decorated** hero-metric templates (gradient accents, gradient text, cloned icon-stat card rows under one giant number), **decorative** identical icon-heading-text card grids (marketing tiles with no metric job), modal-first flows.
- **Not an anti-reference:** large **period totals** on console pages (month income, month spend, statement net, etc.). Those figures are intentional; see **Dominant period totals** below and DESIGN.md **Console hero figures**.
- **Not an anti-reference:** **Bento card surfaces** on console routes (pillars, command panels, chart blocks, paired metric cards). Card-based layout is core to the Wealth Console; see **Bento card surfaces** below and DESIGN.md **Bento card surfaces (locked)**.
- Bank marketing: stock trust imagery, navy-and-gold clichés, brochure tone on dashboard screens.
- Crypto/trading hype, spreadsheet walls with no hierarchy, overly playful fintech mascots and badges.

## Design Principles

1. **Numbers tell the truth** — allocations, remainders, and deltas are explicit; no vague summaries where a figure is possible.
2. **Rules over vibes** — CSP buckets and limits drive the UI; delight supports comprehension, never obscures it.
3. **Scan, then act** — label → value → helper rhythm; primary task obvious on every screen (income, expenses, funds, dashboard).
4. **Console, not campaign** — dark Wealth Console is a tool surface; resist landing-page patterns inside authenticated routes.
5. **Earn the motion** — animation highlights change (totals, period switches); respect reduced motion and never hide required state in animation alone.
6. **Dominant period totals** — the primary number for the current period (this month’s income, spend, net, allocation headline) renders at **display scale** (`consoleHeroFigureClass` in `components/wealth-console/console-ui.tsx`). Audits, `quieter`, and polish passes must **not** downscale existing hero figures. Secondary metrics (YTD, row amounts, table cells) stay at headline/body scale.
7. **Bento card surfaces** — authenticated console pages organize content in **bordered cards** on `surfaceContainer` (often in responsive grids: pillar pairs, command column, chart + ledger). Audits, `layout`, `distill`, and `quieter` passes must **not** remove or flatten these cards into border-only lists to satisfy generic “no cards” guidance. Improve contrast, labels, and nesting discipline inside cards; keep the card rhythm.

## Accessibility & Inclusion

- Target **WCAG 2.1 AA** for production UI.
- **Extra contrast discipline** on the dark console: muted text, ghost borders, and accent colors (mint, sky) must meet readable contrast on obsidian surfaces.
- Honor **`prefers-reduced-motion`**: Framer dialogs, scramble loaders, and transitions degrade gracefully; no information only available through motion.
- Keyboard paths for navigation (sidebar, command palette, forms, tables) and visible focus states on interactive controls.
