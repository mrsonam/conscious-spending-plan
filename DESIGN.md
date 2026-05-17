---
name: Conscious Spending Plan
description: Wealth Console — dark obsidian finance instrument with mint and sky accents
colors:
  surface-obsidian: "#0b1326"
  surface-low: "#131b2e"
  surface-container: "#171f33"
  surface-high: "#1e2740"
  on-surface: "#dae2fd"
  on-surface-muted: "rgba(218, 226, 253, 0.55)"
  outline-ghost: "rgba(218, 226, 253, 0.12)"
  accent-mint: "#4edea3"
  accent-sky: "#89ceff"
  accent-lavender: "#b9c8de"
  semantic-loss: "#ffb4ab"
  semantic-warning: "#e8c547"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.22em"
  console-hero:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.6rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
  console-overview-hero:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.75rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.02em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "0.75rem"
spacing:
  card-compact: "1rem"
  card-default: "1.25rem"
  card-hero: "1.5rem"
  section-gap: "2rem"
components:
  button-console-primary:
    backgroundColor: "{colors.accent-mint}"
    textColor: "{colors.surface-obsidian}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1.25rem"
  button-console-primary-hover:
    backgroundColor: "{colors.accent-mint}"
    textColor: "{colors.surface-obsidian}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1.25rem"
  card-console:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-default}"
  input-console-trigger:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.75rem"
  bento-card:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-default}"
---

# Design System: Conscious Spending Plan

## 1. Overview

**Creative North Star: "The Midnight Ledger"**

You review pay and CSP buckets at a desk, often in the evening, with the room dim and the screen the main light. The UI should feel like a calm instrument panel: numbers first, decoration last. Wealth Console is not a bank brochure and not a trading terminal.

The system uses **tonal layering** on obsidian surfaces (four surface steps) with **full-palette accents**: mint for affirmative action and positive deltas, sky for secondary emphasis and charts, cool lavender for tertiary metrics. Depth comes from inset highlights and surface steps more than drop shadows.

**Key Characteristics:**

- Dark console shell via `data-csp-dashboard-theme="console"` and `TOKENS` from `lib/wealth-console-tokens.ts`
- Label → value → helper rhythm on dashboard cards
- Uppercase micro-labels with wide tracking for section headers
- Tabular figures for currency; optional scramble animation for hero totals
- Keyboard-first navigation (sidebar, command palette `⌘K` / `Ctrl+K`)
- Classic/auth routes may use Geist + Fraunces/DM Sans on login; dashboard body uses Geist Sans

Implementation sources: `lib/wealth-console-tokens.ts`, `app/globals.css`, Tailwind utilities on bento components.

## 2. Colors: Obsidian Console Palette

A blue-tinted obsidian stack with mint and sky signal colors. Neutrals are never pure black or white.

### Primary

- **Signal Mint** (`#4edea3`): Primary CTAs, positive deltas, success states, focus rings, active calendar selection, savings-rate emphasis when healthy.

### Secondary

- **Instrument Sky** (`#89ceff`): Secondary metrics, chart series, "today" in date picker, complementary emphasis without competing with mint.

### Tertiary

- **Ledger Lavender** (`#b9c8de`): Tertiary metrics and de-emphasized data series where mint and sky are already assigned.

### Neutral

- **Obsidian Base** (`#0b1326`): Page background, PWA chrome, `html`/`body` under console theme.
- **Obsidian Low** (`#131b2e`): Nested panels, input triggers, popover surfaces.
- **Obsidian Container** (`#171f33`): Primary cards and active nav row backgrounds.
- **Obsidian High** (`#1e2740`): Icon wells, chips, nested blocks.
- **Frost Text** (`#dae2fd`): Primary text on dark surfaces.
- **Frost Muted** (`rgba(218, 226, 253, 0.55)`): Section labels, helpers, inactive nav copy.
- **Ghost Outline** (`rgba(218, 226, 253, 0.12)`): Hairline borders and dividers.

### Semantic

- **Soft Loss** (`#ffb4ab`): Negative deltas, errors, destructive-adjacent figures (not full red fills).
- **Caution Gold** (`#e8c547`): Warnings, threshold proximity on progress bars.

