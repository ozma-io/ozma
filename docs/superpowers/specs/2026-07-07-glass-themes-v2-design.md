# Glass Themes 2.0 — visual redesign (dark-glass in place + new light-glass-cool)

**Date:** 2026-07-07
**Status:** approved by user (design + all key decisions)
**Source of truth for the target look:** user-provided mockup at `~/Downloads/Новый дизайн экранов` (design-system tokens + 4 screen mockups: main menu, daily report table, transaction form, schema workspace). Token values are copied into this spec so it is self-contained.

## 1. Goals and scope

Significantly upgrade the visual design of the glass themes to match the new mockup design system:

- **`dark-glass` is redesigned in place** — same theme name, users get the new look automatically.
- **A new theme `light-glass-cool` is added** — the mockup's cool light palette (white glass on `#E9F2F2`).
- **`light-glass` (warm "Aivazovsky") is frozen pixel-for-pixel** — no visual changes at all. Existing shared glass CSS blocks are re-scoped to `light-glass` only; the new component system is written for `dark-glass` + `light-glass-cool`.
- Fonts switch to **Inter + JetBrains Mono** and icons switch to **Lucide** — in the two new-look themes only.

Out of scope: default `light`/`dark` themes, `admin.light_old`, menu emoji content (DB data), mobile-specific redesign (existing responsive behavior is preserved), report generator.

## 2. Theme architecture

Current mechanism is kept unchanged: themes are rows in `funapp.color_themes`, selection persists in `localStorage['preferredTheme']`, the active theme name lands in `data-theme-style` on `html`/`body`/`#app`, and all glass styling is CSS-only in `src/styles/style.scss` keyed on that attribute (see specs 2026-04-03).

Changes:

1. **SCSS restructuring.** Today ~1700 lines of component CSS are keyed on shared selectors `[data-theme-style='light-glass'], [data-theme-style='dark-glass']`. These blocks are re-scoped to `light-glass` **only** (mechanical selector edit — zero visual change for the warm theme; `dark-glass` values inside them move out or are deleted).
2. **New system in SCSS mixins.** New component styles are authored once as mixins/placeholders and instantiated for `dark-glass` and `light-glass-cool` (`@mixin glass2-components`, applied under both selectors; palette differences live in per-theme token blocks). Suggested location: a new partial `src/styles/glass2.scss` imported from `style.scss`, to stop `style.scss` growth.
3. **Frontend fallback list** `src/utils_colors.ts:466–473` gains `light-glass-cool` (after `light-glass`).
4. **DB seeding** (see §10).

## 3. Design tokens

Tokens are expressed as CSS custom properties inside the per-theme blocks, then bridged onto the existing consumer vars (`--MainTextColor`, `--cell-*`, `--default-*`, `--FocusBorderColor`, etc.) exactly like the current `#app[...]` bridge at `style.scss:698–731`.

### 3.1 dark-glass palette

