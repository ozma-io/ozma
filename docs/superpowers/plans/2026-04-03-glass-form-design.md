# Glass Form Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved glassmorphism redesign to `dark-glass` and `light-glass-warm` themes — form cards, fields, labels, buttons, required indicators, field gap, and enum chips — without touching default themes.

**Architecture:** All changes live in two places: (1) the existing glass-theme CSS blocks in `src/styles/style.scss` (CSS variable overrides + scoped selectors for form elements), and (2) scoped SCSS blocks inside `InputSlot.vue` and `FormGridBlock.vue` gated behind `::v-deep` + attribute selectors. No new Vue components are created.

**Tech Stack:** Vue 2.7 SFCs, SCSS, CSS custom properties, Bootstrap 4.

---

## File Map

| File | What changes |
|------|-------------|
| `src/styles/style.scss` | CSS variable overrides per theme; form card backdrop-filter + box-shadow; input/field bg+border+focus; label typography; button pill styles; required indicator; field gap; chip classes; orb pseudo-elements |
| `src/components/form/InputSlot.vue` | `.border-label` font-family + text-transform scoped to glass themes via `::v-deep` inside the scoped style block |
| `src/components/form/FormGridBlock.vue` | `.form_grid_block__column` gap override (8 px) for glass themes |

---

## Task 1: CSS Variable Overrides — Dark Glass

**Files:**
- Modify: `src/styles/style.scss` (around line 625, inside `html[data-theme-style='dark-glass']`)

This task sets the per-theme CSS tokens the spec requires. The existing dark-glass block at line 625 already sets general tokens; we extend it with the form-specific tokens from the spec.

- [ ] **Step 1: Add form-specific CSS variables to the dark-glass token block**

Locate the closing `}` of the `html[data-theme-style='dark-glass']` block (currently ends around line 652). Add the following variables **before** that closing `}`:

```scss
  /* Form design tokens — dark-glass */
  --cell-borderColor: rgba(255, 255, 255, 0.10);
  --cell-backgroundColor: rgba(255, 255, 255, 0.05);
  --cell-foregroundColor: #e7ecef;
  --cell-foregroundDarkerColor: rgba(255, 255, 255, 0.22);
  --default-backgroundColor: rgba(255, 255, 255, 0.07);
  --default-borderColor: rgba(255, 255, 255, 0.14);
  --default-foregroundColor: #e7ecef;
  --default-foregroundDarkerColor: rgba(255, 255, 255, 0.35);
  --FocusBorderColor: rgba(89, 214, 207, 0.5);
  --radius-input: 10px;
  --MainTextColor: #e7ecef;
  --MainTextColorLight: rgba(255, 255, 255, 0.22);
```

- [ ] **Step 2: Verify no existing `--cell-borderColor` in dark-glass block**

Run:
```bash
grep -n 'cell-borderColor\|cell-backgroundColor\|radius-input' src/styles/style.scss
```
Expected: matches only inside the blocks we just added, not already present in the dark-glass html block (if duplicates exist, remove the older ones).

- [ ] **Step 3: Commit**

```bash
git add src/styles/style.scss
git commit -m "feat(theme): add form CSS variable overrides for dark-glass"
```

---

## Task 2: CSS Variable Overrides — Light Glass Warm

**Files:**
- Modify: `src/styles/style.scss` (inside `html[data-theme-style='light-glass']` shared block, lines 593–623)

- [ ] **Step 1: Add form-specific CSS variables to the light-glass token block**

Locate the closing `}` of the `html[data-theme-style='light-glass'], html[data-theme-style='dark-glass']` shared block (ends around line 623). Add the following overrides **after** that closing `}` in a new `html[data-theme-style='light-glass']`-only block:

```scss
html[data-theme-style='light-glass'] {
  /* Form design tokens — light-glass-warm */
  --cell-borderColor: rgba(143, 214, 228, 0.45);
  --cell-backgroundColor: rgba(255, 255, 255, 0.38);
  --cell-foregroundColor: #1f1f1f;
  --cell-foregroundDarkerColor: rgba(111, 106, 98, 0.38);
  --default-backgroundColor: rgba(255, 255, 255, 0.42);
  --default-borderColor: rgba(255, 255, 255, 0.75);
  --default-foregroundColor: #1f1f1f;
  --default-foregroundDarkerColor: #6f6a62;
  --FocusBorderColor: rgba(33, 133, 160, 0.5);
  --radius-input: 12px;
  --MainTextColor: #1f1f1f;
  --MainTextColorLight: rgba(111, 106, 98, 0.38);

  /* Aivazovsky sea palette */
  --sea-deep: #1a5f7a;
  --sea-mid: #2185a0;
  --sea-bright: #3db8c8;
  --sea-foam: rgba(143, 214, 228, 0.45);
}
```

Place this block immediately after the existing `html[data-theme-style='dark-glass']` block (~line 652).

- [ ] **Step 2: Commit**

```bash
git add src/styles/style.scss
git commit -m "feat(theme): add form CSS variable overrides for light-glass-warm"
```

---

## Task 3: Form Card Styles (first_level_grid_block and form_sub_block)

**Files:**
- Modify: `src/styles/style.scss` (section around line 1161 — existing `.first_level_grid_block` and `.form_sub_block` glass overrides)

Currently the form cards use generic `--sub-block-bg` / `--sub-block-border` tokens. The spec requires explicit `backdrop-filter`, `box-shadow`, and `border-radius` per theme.

- [ ] **Step 1: Replace the generic glass card block with per-theme versions**

Find and replace the existing rule at line ~1162:

```scss
/* ── Form blocks without sub-blocks: glass card styling ── */
#app[data-theme-style='dark-glass'] .first_level_grid_block:not(.has-sub-blocks),
#app[data-theme-style='light-glass'] .first_level_grid_block:not(.has-sub-blocks) {
  background: var(--sub-block-bg) !important;
  border: 1px solid var(--sub-block-border) !important;
}
```

Replace with:

```scss
/* ── Form cards — dark-glass ── */
#app[data-theme-style='dark-glass'] .first_level_grid_block:not(.has-sub-blocks) {
  background: rgba(255, 255, 255, 0.07) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 18px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

/* ── Form cards — light-glass-warm ── */
#app[data-theme-style='light-glass'] .first_level_grid_block:not(.has-sub-blocks) {
  background: rgba(255, 255, 255, 0.42) !important;
  backdrop-filter: blur(40px) saturate(180%) brightness(1.03) !important;
  -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(1.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.75) !important;
  border-radius: 20px !important;
  box-shadow: 0 16px 48px rgba(28, 23, 15, 0.09),
              0 0 40px rgba(246, 185, 65, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
}
```

- [ ] **Step 2: Replace the generic form_sub_block rule**

Find and replace the existing rule at line ~1216:

```scss
/* ── Form sub-blocks: glass card styling ── */
#app[data-theme-style='dark-glass'] .form_sub_block,
#app[data-theme-style='light-glass'] .form_sub_block {
  border: 1px solid var(--sub-block-border, var(--panel-border)) !important;
  border-radius: var(--radius-section, 1.5rem) !important;
  background: var(--sub-block-color, var(--sub-block-bg, rgb(255 255 255 / 3%))) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  padding: 1.5rem !important;
  margin-bottom: 0.75rem !important;
  transition: background 0.3s ease !important;
}
```

Replace with:

```scss
/* ── Form sub-blocks — dark-glass ── */
#app[data-theme-style='dark-glass'] .form_sub_block {
  background: var(--sub-block-color, rgba(255, 255, 255, 0.07)) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 18px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
  padding: 1.5rem !important;
  margin-bottom: 0.75rem !important;
}

/* ── Form sub-blocks — light-glass-warm ── */
#app[data-theme-style='light-glass'] .form_sub_block {
  background: var(--sub-block-color, rgba(255, 255, 255, 0.42)) !important;
  backdrop-filter: blur(40px) saturate(180%) brightness(1.03) !important;
  -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(1.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.75) !important;
  border-radius: 20px !important;
  box-shadow: 0 16px 48px rgba(28, 23, 15, 0.09),
              0 0 40px rgba(246, 185, 65, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  padding: 1.5rem !important;
  margin-bottom: 0.75rem !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/style.scss
git commit -m "feat(theme): glassmorphism form card styles for dark-glass and light-glass-warm"
```

---

## Task 4: Input / Textarea Field Styles