### Named Rules

**The Token-First Rule.** Use `TOKENS` and extend the file when a color repeats. One-off hex in a single screen is a smell.

**The Mint Sparingly Rule.** Mint is for action and positive truth, not wallpaper. If more than ~15% of a screen reads mint, rebalance to neutrals.

## 3. Typography

**Display Font:** Geist Sans (dashboard, app shell)  
**Auth Display:** Fraunces (login/signup headlines when `theme="console"`)  
**Auth Body:** DM Sans (auth forms)  
**Mono:** Geist Mono (available; use for codes or dense figures when needed)

**Character:** Technical clarity with quiet confidence. Console screens favor Geist; auth keeps a warmer serif display paired with humanist sans for approachability without breaking the dark shell.

### Hierarchy

- **Console hero** (900, `text-4xl` → `sm:text-5xl` → `lg:text-[3.6rem]`, tight tracking): **Locked.** Primary period total on bento console pages (expenses, income, statement, subscriptions, category tracking, investments headline, etc.). Implement via `consoleHeroFigureClass` + `consoleHeroFigureInnerClass` in `components/wealth-console/console-ui.tsx`. **Do not reduce** in audit, quieter, or polish workflows.
- **Console overview hero** (900, `text-3xl` → `sm:text-4xl` → `lg:text-[2.75rem]`): Dashboard overview strip (monthly income, net savings). Implement via `consoleOverviewFigureClass`.
- **Display** (600, `text-2xl` / clamp, tight tracking): Page titles, section headers (not period totals).
- **Headline** (600, `text-lg`–`text-xl`): Card titles, major section headers.
- **Title** (600, `text-base`): Subsections, dialog titles.
- **Body** (400–500, `text-sm`, line-height 1.5): Explanatory copy, table cells; cap prose blocks at 65–75ch where used.
- **Label** (600, `10px`–`11px`, uppercase, `tracking-[0.22em]`, muted color): Section labels above figures; always paired with a value below.

### Named Rules

**The Label-Value Rule.** Every metric block leads with a micro-label, then the figure, then optional helper text. Never a naked number without context.

**The Tabular Money Rule.** Currency and aligned columns use `tabular-nums`. Hero amounts may use scramble loaders; essential values must remain readable when motion is reduced.

### Console hero figures (locked)

**Purpose:** At-a-glance truth for the active period. Users open Expenses or Income to see *this month’s* number first; size is hierarchy, not decoration.

**Implementation (single source of truth):**

| Token / export | Tailwind | Use |
|---|---|---|
| `consoleHeroFigureClass` | `text-4xl font-black … sm:text-5xl lg:text-[3.6rem]` | Page period total wrapper |
| `consoleHeroFigureInnerClass` | `font-black!` | `MajorFigureCurrency` / `ScrambleCurrencyValue` inside wrapper |
| `consoleOverviewFigureClass` | `text-3xl font-black … sm:text-4xl lg:text-[2.75rem]` | Dashboard overview income / net savings |

**Surfaces that use console hero scale today (preserve on refactors):**

- `components/expenses/expense-page-bento.tsx` — current month spend
- `components/income/income-page-bento.tsx` — current monthly revenue
- `components/statement/statement-page-bento.tsx` — period headline total
- `components/subscriptions/subscriptions-page-bento.tsx` — monthly recurring total
- `components/category-tracking/category-tracking-bento.tsx` — allocation headline
- `components/investments/investments-page-bento.tsx` — portfolio headline
- `components/wealth-console/sections/console-overview-section.tsx` — monthly income, net savings (`consoleOverviewFigureClass`)

**What “hero-metric template” means here (still banned):** gradient text on the number, purple SaaS gradients, a row of three identical mini-stat cards directly under one giant number, or shrinking the period total to `text-2xl` to look “quieter.” Large type with a micro-label above and YTD or MoM beside/below is **correct**.

**Agent checklist:** Before merging audit/quieter changes, grep for `consoleHeroFigureClass` and `text-4xl font-black` on the target page. If the period total shrank, revert and fix contrast / label issues instead (do not remove bento cards to compensate).

### Bento card surfaces (locked)