| Token | Value |
|---|---|
| `--bg-app` / `--bg-shell` | `#04090B` / `#081217` |
| `--surface-card` | `rgba(14, 25, 32, 0.72)` (pair with glass blur) |
| `--surface-card-2` | `rgba(23, 38, 47, 0.80)` |
| `--surface-inset` (inputs) | `rgba(2, 7, 9, 0.55)` |
| `--surface-row-alt` / `--surface-hover` | `rgba(255,255,255,0.025)` / `rgba(255,255,255,0.05)` |
| `--border-subtle` / `--border-default` / `--border-strong` | `rgba(255,255,255,0.07)` / `0.11` / `0.18` |
| `--border-focus` | `#35D3C0` |
| `--text-primary` / `--text-secondary` / `--text-muted` / `--text-disabled` | `#F1F7F7` / `#A3B8BE` / `#64808A` / `#3E525B` |
| `--text-on-accent` | `#04211D` |
| `--accent-600/500/400/300` | `#14B8A6` / `#2DD4BF` / `#45E3CF` / `#8CF0E3` |
| `--gradient-accent` | `linear-gradient(135deg, #1FA2C9 0%, #2DD4BF 55%, #6EF0D2 100%)` |
| `--accent-tint` / `--accent-tint-border` | `rgba(45,212,191,0.12)` / `rgba(45,212,191,0.35)` |
| `--link` / `--info` | `#4FC9E8` / `#46C8CF` |
| `--success` (+tint/tint-border) | `#34E28A` / `rgba(52,226,138,0.10)` / `rgba(52,226,138,0.32)` |
| `--danger` (+tint/tint-border) | `#FF5C6B` / `rgba(255,92,107,0.10)` / `rgba(255,92,107,0.30)` |
| `--warning` (+tint) | `#FFBA53` / `rgba(255,186,83,0.10)` |
| `--purple` | `#B18CFF` |
| Ambient glow 1 | `radial-gradient(600px 420px at 12% -8%, rgba(45,212,191,0.12), transparent 70%)` |
| Ambient glow 2 | `radial-gradient(700px 480px at 95% 8%, rgba(31,162,201,0.09), transparent 70%)` |
| `--shadow-card` | `0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px rgba(0,0,0,0.30)` |
| `--shadow-accent-glow` (hover) | `0 8px 28px rgba(45,212,191,0.32)` (`0 12px 36px …0.45` on hover) |
| `--focus-ring` | `0 0 0 3px rgba(53,211,192,0.26)` |

### 3.2 light-glass-cool palette

| Token | Value |
|---|---|
| `--bg-app` / `--bg-shell` | `#E9F2F2` / `#F6FBFA` |
| `--surface-card` / `--surface-card-2` | `rgba(255,255,255,0.78)` / `rgba(255,255,255,0.92)` |
| `--surface-inset` | `rgba(10, 35, 40, 0.045)` |
| `--surface-row-alt` / `--surface-hover` | `rgba(10,35,40,0.03)` / `rgba(10,35,40,0.05)` |
| `--border-subtle` / `--border-default` / `--border-strong` | `rgba(10,35,40,0.07)` / `0.12` / `0.20` |
| `--border-focus` | `#14B8A6` |
| `--text-primary` / `--text-secondary` / `--text-muted` / `--text-disabled` | `#0B1B1E` / `#40585F` / `#74898F` / `#B3C2C6` |
| `--text-on-accent` | `#04211D` |
| `--accent-600/500/400/300` | `#0B8577` / `#0FA895` / `#14B8A6` / `#0D8A7B` |
| `--gradient-accent` | same 3-stop cyan→teal→mint gradient as dark |
| `--accent-tint` / `--accent-tint-border` | `rgba(15,168,149,0.10)` / `rgba(15,168,149,0.32)` |
| `--link` / `--info` | `#0E7FA8` / `#0E8F96` |
| `--success` (+tint/border) | `#0FA968` / `rgba(15,169,104,0.09)` / `rgba(15,169,104,0.30)` |
| `--danger` (+tint/border) | `#E23D50` / `rgba(226,61,80,0.08)` / `rgba(226,61,80,0.28)` |
| `--purple` | `#8B5CF6` |
| Ambient glows | same shapes, teal `rgba(20,184,166,0.10)` / cyan `rgba(31,162,201,0.08)` |
| `--shadow-card` | `0 1px 0 rgba(255,255,255,0.8) inset, 0 10px 28px rgba(20,28,60,0.10)` |
| `--shadow-accent-glow` | `0 8px 24px rgba(20,184,166,0.28)` (`0 12px 32px …0.38` hover) |
| `--focus-ring` | `0 0 0 3px rgba(20,184,166,0.20)` |

### 3.3 Shared non-color tokens (both new themes)