**Files:**
- Modify: `src/styles/style.scss` (section around line 1008 — `.form-control` glass overrides)

Currently all glass themes share one `.form-control` rule. We split it per theme for the new field styles.

- [ ] **Step 1: Replace the shared .form-control glass rule**

Find and replace the block at line ~1008:

```scss
#app[data-theme-style='light-glass'] .list-group-item,
#app[data-theme-style='dark-glass'] .list-group-item,
#app[data-theme-style='light-glass'] .form-control,
#app[data-theme-style='dark-glass'] .form-control,
#app[data-theme-style='light-glass'] .input-group-text,
#app[data-theme-style='dark-glass'] .input-group-text,
#app[data-theme-style='light-glass'] .custom-select,
#app[data-theme-style='dark-glass'] .custom-select {
  border-color: var(--control-line, var(--line)) !important;
  background: var(--surface) !important;
  color: var(--ink) !important;
}
```

Replace with:

```scss
/* ── Glass form controls — shared ── */
#app[data-theme-style='light-glass'] .list-group-item,
#app[data-theme-style='dark-glass'] .list-group-item,
#app[data-theme-style='light-glass'] .input-group-text,
#app[data-theme-style='dark-glass'] .input-group-text {
  border-color: var(--control-line, var(--line)) !important;
  background: var(--surface) !important;
  color: var(--ink) !important;
}

/* ── Form inputs — dark-glass ── */
#app[data-theme-style='dark-glass'] .form-control,
#app[data-theme-style='dark-glass'] .custom-select {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  border-radius: var(--radius-input, 10px) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  color: var(--ink) !important;
}

/* ── Form inputs — light-glass-warm ── */
#app[data-theme-style='light-glass'] .form-control,
#app[data-theme-style='light-glass'] .custom-select {
  background: rgba(255, 255, 255, 0.38) !important;
  border: 1px solid rgba(143, 214, 228, 0.45) !important;
  border-radius: var(--radius-input, 12px) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 1px 4px rgba(28, 23, 15, 0.05) !important;
  color: var(--ink) !important;
}
```

- [ ] **Step 2: Replace the shared .form-control:focus glass rule**

Find and replace the block at line ~1021:

```scss
#app[data-theme-style='light-glass'] .form-control:focus,
#app[data-theme-style='dark-glass'] .form-control:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 0.12rem rgb(15 118 110 / 10%);
}
```

Replace with:

```scss
/* ── Input focus — dark-glass ── */
#app[data-theme-style='dark-glass'] .form-control:focus {
  border-color: rgba(89, 214, 207, 0.5) !important;
  background: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 0 0 3px rgba(89, 214, 207, 0.12), 0 2px 8px rgba(0, 0, 0, 0.15) !important;
}

/* ── Input focus — light-glass-warm ── */
#app[data-theme-style='light-glass'] .form-control:focus {
  border-color: rgba(33, 133, 160, 0.5) !important;
  background: rgba(220, 244, 248, 0.55) !important;
  box-shadow: 0 0 0 3px rgba(61, 184, 200, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.9),
              0 1px 4px rgba(28, 23, 15, 0.05) !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/style.scss
git commit -m "feat(theme): per-theme input field styles with glassmorphism focus rings"
```

---

## Task 5: Floating Label Typography (InputSlot.vue)

**Files:**
- Modify: `src/components/form/InputSlot.vue` (scoped `<style lang="scss">` block, `.border-label` section)

The `.border-label` class currently uses default font/color. The spec requires `Space Grotesk`, 9 px, 700 weight, uppercase, letter-spacing 0.1em, with theme-specific colours.

- [ ] **Step 1: Add glass-theme overrides for .border-label at the end of the scoped style block**

In `InputSlot.vue`, at the end of the `<style lang="scss" scoped>` block (after line 380), add:

```scss
/* Glass theme label overrides — must use ::v-deep to pierce scoped CSS
   when the theme attribute is on #app (parent outside this component's scope) */
:global(#app[data-theme-style='dark-glass']) .border-label,
:global(#app[data-theme-style='light-glass']) .border-label {
  font-family: 'Space Grotesk', Manrope, sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

:global(#app[data-theme-style='dark-glass']) .border-label {
  color: rgba(255, 255, 255, 0.35);
  background-color: transparent !important;
}

:global(#app[data-theme-style='light-glass']) .border-label {
  color: #6f6a62;
  background-color: transparent !important;
}

/* Focused state — increase-z-index class is added by the component when focused */
:global(#app[data-theme-style='dark-glass']) .increase-z-index.border-label {
  color: rgba(89, 214, 207, 0.70);
}

:global(#app[data-theme-style='light-glass']) .increase-z-index.border-label {
  color: #1a5f7a;
}
```

> **Note:** Vue 2 scoped styles can use `:global()` (equivalent to unscoped) for styles that need to match elements in ancestor context. If the build rejects `:global()`, use `::v-deep` with a class and move the selectors to `style.scss` instead (see Fallback note below).

> **Fallback:** If `:global()` syntax fails in the Vue 2 SCSS pipeline, add these rules to `src/styles/style.scss` instead under the glass theme selectors — same CSS, just in the global stylesheet.

- [ ] **Step 2: Commit**

```bash
git add src/components/form/InputSlot.vue
git commit -m "feat(theme): glass theme floating label typography (Space Grotesk, uppercase)"
```

---

## Task 6: Section Title Typography (form_sub_block__title)

**Files:**
- Modify: `src/styles/style.scss` (section around line 1235 — `.form_sub_block__title` glass overrides)

- [ ] **Step 1: Add per-theme title colour after the existing shared title rule**

Find the existing rule at line ~1235:

```scss
#app[data-theme-style='dark-glass'] .form_sub_block__title,
#app[data-theme-style='light-glass'] .form_sub_block__title {
  color: var(--muted) !important;
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.1em !important;
  text-transform: uppercase !important;
  margin-bottom: 1.25rem !important;
  padding-bottom: 0 !important;
}
```

Replace with:

```scss
#app[data-theme-style='dark-glass'] .form_sub_block__title,
#app[data-theme-style='light-glass'] .form_sub_block__title {
  font-family: 'Space Grotesk', Manrope, sans-serif !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase !important;
  margin-bottom: 1.25rem !important;
  padding-bottom: 0 !important;
}

#app[data-theme-style='dark-glass'] .form_sub_block__title {
  color: rgba(89, 214, 207, 0.6) !important;
}

#app[data-theme-style='light-glass'] .form_sub_block__title {
  color: #1a5f7a !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/style.scss
git commit -m "feat(theme): glass section title typography with Space Grotesk and accent colours"
```

---

## Task 7: Required Indicator and Disabled Indicator

**Files:**
- Modify: `src/styles/style.scss`

- [ ] **Step 1: Add required-indicator overrides for glass themes**

After the last glass-theme form rule (after line ~1315), add:

```scss
/* ── Required indicator — glass themes ── */
#app[data-theme-style='dark-glass'] .required-indicator.empty {
  background-color: rgba(255, 120, 100, 0.8) !important;
  box-shadow: 0 0 6px rgba(255, 120, 100, 0.5) !important;
  width: 5px !important;
  height: 5px !important;
}

#app[data-theme-style='light-glass'] .required-indicator.empty {
  background-color: rgba(220, 80, 60, 0.7) !important;
  box-shadow: 0 0 5px rgba(220, 80, 60, 0.28) !important;
  width: 5px !important;
  height: 5px !important;
}

/* ── Disabled indicator — glass themes ── */
#app[data-theme-style='dark-glass'] .disabled-indicator .material-icons,
#app[data-theme-style='light-glass'] .disabled-indicator .material-icons {
  opacity: 0.5;
  font-size: 1rem;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/style.scss
git commit -m "feat(theme): glass theme required/disabled indicators"
```

---

## Task 8: Button Styles (Save and Delete)

**Files:**
- Modify: `src/styles/style.scss`

The existing rule at line ~1144 sets `.save-button` to `background: var(--accent)`. The spec wants a teal gradient pill for dark-glass and a sea-gradient pill for light-glass.

- [ ] **Step 1: Replace the shared save-button rule with per-theme versions**

Find the existing rule at line ~1144:

```scss
#app[data-theme-style='light-glass'] .save-button,
#app[data-theme-style='dark-glass'] .save-button,
#app[data-theme-style='light-glass'] .saving-indicator,
#app[data-theme-style='dark-glass'] .saving-indicator {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--card);
}
```