**Purpose:** Wealth Console pages are **bento layouts**: scannable groups of rounded cards on obsidian, not a single flat sheet. Cards carry pillars, actions, charts, and ledger blocks.

**Canonical card shell (preserve):**

```tsx
className="rounded-xl border p-5" // or p-6 / rounded-[1.75rem] for hero sections
style={{
  background: TOKENS.surfaceContainer,
  borderColor: TOKENS.outlineGhost,
  boxShadow: CARD_INSET,
}}
```

**Patterns that must stay (do not “distill” away):**

| Pattern | Example surfaces |
|---|---|
| **Paired pillar cards** | Expenses Fixed overhead + Investment capital (`sm:grid-cols-2`) |
| **Side command card** | Expenses “Command actions” column |
| **Section cards** | Spend-by-sub-category block, transaction history shell, recurring panel |
| **In-section panels** | Chart share panel, category ledger on `surfaceLow` inside a section card (tonal step, not removal of cards) |
| **Stat strip in card chrome** | Top bucket / Tagged / Avg ticket grid inside section header (may use `dl` + gap-px; still part of card section) |

**What is still banned (generic SaaS, not CSP bento):**

- Decorative **icon + heading + blurb** cards with no numeric job
- Purple gradients, gradient text, glassmorphism-as-default
- Replacing **functional** card grids with featureless `border-t` rows to mimic minimal blogs

**Nesting discipline (refine, don’t delete cards):**

- Prefer **sibling cards** in a grid over a card wrapping an identical second card.
- **Allowed:** one section card containing **tonal sub-panels** (`surfaceLow` chart area, ledger list) when the outer card is the section boundary.
- **Avoid:** two full `surfaceContainer` cards stacked with the same padding where one card would suffice.

**Agent checklist:** Before merging audit/layout/distill changes, grep for `TOKENS.surfaceContainer` + `rounded-xl border` on the page. If card count dropped (e.g. pillar pair merged into one row, chart section flattened to border-only), revert unless the user explicitly requested a layout redesign.

## 4. Elevation

Depth is **tonal first, shadow second**. Cards rest on `surfaceContainer` with **Inset Highlight** (`inset 0 1px 0 0 rgba(218,226,253,0.06)`) via `CARD_INSET`. Floating layers (date popover, primary CTA) add ambient shadow; the UI is not Material "lifted paper."

### Shadow Vocabulary

- **Card Inset** (`inset 0 1px 0 0 rgba(218,226,253,0.06)`): Default card, active nav, inputs at rest.
- **Popover Lift** (`0 12px 40px rgba(0,0,0,0.45)`): Date picker popover, elevated menus.
- **CTA Float** (`0 12px 28px rgba(0,0,0,0.25)`): Primary console buttons on key actions.

### Named Rules

**The Flat Stack Rule.** Prefer stepping `surface` → `surfaceLow` → `surfaceContainer` → `surfaceHigh` before adding drop shadow.

**The Bento Card Rule.** Console routes use **card-based bento grids** as the primary layout unit. Do not remove cards during audits; see **Bento card surfaces (locked)** above.

**The Nesting Discipline Rule.** Avoid gratuitous card-in-card at the same surface level. Use sibling cards in grids, or one section card with `surfaceLow` sub-panels for chart/ledger tone steps.

## 5. Components

Console components override shadcn defaults (light indigo) with `TOKENS`. Classic routes may still use default `Button` variants; new dashboard work uses console patterns.

### Buttons

- **Shape:** Soft corners (`12px` / `rounded-lg`–`rounded-xl`).
- **Primary (console):** Mint fill, obsidian text, semibold `text-sm`, `CARD_INSET` or CTA float shadow on emphasis actions.
- **Hover / Focus:** Color transitions only; `focus-visible:ring-2` with mint at ~40–45% opacity. No bounce or elastic easing.
- **Ghost / outline:** Ghost border `outlineGhost`, muted text, hover `white/5` or `white/10` backgrounds.

### Cards / Containers