- **Glass:** `--glass-blur: blur(24px) saturate(150%)`; `--glass-blur-strong: blur(40px) saturate(160%)` (dropdowns/modals).
- **Radii:** inputs 12px, buttons/tags 14px, section cards 20px, large cards 24px, checkboxes 7px, pills 999px.
- **Component metrics:** control heights 32/40/46px; card padding 28px; table row height 60px.
- **Motion:** `--ease-out: cubic-bezier(0.22,1,0.36,1)`; `--ease-spring: cubic-bezier(0.34,1.4,0.64,1)`; durations 120/200/340ms; hover lift `translateY(-1px)`; press `scale(0.98)`. No animation on theme switch beyond the existing crossfade.

## 4. Typography

Applies to `dark-glass` + `light-glass-cool` only (warm keeps Manrope/Space Grotesk):

- **UI font:** `Inter` (already bundled via @fontsource) — body, headings, buttons, labels. Headings bold with `-0.01em` tracking.
- **Mono font:** `JetBrains Mono` (bundled) — numeric and technical values: table ID/date/number cells (where cell type classes allow targeting), code-ish inputs.
- **Scale:** page title 20px bold in the header (28px for in-content titles), body/inputs 15px, secondary 13px, micro-labels 11px.
- **Signature micro-label:** uppercase, 11px, semibold, letter-spacing `0.09em` (wide variant `0.12em`), color `--text-muted`. Used for: form field labels, table column headers, footer counters ("ЗАПИСИ 1–50"), section meta.

## 5. Iconography — Lucide in new themes

- New wrapper component `AppIcon` (e.g. `src/components/AppIcon.vue`): props = material icon name (current API). When active theme is `dark-glass`/`light-glass-cool` **and** the name is in the mapping table → renders inline Lucide SVG (stroke-width 2, round caps, `1em` sizing, `currentColor`). Otherwise renders the existing `<span class="material-icons">` ligature — so unknown/DB-provided names degrade gracefully and non-glass themes are untouched.
- Mapping table `material → lucide` covers every name used in code (grep `material-icons` usages: TopLevelUserView, SearchPanel, Calendar, ModalUserView, ReferenceMultiSelect, Avatar, AlertBanner, InputSlot, HeaderPanel, ButtonItem, etc.) plus common DB-used names. Examples: `home→house`, `arrow_back→arrow-left`, `search→search`, `edit→pencil`, `close→x`, `add→plus`, `help_outline→circle-help`, `more_vert→ellipsis-vertical`, `calendar_today→calendar`, `expand_more→chevron-down`, `unfold_more→chevrons-up-down`, `open_in_new→square-arrow-out-up-right`, `edit_off→pencil-off`, `filter_list→list-filter`, `fullscreen→maximize`.
- Implementation: SVG path data vendored from `lucide-static` per icon into `src/utils/lucideIcons.ts` (no runtime dependency on the full icon set).
- All direct `<span class="material-icons">` usages in components are replaced with `<AppIcon>`.

## 6. Component design (new themes only)

### 6.1 App shell & background
Gradient background from `--bg-app` to `--bg-shell` tones + the two ambient radial glows (replaces current blurred orbs on `#app::before/::after`). Content max widths and layout untouched.

### 6.2 Header panel (`.header-panel`)
Transparent glass toolbar on `--surface-card` with `--glass-blur`, bottom border `--border-subtle`. Page title 20px/700/-0.01em + muted record counter. Toolbar buttons:
- **Primary action** (e.g. «Новая запись»): `--gradient-accent` pill (radius 14, h 32–36 in the toolbar), text `--text-on-accent` semibold, `--shadow-accent-glow`, hover = lift + stronger glow, press = scale 0.98.
- **Secondary buttons:** glass chips — transparent bg, `--border-default` border, `--text-primary`, hover `--surface-hover`.
- **Icon buttons:** 36px rounded squares (radius 12), border on hover.
- **Avatar:** 36px tile with `--gradient-accent` background, dark initials, radius 12.