Replace with:

```scss
/* ── Save button — dark-glass ── */
#app[data-theme-style='dark-glass'] .save-button,
#app[data-theme-style='dark-glass'] .saving-indicator {
  background: linear-gradient(135deg, rgba(89, 214, 207, 0.25), rgba(15, 118, 110, 0.25)) !important;
  border: 1.5px solid rgba(89, 214, 207, 0.5) !important;
  border-radius: 999px !important;
  color: #59d6cf !important;
  box-shadow: 0 0 20px rgba(89, 214, 207, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
}

/* ── Save button — light-glass-warm ── */
#app[data-theme-style='light-glass'] .save-button,
#app[data-theme-style='light-glass'] .saving-indicator {
  background: linear-gradient(135deg, #3db8c8 0%, #2185a0 50%, #1a5f7a 100%) !important;
  border: none !important;
  border-radius: 999px !important;
  color: #fff !important;
  box-shadow: 0 4px 18px rgba(33, 133, 160, 0.35), 0 0 24px rgba(61, 184, 200, 0.15) !important;
}
```

- [ ] **Step 2: Add delete (outline-danger) button pill styles**

After the save-button rules, add:

```scss
/* ── Delete button pill — dark-glass ── */
#app[data-theme-style='dark-glass'] .btn-outline-danger {
  background: transparent !important;
  border: 1px solid rgba(255, 80, 60, 0.25) !important;
  border-radius: 999px !important;
  color: rgba(255, 120, 100, 0.7) !important;
}

/* ── Delete button pill — light-glass-warm ── */
#app[data-theme-style='light-glass'] .btn-outline-danger {
  background: transparent !important;
  border: 1px solid rgba(220, 60, 40, 0.2) !important;
  border-radius: 999px !important;
  color: rgba(200, 60, 40, 0.6) !important;
}
```

- [ ] **Step 3: Make all glass .btn elements pill-shaped**

The existing shared `.btn` rule at line ~1063 does not set `border-radius`. Add a pill override after that block:

```scss
#app[data-theme-style='light-glass'] .btn,
#app[data-theme-style='dark-glass'] .btn {
  border-radius: 999px;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/styles/style.scss
git commit -m "feat(theme): pill-shaped buttons with per-theme save/delete glass styles"
```

---

## Task 9: Field Row Gap (FormGridBlock.vue)

**Files:**
- Modify: `src/components/form/FormGridBlock.vue` (scoped `<style>` block)

The spec requires 8 px gap between field rows inside a card. Currently `form_grid_block__column:not(:last-child)` uses `margin-bottom: 0.625rem` (10 px). We override this to 8 px for glass themes.

- [ ] **Step 1: Add glass-theme gap override in FormGridBlock.vue**

In the `<style lang="scss" scoped>` block of `FormGridBlock.vue`, after line 213 (end of the style block), add:

```scss
/* Glass theme: tighter 8px gap between field rows */
:global(#app[data-theme-style='dark-glass']),
:global(#app[data-theme-style='light-glass']) {
  .form_grid_block__column:not(:last-child) {
    margin-bottom: 0.5rem; /* 8px */
  }
}
```

> **Fallback:** If `:global()` in scoped SCSS fails, add to `src/styles/style.scss` instead:
> ```scss
> #app[data-theme-style='dark-glass'] .form_grid_block__column:not(:last-child),
> #app[data-theme-style='light-glass'] .form_grid_block__column:not(:last-child) {
>   margin-bottom: 0.5rem !important;
> }
> ```

- [ ] **Step 2: Commit**

```bash
git add src/components/form/FormGridBlock.vue
git commit -m "feat(theme): 8px field row gap in glass themes"
```

---

## Task 10: Ambient Orbs on Form Containers

**Files:**
- Modify: `src/styles/style.scss`

The existing `#app[data-theme-style]::before` / `::after` pseudo-elements (lines 710–738) create page-level orbs. The spec requires additional orbs scoped to form containers (`.first_level_grid_block`, `.form_sub_block`). We add `::before`/`::after` on the container with `position: relative; overflow: hidden; isolation: isolate` (already present via `isolation: isolate` on `#app`).