- **Bento card (locked):** `surfaceContainer` + ghost border + `CARD_INSET` + `rounded-xl` (see frontmatter `bento-card` and **Bento card surfaces (locked)**). This is the default block for console pages; audits must not strip these shells.
- **Corner Style:** `rounded-xl` (12px); hero sections may use `rounded-[1.75rem]`.
- **Background:** `surfaceContainer` for cards; `surfaceLow` for inset sub-panels inside a section card.
- **Shadow Strategy:** `CARD_INSET` at rest; avoid heavy drop shadows on static cards.
- **Border:** `1px` ghost outline on cards; full border, never a thick side stripe on list rows or callouts.
- **Internal Padding:** `p-4` compact, `p-5` default, `p-6`+ hero.
- **Grids:** Paired and triple card grids (`grid-cols-1 sm:grid-cols-2`, etc.) are intentional bento rhythm, not “identical card grid” anti-patterns, when each card shows metrics or controls.

### Inputs / Fields

- **Style:** `surfaceLow` fill, ghost border, `rounded-xl`, medium weight text, dark color-scheme.
- **Focus:** Mint ring `rgba(78, 222, 163, 0.45)`; preserve inset highlight in box-shadow stack.
- **Error / Disabled:** Soft loss color for text/borders; reduced opacity for disabled, never rely on color alone.

Use `AppSelect` / date triggers with `variant="console"` so popovers match `surfaceLow`.

### Navigation

- **Sidebar:** Grouped rail (`sidebar-bento.tsx`), `rounded-xl` rows, icon well on `surfaceContainer`, active row uses inset + mint icon tint. Collapsed mode uses outline ring on icon instead of text stripe.
- **Header:** `variant="console"`; search opens command palette.
- **Command palette:** Spotlight list, hidden scrollbars (`.scrollbar-none`), destinations from `lib/command-palette-nav.ts`.

### Dashboard metric card (signature)

- Micro-label (muted, uppercase tracking) → major figure (scramble or tabular) → helper line.
- Optional icon well (`rounded-lg`, `surfaceLow`, accent icon color).
- Progress bars: `rounded-full` track on `surfaceLow`; fill mint / sky / loss / warning by semantics.

### Dialogs

- Override default light `Dialog` with `TOKENS` background and ghost border.
- Framer Motion enter/exit; respect `prefers-reduced-motion`.

## 6. Do's and Don'ts

Grounded in PRODUCT.md anti-references and console implementation.

### Do:

- **Do** use `TOKENS` from `lib/wealth-console-tokens.ts` for every new console surface.
- **Do** follow label → value → helper on metric cards and tables.
- **Do** keep mint for CTAs, positive truth, and focus rings; sky for secondary data viz.
- **Do** meet WCAG 2.1 AA on obsidian (check muted text and ghost borders).
- **Do** honor `prefers-reduced-motion` for scramble loaders, dialogs, and transitions.
- **Do** use the command palette and visible focus rings for keyboard paths.
- **Do** keep **bento card surfaces** on console pages (paired pillars, command column, section cards); refine inside cards, do not flatten the layout.

### Don't:

- **Don't** use generic SaaS patterns: purple gradients, **decorated** hero-metric templates (gradient number + decorative stat tiles under one total), **decorative** icon-heading-text card grids, modal-first flows when inline works.
- **Don't** downscale **console hero figures** (`consoleHeroFigureClass` / `consoleOverviewFigureClass`) during audits or quieter passes; fix contrast and copy instead.
- **Don't** remove or merge **bento card surfaces** during `layout`, `distill`, or audit passes to satisfy generic minimalism; fix contrast, labels, a11y, and gratuitous double-wrapping instead.
- **Don't** use bank marketing aesthetics: stock trust imagery, navy-and-gold clichés, brochure tone inside authenticated routes.
- **Don't** use crypto/trading hype, neon on black, or chart wallpaper that obscures the ledger.
- **Don't** build spreadsheet walls without hierarchy; don't add mascots, badges, or gamification noise.
- **Don't** use `#000` or `#fff`; tint neutrals toward the frost/obsidian family.
- **Don't** use gradient text, glassmorphism as default, or thick colored `border-left` stripes on cards, alerts, or list items (nav active indicator is the only narrow vertical accent, and must not spread elsewhere).
- **Don't** add gratuitous **card-in-card** shells at the same visual weight; don't animate layout properties (width, height, margin) for transitions.