### 6.3 Main menu (`.menu_category_block`, `.menu-entry`)
Category sections = glass cards: `--surface-card` + blur, radius 24, padding 28, `--shadow-card`, subtle 1px `--border-subtle`. Section title bold 22px. Entries: 36–40px rows, radius 12, gap 2, **hover = `--surface-hover`** (approved: hover returns in new themes; warm/light/dark keep the recent no-highlight behavior). Count badges = small muted pills. Emoji icons from DB captions remain as-is.

### 6.4 Table (`.custom-table` and row/cell classes)
Replaces the "floating rows" system **in the new themes** (warm keeps floating rows):
- `border-collapse: collapse` (or separate with 0 spacing), flat rows `height: 60px`, separator `1px solid --border-subtle` between rows, no vertical borders by default (existing opt-in divider attribute keeps working, colored `--border-subtle`).
- Header: micro-label style (§4), `--text-muted`, no heavy bottom border — single `--border-subtle` divider; sticky headers keep backdrop blur.
- Row hover: `--surface-hover` full-row highlight. Selected row/cells: `--accent-tint` bg + `--accent-tint-border`. Cursor cell: `--border-focus` outline.
- Reference cells (links to records): pill chips — `--surface-inset` bg, `--border-default` border, `--link` text 13px, radius 10, external-link icon.
- Money/enum values: keep the `option_variant` chip mechanism; restyle the 10-color chip palette to tinted capsules per §3 functional colors (tint bg + tint border + saturated text; success-styled for sums as in mockup).
- Numeric/ID/date cells: JetBrains Mono where cell type is distinguishable by existing classes (plan verifies what TableCell exposes; skip silently if not).
- Fixed/sticky columns: solid fallback bg `--glass-fixed-bg` equivalents from the new palette.
- Footer/pagination: micro-label counters; page buttons = 28px rounded squares, current page = accent pill with `--text-on-accent`; prev/next chevrons.
- Row add («Добавить запись») and edit affordances keep current behavior, restyled (muted icon buttons).
- Keep the perf/scroll fixes from `style.scss:2128–2210` applied to the new themes.

### 6.5 Form (`.first_level_grid_block`, `.form_sub_block`, inputs)
- Section cards: `--surface-card` + blur, radius 20, padding 28, `--shadow-card`, border `--border-subtle`. Section captions: 17px/700 (mockup shows icon+title; icons only if a block caption icon already exists — no new content invented).
- Field labels: micro-labels (§4) above the control (replaces the current floating/border-label look in new themes).
- Inputs/textareas/selects: `--surface-inset` bg, radius 12, border `--border-default`, height 40px (multi-line free), text 15px `--text-primary`, placeholder `--text-disabled`. Focus: border `--border-focus` + `--focus-ring`. Disabled: reduced opacity + `--text-disabled`.
- Reference fields: value rendered as chip (like table ref chips) inside the control, clear ×/chevron muted on the right.
- Warning/success-tinted controls (e.g. unfilled required date): tint bg + tint border per functional palette.
- Buttons: primary/save = gradient pill radius 14 h40 + glow (hover lift); secondary = glass bordered; danger = `--danger-tint` bg, `--danger` text/border. Press scale 0.98.
- Required/disabled indicators, nested UV blocks: keep mechanics, retokenize colors.

### 6.6 Dropdowns, poppers, modals, confirm dialogs
`--surface-card-2` + `--glass-blur-strong`, radius 16–20, `--shadow-card`, border `--border-subtle`. Menu items: radius 10, **subtle hover `--surface-hover`** (approved). Modal overlay: dark translucent + slight blur. Confirm dialog buttons per §6.5.

### 6.7 Toasts (`finishWith` liquid glass)
Keep structure; retokenize status colors: success `--success`, warning `--warning`, error `--danger` (+ their rgb vars at `style.scss:2256–2269`).

### 6.8 Monaco editor
Add `ozma-light-glass-cool` theme in `CodeEditor.vue`; update `ozma-dark-glass` token colors to the new palette (bg `#081217`-family, accent teal, strings mint, keywords cyan). Warm `ozma-light-glass` untouched.

