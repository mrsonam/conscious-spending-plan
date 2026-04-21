# Design system

Visual and UX conventions for **Conscious Spending Plan** use the **Wealth Console** shell: a dark **obsidian** palette (mint / sky accents). Implementation lives in Tailwind classes, `lib/wealth-console-tokens.ts`, and `app/globals.css`.

The dashboard lives at routes like `/dashboard`, `/income`, `/expenses`, etc. PWA chrome and body background align via `data-csp-dashboard-theme="console"` on `html`.

## Color tokens

Use `**TOKENS`** from `lib/wealth-console-tokens.ts` (inline `style` or shared constants) so surfaces stay consistent.


| Token              | Role                                                   |
| ------------------ | ------------------------------------------------------ |
| `surface`          | Page background (`#0b1326`).                           |
| `surfaceLow`       | Nested panels, side regions.                           |
| `surfaceContainer` | Primary cards.                                         |
| `surfaceHigh`      | Elevated chips / nested blocks.                        |
| `onSurface`        | Primary text.                                          |
| `onSurfaceMuted`   | Labels, helper copy, de-emphasized text.               |
| `outlineGhost`     | Hairline borders and dividers.                         |
| `primary`          | Mint accent (CTAs, positive deltas, success emphasis). |
| `secondary`        | Sky accent (secondary emphasis, charts).               |
| `tertiary`         | Cool gray-lavender (tertiary metrics).                 |


**Card depth:** prefer `CARD_INSET` for inset highlight on cards (`box-shadow` defined next to `TOKENS`).

**Semantic:** loss / danger lines often use `#ffb4ab`; warnings may use `#e8c547` (e.g. dashboard and tables).

## Typography

- **Section labels:** `text-[10px]`–`text-[11px]`, `uppercase`, wide `tracking` (e.g. `tracking-[0.22em]`), `font-semibold` or `font-bold`, `TOKENS.onSurfaceMuted`.
- **Titles:** `text-lg`–`text-2xl` by hierarchy; use `TOKENS.onSurface`.
- **Currency:** `MajorFigureCurrency` / scramble loaders for hero numbers; `tabular-nums` where needed.

## Components & patterns

- **Sidebar:** Grouped rail navigation (`components/layout/sidebar-bento.tsx`). Routes: `lib/app-routes.ts` (`BENTO`).
- **Header:** `components/layout/header.tsx` with `variant="console"`; optional search opens the command palette.
- **Command palette:** Spotlight-style navigation (`⌘K` / `Ctrl+K`); destinations in `lib/command-palette-nav.ts`.
- **Dialogs:** Shared `Dialog` / `DialogContent` with Framer Motion; override background/border with `TOKENS` so modals match obsidian (defaults are light).
- **Scrollbars:** `.scrollbar-none` in `globals.css` hides scrollbars while keeping scroll (sidebar, command palette list).

## Adding new UI

1. Reuse layout primitives (`Sidebar`, `Header`, `TOKENS`).
2. Avoid one-off hex; add or extend tokens if a color repeats.
3. Use the label → value → helper line rhythm on dashboard cards.

## Related files

- `lib/wealth-console-tokens.ts` — palette and card inset.
- `lib/app-routes.ts` — dashboard route map (`BENTO`).
- `lib/dashboard-theme.ts` — theme type and home URL helpers.
- `app/globals.css` — Tailwind v4 import, PWA safe areas, console overrides (e.g. date inputs).