Since form cards already have `position` and `overflow` is not `hidden` (we don't want to clip content), we use a wrapper `::before` on the card containers themselves.

- [ ] **Step 1: Add orb pseudo-elements on form cards — dark-glass**

After the dark-glass form card rule (Task 3), add:

```scss
/* ── Ambient orbs inside dark-glass form cards ── */
#app[data-theme-style='dark-glass'] .first_level_grid_block:not(.has-sub-blocks),
#app[data-theme-style='dark-glass'] .form_sub_block {
  position: relative;
  isolation: isolate;
}

#app[data-theme-style='dark-glass'] .first_level_grid_block:not(.has-sub-blocks)::before,
#app[data-theme-style='dark-glass'] .form_sub_block::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 300px;
  height: 300px;
  border-radius: 999px;
  background: rgba(89, 214, 207, 0.07);
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

#app[data-theme-style='dark-glass'] .first_level_grid_block:not(.has-sub-blocks)::after,
#app[data-theme-style='dark-glass'] .form_sub_block::after {
  content: '';
  position: absolute;
  bottom: -40px;
  left: -40px;
  width: 250px;
  height: 250px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.09);
  filter: blur(70px);
  pointer-events: none;
  z-index: 0;
}
```

- [ ] **Step 2: Add orb pseudo-elements on form cards — light-glass-warm**

```scss
/* ── Ambient orbs inside light-glass-warm form cards ── */
#app[data-theme-style='light-glass'] .first_level_grid_block:not(.has-sub-blocks),
#app[data-theme-style='light-glass'] .form_sub_block {
  position: relative;
  isolation: isolate;
}

#app[data-theme-style='light-glass'] .first_level_grid_block:not(.has-sub-blocks)::before,
#app[data-theme-style='light-glass'] .form_sub_block::before {
  content: '';
  position: absolute;
  top: -50px;
  left: -50px;
  width: 340px;
  height: 340px;
  border-radius: 999px;
  background: rgba(255, 249, 226, 0.75);
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}

#app[data-theme-style='light-glass'] .first_level_grid_block:not(.has-sub-blocks)::after,
#app[data-theme-style='light-glass'] .form_sub_block::after {
  content: '';
  position: absolute;
  bottom: -50px;
  right: -50px;
  width: 280px;
  height: 280px;
  border-radius: 999px;
  background: rgba(219, 248, 240, 0.6);
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}
```

- [ ] **Step 3: Ensure card content renders above orbs**

Add a rule to lift the card's direct children above the orb `z-index: 0`:

```scss
#app[data-theme-style='dark-glass'] .first_level_grid_block:not(.has-sub-blocks) > *,
#app[data-theme-style='dark-glass'] .form_sub_block > *,
#app[data-theme-style='light-glass'] .first_level_grid_block:not(.has-sub-blocks) > *,
#app[data-theme-style='light-glass'] .form_sub_block > * {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/styles/style.scss
git commit -m "feat(theme): ambient orb pseudo-elements on glass form cards"
```

---

## Task 11: Enum Chip Classes

**Files:**
- Modify: `src/styles/style.scss`

The spec defines `.chip` classes for coloured enum values displayed as pills inside field rows. These are semantic classes applied by the rendering logic (the colour category is stored in DB metadata and mapped to a CSS class). This task adds the CSS; the Vue-side class mapping is a separate concern (see note below).

- [ ] **Step 1: Add base .chip styles and neutral chip variant**

After all existing glass form rules, before the `@supports` block (~line 1296), add:

```scss
/* ══════════════════════════════════════════════
   Enum Chips — glass themes
   ══════════════════════════════════════════════ */
#app[data-theme-style='dark-glass'] .chip,
#app[data-theme-style='light-glass'] .chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-family: 'Space Grotesk', Manrope, sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

/* Neutral chip */
#app[data-theme-style='dark-glass'] .chip {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

#app[data-theme-style='light-glass'] .chip {
  background: rgba(255, 255, 255, 0.55);
  color: #1f1f1f;
  border: 1px solid rgba(196, 182, 163, 0.5);
}
```

- [ ] **Step 2: Add coloured chip variants — light-glass-warm**

```scss
/* Coloured chips — light-glass-warm */
#app[data-theme-style='light-glass'] .chip.green  { background: rgba(34, 197, 94, 0.15);   color: #16a34a; border-color: rgba(34, 197, 94, 0.3); }
#app[data-theme-style='light-glass'] .chip.teal   { background: rgba(20, 184, 166, 0.14);  color: #0f766e; border-color: rgba(20, 184, 166, 0.28); }
#app[data-theme-style='light-glass'] .chip.blue   { background: rgba(59, 130, 246, 0.14);  color: #2563eb; border-color: rgba(59, 130, 246, 0.28); }
#app[data-theme-style='light-glass'] .chip.indigo { background: rgba(99, 102, 241, 0.14);  color: #4f46e5; border-color: rgba(99, 102, 241, 0.28); }
#app[data-theme-style='light-glass'] .chip.purple { background: rgba(168, 85, 247, 0.14);  color: #9333ea; border-color: rgba(168, 85, 247, 0.28); }
#app[data-theme-style='light-glass'] .chip.amber  { background: rgba(245, 158, 11, 0.15);  color: #b45309; border-color: rgba(245, 158, 11, 0.3); }
#app[data-theme-style='light-glass'] .chip.orange { background: rgba(249, 115, 22, 0.14);  color: #c2410c; border-color: rgba(249, 115, 22, 0.28); }
#app[data-theme-style='light-glass'] .chip.rose   { background: rgba(244, 63, 94, 0.13);   color: #be123c; border-color: rgba(244, 63, 94, 0.28); }
#app[data-theme-style='light-glass'] .chip.sky    { background: rgba(14, 165, 233, 0.13);  color: #0369a1; border-color: rgba(14, 165, 233, 0.28); }
#app[data-theme-style='light-glass'] .chip.lime   { background: rgba(132, 204, 22, 0.13);  color: #4d7c0f; border-color: rgba(132, 204, 22, 0.28); }
```

- [ ] **Step 3: Add coloured chip variants — dark-glass**

```scss
/* Coloured chips — dark-glass */
#app[data-theme-style='dark-glass'] .chip.green  { background: rgba(34, 197, 94, 0.18);   color: #4ade80; border-color: rgba(34, 197, 94, 0.32); }
#app[data-theme-style='dark-glass'] .chip.teal   { background: rgba(20, 184, 166, 0.18);  color: #2dd4bf; border-color: rgba(20, 184, 166, 0.32); }
#app[data-theme-style='dark-glass'] .chip.blue   { background: rgba(59, 130, 246, 0.18);  color: #60a5fa; border-color: rgba(59, 130, 246, 0.32); }
#app[data-theme-style='dark-glass'] .chip.indigo { background: rgba(99, 102, 241, 0.18);  color: #818cf8; border-color: rgba(99, 102, 241, 0.32); }
#app[data-theme-style='dark-glass'] .chip.purple { background: rgba(168, 85, 247, 0.18);  color: #c084fc; border-color: rgba(168, 85, 247, 0.32); }
#app[data-theme-style='dark-glass'] .chip.amber  { background: rgba(245, 158, 11, 0.18);  color: #fbbf24; border-color: rgba(245, 158, 11, 0.32); }
#app[data-theme-style='dark-glass'] .chip.orange { background: rgba(249, 115, 22, 0.18);  color: #fb923c; border-color: rgba(249, 115, 22, 0.32); }
#app[data-theme-style='dark-glass'] .chip.rose   { background: rgba(244, 63, 94, 0.18);   color: #fb7185; border-color: rgba(244, 63, 94, 0.32); }
#app[data-theme-style='dark-glass'] .chip.sky    { background: rgba(14, 165, 233, 0.18);  color: #38bdf8; border-color: rgba(14, 165, 233, 0.32); }
#app[data-theme-style='dark-glass'] .chip.lime   { background: rgba(132, 204, 22, 0.18);  color: #a3e635; border-color: rgba(132, 204, 22, 0.32); }
```

> **Note on Vue-side wiring:** The `.chip` class and colour modifiers (`.chip.green` etc.) need to be applied by whatever component renders enum/select display values. That wiring is not in scope for this plan. This task only defines the CSS. Enum colour metadata → chip class mapping should be handled when enum display rendering is worked on separately.

- [ ] **Step 4: Commit**

```bash
git add src/styles/style.scss
git commit -m "feat(theme): enum chip CSS classes for glass themes (10 colours + neutral)"
```

---

## Task 12: Inputs Inside Sub-blocks — Use Consistent Token Values

**Files:**
- Modify: `src/styles/style.scss` (lines ~1252–1264, inputs inside `.form_sub_block`)

Currently the sub-block input overrides use hardcoded fallback values. They should use the same spec values for consistency.

- [ ] **Step 1: Update sub-block input overrides**

Find:

```scss
/* ── Inputs inside sub-blocks: contrast bg ── */
#app[data-theme-style='dark-glass'] .form_sub_block .form-control,
#app[data-theme-style='dark-glass'] .form_sub_block .custom-select {
  background: rgb(0 0 0 / 30%) !important;
  border-color: rgb(255 255 255 / 10%) !important;
  border-radius: var(--radius-input, 0.75rem) !important;
}

#app[data-theme-style='light-glass'] .form_sub_block .form-control,
#app[data-theme-style='light-glass'] .form_sub_block .custom-select {
  background: rgb(255 255 255 / 60%) !important;
  border-color: rgb(196 182 163 / 20%) !important;
  border-radius: var(--radius-input, 0.75rem) !important;
}
```

Replace with:

```scss
/* ── Inputs inside sub-blocks ── */
#app[data-theme-style='dark-glass'] .form_sub_block .form-control,
#app[data-theme-style='dark-glass'] .form_sub_block .custom-select {
  background: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(255, 255, 255, 0.10) !important;
  border-radius: var(--radius-input, 10px) !important;
}

#app[data-theme-style='light-glass'] .form_sub_block .form-control,
#app[data-theme-style='light-glass'] .form_sub_block .custom-select {
  background: rgba(255, 255, 255, 0.38) !important;
  border-color: rgba(143, 214, 228, 0.45) !important;
  border-radius: var(--radius-input, 12px) !important;
}
```

Also update the same values for `.form_inline_block` (lines ~1202–1213) in the same way:

Find:

```scss
#app[data-theme-style='dark-glass'] .form_inline_block .form-control,
#app[data-theme-style='dark-glass'] .form_inline_block .custom-select {
  background: rgb(0 0 0 / 30%) !important;
  border-color: rgb(255 255 255 / 10%) !important;
  border-radius: var(--radius-input, 0.75rem) !important;
}

#app[data-theme-style='light-glass'] .form_inline_block .form-control,
#app[data-theme-style='light-glass'] .form_inline_block .custom-select {
  background: rgb(255 255 255 / 60%) !important;
  border-color: rgb(196 182 163 / 20%) !important;
  border-radius: var(--radius-input, 0.75rem) !important;
}
```

Replace with:

```scss
#app[data-theme-style='dark-glass'] .form_inline_block .form-control,
#app[data-theme-style='dark-glass'] .form_inline_block .custom-select {
  background: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(255, 255, 255, 0.10) !important;
  border-radius: var(--radius-input, 10px) !important;
}

#app[data-theme-style='light-glass'] .form_inline_block .form-control,
#app[data-theme-style='light-glass'] .form_inline_block .custom-select {
  background: rgba(255, 255, 255, 0.38) !important;
  border-color: rgba(143, 214, 228, 0.45) !important;
  border-radius: var(--radius-input, 12px) !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/style.scss
git commit -m "fix(theme): align sub-block input styles with spec field values"
```

---

## Self-review checklist

After all tasks are complete, verify:

- [ ] Build succeeds: `yarn build` (or `yarn dev` and check browser console)
- [ ] Default themes (`default`, `dark`) are visually unchanged — open a form in default theme and confirm nothing broke
- [ ] `dark-glass`: form card has subtle blur + teal border glow on input focus
- [ ] `light-glass`: form card has warm white glass + sea-teal focus ring
- [ ] Buttons are pill-shaped in both glass themes
- [ ] Section titles are uppercase Space Grotesk in both themes
- [ ] Field labels (border-label) are uppercase Space Grotesk
- [ ] Required dot (empty) glows red
- [ ] `.chip.green` etc. render correct colours — test by temporarily adding `<span class="chip green">Test</span>` in a template
- [ ] Ambient orbs visible but don't clip form content
- [ ] No JS errors in console