### 6.9 Scrollbars
Slim (8px) rounded thumbs: `rgba(255,255,255,0.14)` dark / `rgba(10,35,40,0.18)` light, transparent track. Scoped to new themes.

## 7. Interaction & motion

- Hover on cards/buttons: `translateY(-1px)` + shadow/glow strengthen, `--dur-base` `--ease-spring`.
- Press on buttons: `scale(0.98)`, `--dur-fast`.
- Focus visible everywhere via `--focus-ring`.
- Theme switch: existing crossfade behavior kept.
- No new looping/entrance animations; the current `glass-rise` entrance keyframes are not applied in the new themes (they stay in the frozen warm theme).

## 8. What is explicitly preserved

- Warm `light-glass`: identical look after the change (only selector scoping edits).
- DB color-variant system, `X-OzmaDB-Theme` header, settings-derived vars, theme switcher UI, pre-first-paint script.
- `option_variant`/`cell_color` attribute behavior seeded by deploy.sh stage 7 (759ed144).
- Dropdown no-highlight behavior in **old** themes (304c3929, 8edf37dc, 6386cac5); new themes reintroduce subtle hover by design.

## 9. Frontend files expected to change

- `src/styles/style.scss` — re-scope legacy glass blocks to `light-glass`; import new partial.
- `src/styles/glass2.scss` (new) — token blocks + component mixins for the two new themes.
- `src/styles/mixins.scss` — shared glass2 mixins if needed.
- `src/utils_colors.ts` — fallback theme list.
- `src/components/AppIcon.vue` (new) + `src/utils/lucideIcons.ts` (new, vendored SVG paths + mapping) + ~10 components switching to `AppIcon`.
- `src/components/editors/CodeEditor.vue` — Monaco themes.
- `package.json` — no new runtime deps expected (Inter/JetBrains Mono already bundled; Lucide vendored as SVG path data).

## 10. DB / deploy seeding

New stage in `deploy.sh` (idempotent, per instance):
1. Upsert `funapp.color_themes` row: same schema as the instance's existing `light-glass` row, `name = 'light-glass-cool'`, localized name «Светлая стеклянная (холодная)» / "Light glass (cool)".
2. Copy `funapp.color_variants` rows from the instance's `light-glass` theme to `light-glass-cool` as a starting point (skip if any variants already exist for it). The new theme mostly relies on SCSS tokens; variants matter for DB-driven cell/option colors.
3. Local dev: same seeding available via the local script path used for such migrations (plan aligns with how glass themes were originally seeded).

## 11. Verification

1. `./local_rebuild_and_publish.sh --only_ui`, open local instance.
2. Screenshot pass of 4 reference screens (main menu, daily report table, transaction form, schema workspace) in `dark-glass` and `light-glass-cool`; side-by-side compare with the mockup (`~/Downloads/Новый дизайн экранов`, served statically — `.claude/launch.json` config `design-mockup` exists).
3. Regression: warm `light-glass` screenshots before/after — must be identical.
4. Smoke: theme switching across all themes, no first-paint flash (8de3f137 behavior intact), dropdowns/modals/toasts/Monaco in both new themes, sticky table columns, mobile viewport sanity check.

## 12. Risks & notes

- **Selector re-scoping regressions in the warm theme** — mitigated by the before/after screenshot regression (§11.3).
- **Lucide mapping gaps** — unknown names fall back to Material ligatures by design; a follow-up pass can extend the map from real DB usage.
- **JetBrains Mono targeting in table cells** depends on existing cell-type classes; if absent, mono applies only where safely targetable (IDs/dates may stay in Inter — acceptable).
- **`style.scss` size** — new work goes to a separate partial; legacy blocks shrink to single-theme scope. Full cleanup of the frozen theme is possible later if the warm theme is retired.
