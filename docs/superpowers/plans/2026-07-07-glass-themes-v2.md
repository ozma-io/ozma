# Glass Themes 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `dark-glass` in place and add a new `light-glass-cool` theme per the approved design system (spec `docs/superpowers/specs/2026-07-07-glass-themes-v2-design.md`), while freezing the warm `light-glass` theme pixel-for-pixel.

**Architecture:** All theming stays CSS-only, keyed on the `data-theme-style` attribute (html/body/#app). Legacy shared glass CSS in `src/styles/style.scss` is mechanically re-scoped to `light-glass` only; the new component system lives in a new partial `src/styles/glass2.scss` (per-theme token blocks + component mixins instantiated under both new theme selectors). Icons switch to vendored Lucide SVGs through a new `AppIcon` wrapper component that falls back to Material ligatures for unmapped names and old themes.

**Tech Stack:** Vue 2.7 + TypeScript class components, Vuex 3, Bootstrap 4 / bootstrap-vue, SCSS via @vue/cli-service 5, monaco-editor, @fontsource (Inter + JetBrains Mono already bundled), lucide-static path data vendored (no new runtime deps), PostgreSQL seeding via `deploy.sh`.

---

## Important context for the implementer

- **Spec:** `/Users/vientooscuro/SyncFolder/ozma/docs/superpowers/specs/2026-07-07-glass-themes-v2-design.md` — read it before starting. Section references below (§N) point to it.
- **Repo:** `/Users/vientooscuro/SyncFolder/ozma`, branch off `master`.
- **Verification commands** (from `package.json`):
  - `yarn lint:style` — stylelint over `src/` (exit 0, no output on success).
  - `yarn lint` — eslint via vue-cli (auto-fixes; prints `DONE No lint errors found!` on success). Also performs TS type-checking of touched `.ts`/`.vue` files at build time only, so:
  - `./local_rebuild_and_publish.sh --only_ui` — the ONLY sanctioned way to rebuild + republish the local frontend (builds the full bundle, so it is also the de-facto full type-check/build gate). Takes minutes; run it at the marked **Visual checkpoint** steps, not after every CSS tweak.
- **There is NO unit-test infrastructure** (no vitest/jest; only Playwright e2e configured for other flows). CSS and the `AppIcon` component are therefore verified via `yarn lint` + `yarn lint:style` + full build + explicit visual checkpoints. This is stated per-task below.
- **Local app:** after `./local_rebuild_and_publish.sh --only_ui`, open `http://localhost:9080`. Theme switcher: avatar (profile button, top right) → theme entries. The 4 reference screens (§11): main menu (root view), a table report view, a record form (open any row), the schema workspace (development mode views with the Monaco editor).
- **Mockup reference:** `~/Downloads/Новый дизайн экранов` — serve statically with the existing `.claude/launch.json` config `design-mockup` (`python3 -m http.server 8899 --directory "/Users/vientooscuro/Downloads/Новый дизайн экранов"`).
- **Commit style:** one commit per task, short one-line English imperative title, no body, no backticks, no Co-Authored-By.

## File structure

| File | Status | Responsibility |
|---|---|---|
| `src/styles/style.scss` | modify | Legacy glass CSS re-scoped to `light-glass` only (lines ~600–2210); toast var blocks extended/retokenized (lines ~2256–2271); `@import 'glass2';` appended at the end |
| `src/styles/glass2.scss` | create | Glass 2.0: per-theme token blocks, consumer-var bridge, component mixins (shell, header, menu, controls, table, overlays, scrollbars) instantiated under `dark-glass` + `light-glass-cool` |
| `src/utils/lucideIcons.ts` | create | Vendored Lucide SVG inner markup + material→lucide name map + `lucideMarkupForMaterialName()` |
| `src/components/AppIcon.vue` | create | Icon wrapper: Lucide SVG in new themes for mapped names, Material ligature fallback otherwise |
| `src/main.ts` | modify (~line 13–17, 217–221) | Global registration of `AppIcon` |
| ~20 components (listed in Task 8) | modify | Replace direct `<span/i class="material-icons">` usages with `<AppIcon>` |
| `src/components/editors/CodeEditor.vue` | modify (~322, 431–507, 553–558, 686–695, 978–1092) | Add `ozma-light-glass-cool` Monaco theme, retokenize `ozma-dark-glass`, extend theme routing + `::v-deep` token colors |
| `src/utils_colors.ts` | modify (~466–474) | Add `light-glass-cool` to the theme fallback chain |
| `deploy.sh` | modify (after line 530) | New idempotent stage 7b: upsert `light-glass-cool` theme row + copy color variants from `light-glass` |

---

## Task 1: Freeze the warm theme — re-scope legacy glass CSS to light-glass only

The riskiest task. All shared `[data-theme-style='light-glass'], [data-theme-style='dark-glass']` selector lists in `src/styles/style.scss` lose their `dark-glass` parts, and rules that were dark-glass-only are deleted (their replacements come from `glass2.scss` in later tasks). The warm theme must be byte-identically styled afterwards.

A tested Python script does this mechanically. It operates ONLY between two markers in `style.scss` (`/* Full gelfand.dev visual language applied to ozma glass themes. */` at ~line 600 and `/* finishWith toast — base (all themes) */` at ~line 2211) and preserves:
- the `html[data-theme-style='dark-glass']` token block at ~633–674 (detected by `--bg:` in its body; it keeps dark-glass minimally usable until Task 2 replaces it),
- everything outside the marker range (base CSS, toast blocks).

The script was verified against the current file: result has exactly 4 remaining `dark-glass` mentions (token-block selector + its inner comment + the two toast blocks after the end marker), balanced braces, and untouched light-glass rule bodies.

**Files:**
- Modify: `src/styles/style.scss` (region lines 600–2210 shrinks by ~550 lines)

- [ ] **Step 1: Create a branch and take BEFORE screenshots of the warm theme**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
git checkout -b glass-themes-2
```

Then rebuild and capture the regression baseline (the app may already be running with current code; if unsure, rebuild first with `./local_rebuild_and_publish.sh --only_ui`):
1. Open `http://localhost:9080`, switch to the warm light-glass theme («Светлая стеклянная») via the profile menu.
2. Screenshot: main menu, a table view, an open record form. Save to `/tmp/glass2-before/` (e.g. with macOS `screencapture` or browser devtools).

- [ ] **Step 2: Save the re-scope script**

Write the following to `/tmp/rescope-glass.py` (verified against the current file; do not modify):

```python
#!/usr/bin/env python3
"""Re-scope legacy shared glass CSS to light-glass only (Glass Themes 2.0, phase 0).

Operates ONLY between the markers:
  start: /* Full gelfand.dev visual language applied to ozma glass themes. */
  end:   /* finishWith toast — base (all themes) */
Rules whose selector lists mention dark-glass lose those selector parts;
rules left with no selectors are deleted together with their adjacent
leading comment. The html-level dark-glass token block (contains --bg:)
is kept untouched (it is replaced later by glass2.scss).
"""
import re
import sys

path = sys.argv[1] if len(sys.argv) > 1 else 'src/styles/style.scss'
src = open(path).read()

START = '/* Full gelfand.dev visual language applied to ozma glass themes. */'
END = '/* finishWith toast — base (all themes) */'
start_i = src.index(START)
end_i = src.index(END)
head, region, tail = src[:start_i], src[start_i:end_i], src[end_i:]

def parse_chunks(text):
    """Split css text into chunks: ('comment', str), ('rule', sel, body), ('at', sel, body), ('raw', str)."""
    chunks = []
    i = 0
    n = len(text)
    while i < n:
        m = re.match(r'\s+', text[i:])
        if m:
            chunks.append(('raw', m.group(0)))
            i += m.end()
            continue
        if text.startswith('/*', i):
            j = text.index('*/', i) + 2
            chunks.append(('comment', text[i:j]))
            i = j
            continue
        j = text.index('{', i)
        sel = text[i:j]
        depth = 0
        k = j
        while k < n:
            if text[k] == '{':
                depth += 1
            elif text[k] == '}':
                depth -= 1
                if depth == 0:
                    break
            k += 1
        body = text[j + 1:k]
        kind = 'at' if sel.lstrip().startswith('@') else 'rule'
        chunks.append((kind, sel, body))
        i = k + 1
    return chunks

def filter_selector(sel):
    """Drop selector parts mentioning dark-glass. Return new selector or None."""
    parts = [p.strip() for p in sel.split(',')]
    kept = [p for p in parts if "dark-glass" not in p]
    if not kept:
        return None
    return ',\n'.join(kept)

def process(chunks, out):
    pending_comment = None
    pending_raw = ''
    pending_raw_prev = ''
    for ch in chunks:
        if ch[0] == 'raw':
            pending_raw += ch[1]
            continue
        if ch[0] == 'comment':
            if pending_comment is not None:
                out.append(pending_raw_prev + pending_comment)
            pending_raw_prev = pending_raw
            pending_comment = ch[1]
            pending_raw = ''
            continue
        if ch[0] == 'at':
            sel, body = ch[1], ch[2]
            inner_out = []
            process(parse_chunks(body), inner_out)
            inner = ''.join(inner_out)
            if pending_comment is not None:
                out.append(pending_raw_prev + pending_comment)
                pending_comment = None
            if inner.strip():
                out.append(pending_raw + sel + '{' + inner + '}')
            pending_raw = ''
            continue
        sel, body = ch[1], ch[2]
        if "dark-glass" not in sel:
            if pending_comment is not None:
                out.append(pending_raw_prev + pending_comment)
                pending_comment = None
            out.append(pending_raw + sel + '{' + body + '}')
            pending_raw = ''
            continue
        if sel.strip() == "html[data-theme-style='dark-glass']" and '--bg:' in body:
            if pending_comment is not None:
                out.append(pending_raw_prev + pending_comment)
                pending_comment = None
            out.append(pending_raw + sel + '{' + body + '}')
            pending_raw = ''
            continue
        new_sel = filter_selector(sel)
        if new_sel is None:
            pending_comment = None
            pending_raw = ''
            continue
        if pending_comment is not None:
            out.append(pending_raw_prev + pending_comment)
            pending_comment = None
        lead = re.match(r'\s*', sel).group(0)
        out.append(pending_raw + lead + new_sel + ' {' + body + '}')
        pending_raw = ''
    if pending_comment is not None:
        out.append(pending_raw_prev + pending_comment)
    out.append(pending_raw)

out = []
process(parse_chunks(region), out)
new_region = ''.join(out)
new_region = re.sub(r'\n{3,}', '\n\n', new_region)
open(path, 'w').write(head + new_region + tail)
print('done')
```

- [ ] **Step 3: Run the script and verify the mechanical result**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
python3 /tmp/rescope-glass.py src/styles/style.scss
grep -c "dark-glass" src/styles/style.scss
python3 -c "s=open('src/styles/style.scss').read(); print('brace balance:', s.count('{')-s.count('}'))"
```

Expected output:
```
done
4
brace balance: 0
```

The 4 remaining `dark-glass` mentions must be (check with `grep -n "dark-glass" src/styles/style.scss`):
1. `html[data-theme-style='dark-glass'] {` — the legacy token block (kept until Task 2),
2. `  /* Form design tokens — dark-glass */` — comment inside that block,
3. `html[data-theme-style='dark-glass'] {` — toast rgb vars block (retokenized in Task 6),
4. `html[data-theme-style='dark-glass'] {` — shared toast structure selector (extended in Task 6).

Sanity-check the diff for the enumerated transformations (spot-check these; the full list of legacy blocks by original line numbers is in the appendix at the bottom of this plan):
- Original line 601–602: selector is now `html[data-theme-style='light-glass'] {` only.
- Original 797–806: the big shared block keeps only the 5 light-glass selectors (`#app… .header-panel`, `#app… .menu_category_block`, `#app… .root-wrapper`, `html… .vm--modal`, `html… .modal-content`).
- Original 1087–1095 (`/* ── Form inputs — dark-glass ── */` + rule), 1245–1253 (dark save-button), 1289–1297 (dark form cards), 1472–1565 (dark floating table rows), 2116–2126 (dark coloured chips) are fully deleted, comments included.
- The `@supports not (backdrop-filter: blur(1px))` block keeps only light-glass selectors and drops the dark-only `…custom-table tbody tr td` rule.
- The `light-glass` rule BODIES are byte-identical (only selector lists changed).

- [ ] **Step 4: Format and lint**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
npx prettier --write src/styles/style.scss
yarn lint:style
```

Expected: prettier rewrites indentation of the re-emitted selector lists; `yarn lint:style` exits 0 with no violations.

- [ ] **Step 5: Visual checkpoint — warm theme regression (§11.3)**

```bash
./local_rebuild_and_publish.sh --only_ui
```

Open `http://localhost:9080` in the warm light-glass theme and re-take the same screenshots as Step 1 into `/tmp/glass2-after/`. Compare side by side (or `compare` from ImageMagick if available): main menu, table view, record form **must be visually identical** to `/tmp/glass2-before/`. Also quickly open a dropdown (profile menu) and a modal — identical.

Then switch to dark-glass: it is EXPECTED to look degraded/bare now (tokens still give dark text/input colors, но компонентные стили ушли). Do not fix anything here.

- [ ] **Step 6: Commit**

```bash
git add src/styles/style.scss
git commit -m "style(glass): re-scope legacy glass css to light-glass only"
```

---

## Task 2: glass2.scss — tokens, bridge, fonts, shell background, scrollbars

Creates the new partial with §3 token blocks, the §3.3 shared non-color tokens, the consumer-var bridge (same consumer vars as the legacy bridge at the old `#app[...]` block), compat aliases for the few legacy vars still consumed by shared rules (`--ink` for tooltips at style.scss:596–598, `--accent`/`--accent-2` for the kept toast structure), the §6.1 app shell (gradient + ambient glows, Inter, headings), and §6.9 scrollbars. Deletes the legacy dark-glass token block from style.scss and imports the partial.

**Files:**
- Create: `src/styles/glass2.scss`
- Modify: `src/styles/style.scss` (delete legacy dark-glass token block ~line 632–673 post-Task-1; append import at end of file)

- [ ] **Step 1: Create `src/styles/glass2.scss` with token blocks and shell**

```scss
// ═══════════════════════════════════════════════════════════════════════════
// Glass Themes 2.0 — dark-glass (redesigned in place) + light-glass-cool.
// Spec: docs/superpowers/specs/2026-07-07-glass-themes-v2-design.md
//
// Structure: per-theme token blocks (html level), a consumer-var bridge shared
// by both themes, then component mixins instantiated under both theme
// selectors. The frozen warm light-glass theme lives in style.scss.
// ═══════════════════════════════════════════════════════════════════════════

/* ── Tokens — dark-glass (§3.1) ── */
html[data-theme-style='dark-glass'] {
  --bg-app: #04090b;
  --bg-shell: #081217;
  --surface-card: rgba(14, 25, 32, 0.72);
  --surface-card-2: rgba(23, 38, 47, 0.8);
  --surface-inset: rgba(2, 7, 9, 0.55);
  --surface-row-alt: rgba(255, 255, 255, 0.025);
  --surface-hover: rgba(255, 255, 255, 0.05);
  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-default: rgba(255, 255, 255, 0.11);
  --border-strong: rgba(255, 255, 255, 0.18);
  --border-focus: #35d3c0;
  --text-primary: #f1f7f7;
  --text-secondary: #a3b8be;
  --text-muted: #64808a;
  --text-disabled: #3e525b;
  --text-on-accent: #04211d;
  --accent-600: #14b8a6;
  --accent-500: #2dd4bf;
  --accent-400: #45e3cf;
  --accent-300: #8cf0e3;
  --gradient-accent: linear-gradient(
    135deg,
    #1fa2c9 0%,
    #2dd4bf 55%,
    #6ef0d2 100%
  );
  --accent-tint: rgba(45, 212, 191, 0.12);
  --accent-tint-border: rgba(45, 212, 191, 0.35);
  --link: #4fc9e8;
  --info: #46c8cf;
  --success: #34e28a;
  --success-tint: rgba(52, 226, 138, 0.1);
  --success-tint-border: rgba(52, 226, 138, 0.32);
  --danger: #ff5c6b;
  --danger-tint: rgba(255, 92, 107, 0.1);
  --danger-tint-border: rgba(255, 92, 107, 0.3);
  --warning: #ffba53;
  --warning-tint: rgba(255, 186, 83, 0.1);
  --purple: #b18cff;
  --glow-a: radial-gradient(
    600px 420px at 12% -8%,
    rgba(45, 212, 191, 0.12),
    transparent 70%
  );
  --glow-b: radial-gradient(
    700px 480px at 95% 8%,
    rgba(31, 162, 201, 0.09),
    transparent 70%
  );
  --shadow-card: 0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 12px 32px rgba(0, 0, 0, 0.3);
  --shadow-accent-glow: 0 8px 28px rgba(45, 212, 191, 0.32);
  --shadow-accent-glow-hover: 0 12px 36px rgba(45, 212, 191, 0.45);
  --focus-ring: 0 0 0 3px rgba(53, 211, 192, 0.26);
  --glass-fixed-bg: #0c171d;
  --scroll-thumb: rgba(255, 255, 255, 0.14);
  --overlay-bg: rgba(2, 8, 12, 0.6);
}

/* ── Tokens — light-glass-cool (§3.2) ── */
html[data-theme-style='light-glass-cool'] {
  --bg-app: #e9f2f2;
  --bg-shell: #f6fbfa;
  --surface-card: rgba(255, 255, 255, 0.78);
  --surface-card-2: rgba(255, 255, 255, 0.92);
  --surface-inset: rgba(10, 35, 40, 0.045);
  --surface-row-alt: rgba(10, 35, 40, 0.03);
  --surface-hover: rgba(10, 35, 40, 0.05);
  --border-subtle: rgba(10, 35, 40, 0.07);
  --border-default: rgba(10, 35, 40, 0.12);
  --border-strong: rgba(10, 35, 40, 0.2);
  --border-focus: #14b8a6;
  --text-primary: #0b1b1e;
  --text-secondary: #40585f;
  --text-muted: #74898f;
  --text-disabled: #b3c2c6;
  --text-on-accent: #04211d;
  --accent-600: #0b8577;
  --accent-500: #0fa895;
  --accent-400: #14b8a6;
  --accent-300: #0d8a7b;
  --gradient-accent: linear-gradient(
    135deg,
    #1fa2c9 0%,
    #2dd4bf 55%,
    #6ef0d2 100%
  );
  --accent-tint: rgba(15, 168, 149, 0.1);
  --accent-tint-border: rgba(15, 168, 149, 0.32);
  --link: #0e7fa8;
  --info: #0e8f96;
  --success: #0fa968;
  --success-tint: rgba(15, 169, 104, 0.09);
  --success-tint-border: rgba(15, 169, 104, 0.3);
  --danger: #e23d50;
  --danger-tint: rgba(226, 61, 80, 0.08);
  --danger-tint-border: rgba(226, 61, 80, 0.28);
  --warning: #b45309;
  --warning-tint: rgba(245, 158, 11, 0.12);
  --purple: #8b5cf6;
  --glow-a: radial-gradient(
    600px 420px at 12% -8%,
    rgba(20, 184, 166, 0.1),
    transparent 70%
  );
  --glow-b: radial-gradient(
    700px 480px at 95% 8%,
    rgba(31, 162, 201, 0.08),
    transparent 70%
  );
  --shadow-card: 0 1px 0 rgba(255, 255, 255, 0.8) inset,
    0 10px 28px rgba(20, 28, 60, 0.1);
  --shadow-accent-glow: 0 8px 24px rgba(20, 184, 166, 0.28);
  --shadow-accent-glow-hover: 0 12px 32px rgba(20, 184, 166, 0.38);
  --focus-ring: 0 0 0 3px rgba(20, 184, 166, 0.2);
  --glass-fixed-bg: #fbfdfd;
  --scroll-thumb: rgba(10, 35, 40, 0.18);
  --overlay-bg: rgba(10, 20, 24, 0.35);
}

/* ── Shared non-color tokens + consumer-var bridge (§3.3) ──
   html level so poppers/modals/toasts rendered outside #app inherit too. */
html[data-theme-style='dark-glass'],
html[data-theme-style='light-glass-cool'] {
  --glass-blur: blur(24px) saturate(150%);
  --glass-blur-strong: blur(40px) saturate(160%);
  --radius-input: 12px;
  --radius-button: 14px;
  --radius-card: 20px;
  --radius-card-lg: 24px;
  --radius-checkbox: 7px;
  --control-h-sm: 32px;
  --control-h-md: 40px;
  --control-h-lg: 46px;
  --card-padding: 28px;
  --table-row-h: 60px;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);
  --dur-fast: 120ms;
  --dur-base: 200ms;
  --dur-slow: 340ms;

  /* Bridge onto existing consumer vars (mirrors the legacy bridge). */
  --MainTextColor: var(--text-primary);
  --MainTextColorLight: var(--text-muted);
  --MainBackgroundColor: var(--bg-shell);
  --MainBorderColor: var(--border-default);
  --FocusBorderColor: var(--border-focus);
  --cell-borderColor: var(--border-default);
  --cell-backgroundColor: var(--surface-inset);
  --cell-foregroundColor: var(--text-primary);
  --cell-foregroundDarkerColor: var(--text-disabled);
  --default-backgroundColor: var(--surface-card);
  --default-backgroundDarker1Color: var(--surface-card-2);
  --default-backgroundDarker2Color: var(--surface-hover);
  --default-borderColor: var(--border-default);
  --default-foregroundColor: var(--text-primary);
  --default-foregroundDarkerColor: var(--text-secondary);
  --default-shadowColor: rgb(0 0 0 / 40%);
  --table-horizontal-borderColor: var(--border-subtle);
  --userview-background-color: transparent;

  /* Compat aliases for legacy shared rules that stay multi-theme:
     tooltips use --ink (style.scss:596), the kept toast structure uses
     --accent / --accent-2 (style.scss finishWith block). */
  --ink: var(--text-primary);
  --muted: var(--text-muted);
  --accent: var(--accent-500);
  --accent-2: var(--warning);
}

/* ── Typography helpers (§4) ── */
@mixin glass2-microlabel {
  font-family: Inter, sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--text-muted);
}

@mixin glass2-mono {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
}

/* ── App shell & background (§6.1) ── */
@mixin glass2-shell {
  position: relative;
  isolation: isolate;
  color: var(--text-primary);
  background:
    var(--glow-a),
    var(--glow-b),
    linear-gradient(180deg, var(--bg-shell) 0%, var(--bg-app) 55%);
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;

  /* No blurred orbs and no glass-rise entrance in the new themes (§7). */
  &::before,
  &::after {
    content: none;
  }

  h1,
  h2,
  h3,
  .menu-header,
  .button-caption,
  .userview-title {
    font-family: inherit;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
}

#app[data-theme-style='dark-glass'],
#app[data-theme-style='light-glass-cool'] {
  @include glass2-shell;
}

/* ── Scrollbars (§6.9) ── */
@mixin glass2-scrollbars {
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--scroll-thumb) transparent;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: var(--scroll-thumb);
  }

  ::-webkit-scrollbar-track,
  ::-webkit-scrollbar-corner {
    background: transparent;
  }
}

html[data-theme-style='dark-glass'],
html[data-theme-style='light-glass-cool'] {
  @include glass2-scrollbars;
}
```

- [ ] **Step 2: Delete the legacy dark-glass token block from style.scss**

In `src/styles/style.scss`, find and delete this entire block (post-Task-1 it directly follows the light-glass token block; content unchanged since before Task 1):

```scss
html[data-theme-style='dark-glass'] {
  --bg: #070e17;
  --card: #0b1623;
  --ink: #e7ecef;
  --muted: #95a7b6;
  --accent: #4fd6be;
  --accent-2: #f6b941;
  --line: rgb(140 176 200 / 14%);
  --control-line: rgb(140 176 200 / 10%);
  --surface: rgb(17 32 46 / 42%);
  --surface-strong: rgb(17 32 46 / 56%);
  --panel-bg: rgb(10 20 33 / 28%);
  --panel-border: rgb(169 209 232 / 16%);
  --text-soft: #d4dee6;
  --glow-1: #0b2633;
  --glow-2: #050a18;
  --shape-1: #071427;
  --shape-2: #0b5e52;
  --contact-hover-border: rgb(169 209 232 / 18%);
  --contact-hover-shadow: 0 34px 90px rgb(0 0 0 / 55%);
  --shadow: 0 18px 50px rgb(0 0 0 / 28%);
  --overlay-bg: rgb(2 8 17 / 58%);
  --table-horizontal-borderColor: rgb(140 176 200 / 10%);

  /* Sub-block tokens (dark) */
  --sub-block-bg: rgb(255 255 255 / 3%);
  --sub-block-border: rgb(255 255 255 / 6%);

  /* Form design tokens — dark-glass */
  --cell-borderColor: rgba(255, 255, 255, 0.1);
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
}
```

Note: prettier in Task 1 may have normalized number formatting inside this block (e.g. `0.10` → `0.1`). Match the actual current file content when deleting — the block is uniquely identified by its selector plus `--bg: #070e17;` on the first line.

- [ ] **Step 3: Import the partial at the end of style.scss**

Append at the very end of `src/styles/style.scss` (after the closing brace of the last toast block), so glass2 rules win the cascade at equal specificity:

```scss

/* Glass Themes 2.0 — dark-glass (new look) + light-glass-cool. */
@import 'glass2';
```

- [ ] **Step 4: Lint**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
yarn lint:style
```

Expected: exit 0. (No rebuild yet — the shell alone is not worth a build cycle; Task 3 ends with a visual checkpoint.)

- [ ] **Step 5: Commit**

```bash
git add src/styles/glass2.scss src/styles/style.scss
git commit -m "style(glass2): add tokens, bridge and shell for new glass themes"
```

---

## Task 3: Header panel and main menu

§6.2 + §6.3. Appends the header/menu mixins to `glass2.scss`. Ends with the first visual checkpoint of the new look.

**Files:**
- Modify: `src/styles/glass2.scss` (append at end)

- [ ] **Step 1: Append the header mixin and its instantiation to `src/styles/glass2.scss`**

```scss
/* ── Header panel (§6.2) ── */
@mixin glass2-header {
  .header-panel {
    border: 1px solid var(--border-subtle);
    border-bottom-color: var(--border-subtle);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
  }

  .header-panel.is-root {
    position: sticky;
    top: 0;
    z-index: 100;
    margin: 0.55rem 0.55rem 0;
    box-sizing: border-box;
    width: calc(100% - 1.1rem);
    border-radius: 16px;
    box-shadow: var(--shadow-card);
  }

  .userview-upper-div > .userview-div {
    margin: 0.5rem 0.55rem 0;
    box-sizing: border-box;
    width: calc(100% - 1.1rem);
  }

  .userview-title {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .profile-button-wrapper {
    padding-right: 0;
  }

  /* Avatar: gradient tile, radius 12 (overrides the inline
     backgroundColor/borderRadius set by Avatar.vue). */
  .header-panel .avatar-box .placeholder-avatar {
    background: var(--gradient-accent) !important;
    border-radius: 12px !important;
    color: var(--text-on-accent);
  }
}

#app[data-theme-style='dark-glass'],
#app[data-theme-style='light-glass-cool'] {
  @include glass2-header;
}
```

- [ ] **Step 2: Append the menu mixin and its instantiation**

```scss
/* ── Main menu (§6.3) ── */
@mixin glass2-menu {
  .menu_category_block {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card-lg);
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    padding: var(--card-padding);
  }

  .menu-header {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .menu-entry {
    border: none;
    border-radius: 12px;
    background: transparent;
    min-height: 38px;
    color: var(--text-primary);
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    transition: background var(--dur-fast) var(--ease-out);
  }

  /* Approved: subtle hover returns in the NEW themes only (§6.3). */
  .menu-entry:hover:not(.disabled),
  .menu-entry:focus-visible:not(.disabled) {
    border: none;
    background: var(--surface-hover);
    box-shadow: none;
    transform: none;
  }

  .menu-entry .icon.no-icon {
    color: var(--text-muted);
  }

  /* DB-driven entry variants: keep entries flat, hover still applies. */
  .menu_category_block.menuEntry-variant.menuEntry-local-variant {
    border: 1px solid var(--border-subtle);
  }

  .menu_category_block.menuEntry-variant.menuEntry-local-variant .menu-entry {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    transform: none !important;
  }

  .menu_category_block.menuEntry-variant.menuEntry-local-variant
    .menu-entry:hover:not(.disabled),
  .menu_category_block.menuEntry-variant.menuEntry-local-variant
    .menu-entry:focus-visible:not(.disabled) {
    background: var(--surface-hover) !important;
  }

  /* Count badges: small muted pills. */
  .menu_category_block .badge {
    border: 1px solid var(--border-subtle);
    border-radius: 999px;
    background: var(--surface-inset);
    color: var(--text-muted);
    font-weight: 600;
  }
}

#app[data-theme-style='dark-glass'],
#app[data-theme-style='light-glass-cool'] {
  @include glass2-menu;
}
```

- [ ] **Step 3: Lint and rebuild**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
yarn lint:style
./local_rebuild_and_publish.sh --only_ui
```

Expected: stylelint exit 0; rebuild completes without webpack/sass errors.

- [ ] **Step 4: Visual checkpoint — shell, header, main menu**

Open `http://localhost:9080`, check in **both** `dark-glass` and (temporarily via devtools, since the DB row does not exist yet: run `document.documentElement.setAttribute('data-theme-style', 'light-glass-cool'); document.body.setAttribute('data-theme-style', 'light-glass-cool'); document.getElementById('app').setAttribute('data-theme-style', 'light-glass-cool')` in the console) `light-glass-cool`:
- Background: near-black `#04090B→#081217` gradient (dark) / `#E9F2F2→#F6FBFA` (cool light) with two soft teal/cyan radial glows top-left and top-right. No blurred circle orbs.
- Font is Inter everywhere inside `#app` (check computed style on body text).
- Header panel: frosted card, 16px radius, subtle border, sticky; page title 20px bold.
- Main menu: category cards radius 24, padding 28, subtle border + card shadow; entries flat, hover shows a faint highlight; badges are muted pills.
- Compare against the mockup main-menu screen (`design-mockup` server).
- Switch to warm light-glass — unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/styles/glass2.scss
git commit -m "style(glass2): header panel and main menu"
```

---

## Task 4: Buttons, inputs, form cards

§6.5 + toolbar buttons from §6.2 + the preserved perf/scroll fixes that apply to forms. Appends the controls mixin to `glass2.scss`.

**Files:**
- Modify: `src/styles/glass2.scss` (append at end)

- [ ] **Step 1: Append the buttons part of the controls mixin**

```scss
/* ── Buttons (§6.2, §6.5) ── */
@mixin glass2-buttons {
  .btn,
  .save-cluster-button {
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--text-primary);
    transition:
      transform var(--dur-base) var(--ease-spring),
      box-shadow var(--dur-base) var(--ease-out),
      background var(--dur-fast) var(--ease-out),
      border-color var(--dur-fast) var(--ease-out);
  }

  .btn:hover:not(:disabled),
  .save-cluster-button:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--border-strong);
    background: var(--surface-hover);
    box-shadow: none;
  }

  .btn:active:not(:disabled),
  .save-cluster-button:active:not(:disabled) {
    transform: scale(0.98);
    transition-duration: var(--dur-fast);
  }

  .btn:focus-visible:not(:disabled),
  .save-cluster-button:focus-visible:not(:disabled) {
    outline: none;
    box-shadow: var(--focus-ring);
  }

  /* Icon buttons: borderless until hover, radius 12. */
  .material-button {
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    color: var(--text-primary);
    transition:
      background var(--dur-fast) var(--ease-out),
      border-color var(--dur-fast) var(--ease-out);
  }

  .material-button:hover:not(:disabled) {
    border-color: var(--border-default);
    background: var(--surface-hover);
    transform: none;
    box-shadow: none;
  }

  /* Primary action: gradient pill with glow. */
  .btn-primary,
  .save-button,
  .saving-indicator {
    border: none !important;
    border-radius: var(--radius-button) !important;
    background: var(--gradient-accent) !important;
    color: var(--text-on-accent) !important;
    font-weight: 600;
    box-shadow: var(--shadow-accent-glow) !important;
  }

  .btn-primary:hover:not(:disabled),
  .save-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-accent-glow-hover) !important;
  }

  /* Secondary: glass chips. */
  .btn-secondary,
  .btn-outline-secondary,
  .btn-light {
    border: 1px solid var(--border-default) !important;
    background: transparent !important;
    color: var(--text-primary) !important;
  }

  /* Danger: tinted. */
  .btn-outline-danger,
  .btn-danger {
    border: 1px solid var(--danger-tint-border) !important;
    border-radius: var(--radius-button) !important;
    background: var(--danger-tint) !important;
    color: var(--danger) !important;
  }
}

#app[data-theme-style='dark-glass'],
#app[data-theme-style='light-glass-cool'] {
  @include glass2-buttons;
}
```

- [ ] **Step 2: Append the inputs mixin**

```scss
/* ── Inputs (§6.5) ── */
@mixin glass2-inputs {
  .form-control,
  .custom-select {
    border: 1px solid var(--border-default) !important;
    border-radius: var(--radius-input) !important;
    background: var(--surface-inset) !important;
    box-shadow: none !important;
    color: var(--text-primary) !important;
    font-size: 15px;
  }

  .form-control::placeholder {
    color: var(--text-disabled) !important;
  }

  .form-control:focus,
  .custom-select:focus {
    border-color: var(--border-focus) !important;
    box-shadow: var(--focus-ring) !important;
  }

  .form-control:disabled,
  .custom-select:disabled {
    opacity: 0.6;
    color: var(--text-disabled) !important;
  }

  .list-group-item,
  .input-group-text {
    border-color: var(--border-default) !important;
    background: var(--surface-inset) !important;
    color: var(--text-primary) !important;
  }

  .select-container {
    border-color: var(--border-default);
    border-radius: var(--radius-input);
    background: var(--surface-inset);
    overflow: hidden;
  }

  .select-container:focus-within,
  .select-container:focus {
    border-color: var(--border-focus);
    box-shadow: var(--focus-ring);
  }

  .select-container .input-group-append {
    margin-left: 0;
  }

  .select-container .select-icon {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    border: none !important;
    border-left: 1px solid var(--border-subtle) !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: var(--text-muted) !important;
  }
}

#app[data-theme-style='dark-glass'],
#app[data-theme-style='light-glass-cool'] {
  @include glass2-inputs;
}
```

- [ ] **Step 3: Append the form-cards mixin (incl. preserved perf/scroll fixes)**

```scss
/* ── Form cards, labels, indicators (§6.5) ── */
@mixin glass2-form {
  .first_level_grid_block:not(.has-sub-blocks),
  .form_sub_block {
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-card) !important;
    background: var(--surface-card) !important;
    box-shadow: var(--shadow-card) !important;
    backdrop-filter: var(--glass-blur) !important;
    -webkit-backdrop-filter: var(--glass-blur) !important;
    padding: var(--card-padding) !important;
  }

  .form_sub_block {
    margin-bottom: 0.75rem !important;
  }

  .form_sub_block:last-child {
    margin-bottom: 0 !important;
  }

  .first_level_grid_block.has-sub-blocks {
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    padding: 0 !important;
  }

  .form_inline_block {
    border: 1px solid var(--border-subtle) !important;
    border-radius: 0.75rem !important;
    background: var(--surface-row-alt) !important;
    box-shadow: none !important;
    padding: 1.25rem !important;
    margin-bottom: 0.75rem !important;
  }

  .form_inline_block:last-child {
    margin-bottom: 0 !important;
  }

  /* Section captions: 17px/700 (§6.5). */
  .form_sub_block__title {
    font-family: Inter, sans-serif !important;
    font-size: 17px !important;
    font-weight: 700 !important;
    letter-spacing: -0.01em !important;
    text-transform: none !important;
    color: var(--text-primary) !important;
    margin-bottom: 1.25rem !important;
    padding-bottom: 0 !important;
  }

  .form_grid_block__column:not(:last-child) {
    margin-bottom: 1rem !important;
  }

  /* Field labels: signature micro-labels above the control (§4). */
  .border-label {
    @include glass2-microlabel;

    background-color: transparent !important;
    top: -0.95rem !important;
  }

  .increase-z-index.border-label {
    color: var(--accent-400);
  }

  .form_inline_block .border-label,
  .form_sub_block .border-label {
    background-color: transparent !important;
  }

  .required-indicator.empty {
    width: 5px !important;
    height: 5px !important;
    background-color: var(--danger) !important;
    box-shadow: 0 0 6px var(--danger-tint-border) !important;
  }

  .disabled-indicator .material-icons {
    opacity: 0.6;
    font-size: 1rem;
    color: var(--text-muted);
  }

  .form_sub_block .nested-userview {
    border: none !important;
    border-radius: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }

  /* Preserved perf/scroll fixes (§6.4 end, legacy style.scss:2128–2153). */
  .view-form {
    animation: none !important;
  }

  .userview-wrapper,
  .view-container,
  .view-form {
    overflow: visible !important;
  }

  .form_sub_block .userview-wrapper,
  .first_level_grid_block .userview-wrapper {
    background-color: transparent !important;
  }
}

#app[data-theme-style='dark-glass'],
#app[data-theme-style='light-glass-cool'] {
  @include glass2-form;
}
```

- [ ] **Step 4: Lint and rebuild**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
yarn lint:style
./local_rebuild_and_publish.sh --only_ui
```

Expected: stylelint exit 0; build succeeds.

- [ ] **Step 5: Visual checkpoint — record form**

Open a record form (transaction-like form from the reference set) in `dark-glass` and (via the devtools attribute trick from Task 3) `light-glass-cool`:
- Section cards: radius 20, padding 28, frosted, subtle border, card shadow; caption 17px bold.
- Field labels: uppercase 11px micro-labels in muted color above controls.
- Inputs: inset dark/light wells, radius 12, 15px text; focus shows a teal border + soft ring; placeholder barely visible.
- Save button: gradient pill with teal glow, lifts on hover, presses with scale.
- Delete (outline-danger): red-tinted pill.
- Warm theme unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/styles/glass2.scss
git commit -m "style(glass2): buttons, inputs and form cards"
```

---

## Task 5: Table — flat rows, header, chips, footer, fixed columns

§6.4. Replaces the deleted "floating rows" system with flat 60px rows in the new themes. Background mechanics to respect (from the legacy comments in style.scss): every data `td` has a `.cell-alpha-blur` `::before` pseudo-element painted with `--cell-backgroundColor`; row-level vars cascade to `td`; DB `option_variant` chips set their colors on the inner `.option` element and must keep working. `--glass-fixed-bg` (solid fallback for sticky cells) is already defined per theme in the Task 2 token blocks.

**Files:**
- Modify: `src/styles/glass2.scss` (append at end)

- [ ] **Step 1: Append the table structure mixin**

```scss
/* ── Table: flat rows (§6.4) ── */
@mixin glass2-table {
  .root-wrapper {
    padding: 0.5rem;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
  }

  .table-wrapper {
    background-color: transparent !important;
  }

  .table-wrapper.root {
    border-color: var(--border-subtle);
    padding-left: 0;
    padding-right: 0;
  }

  .custom-table {
    background: transparent;
    border-collapse: separate !important;
    border-spacing: 0 !important;
  }

  /* Rows: flat, 60px, hairline separators, no vertical borders. */
  .custom-table tbody tr {
    background: transparent;
  }

  .custom-table tbody tr td {
    --backgroundColor: transparent;
    --cell-backgroundColor: transparent;
    --td-vertical-padding: 8px;

    height: var(--table-row-h);
    background: transparent !important;
    border: none !important;
    border-bottom: 1px solid var(--border-subtle) !important;
    color: var(--text-primary);
  }

  /* Hover: full-row highlight. */
  .custom-table tbody tr:hover td {
    background: var(--surface-hover) !important;
  }

  /* Selected rows / rows with the cursor cell: accent tint. */
  .custom-table tbody tr.selected td,
  .custom-table tbody tr.table-tr.selected td,
  .custom-table tbody tr:has(td.selected) td,
  .custom-table tbody tr:has(td.cursor) td {
    background: var(--accent-tint) !important;
    border-bottom-color: var(--accent-tint-border) !important;
  }

  /* Cursor cell: focus outline. */
  .custom-table tbody td.cursor {
    outline: 2px solid var(--border-focus);
    outline-offset: -2px;
  }

  /* Header: micro-label style, single subtle divider, sticky keeps blur. */
  .custom-table thead tr {
    border-bottom: none;
  }

  .custom-table th,
  .custom-table th.fixed-cell {
    --cell-backgroundColor: transparent;

    background: transparent !important;
    border: none !important;
    border-bottom: 1px solid var(--border-subtle) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .custom-table .table-th {
    @include glass2-microlabel;

    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
  }

  .custom-table .table-th .column-capture {
    text-transform: uppercase !important;
    letter-spacing: 0.09em !important;
  }

  /* Resize handle & drag affordance. */
  .custom-table .resize-column-thumb {
    width: 4px;
    background-color: var(--accent-tint);
  }

  .custom-table .resize-column-thumb .material-icons {
    color: var(--text-muted);
    font-size: 0.7rem;
  }

  .custom-table th .table-th .material-icons {
    color: var(--text-muted);
  }

  .custom-table th.column-drop-target {
    outline-color: var(--accent-tint-border);
  }

  /* Vertical dividers stay opt-in (show-vertical-borders). */
  .custom-table.show-vertical-borders tbody tr td + td {
    border-left: 1px solid var(--border-subtle) !important;
  }

  .custom-table.show-vertical-borders th {
    border-right: 1px solid var(--border-subtle) !important;
  }

  .custom-table.show-vertical-borders th:last-child {
    border-right: none !important;
  }

  /* Footer: micro-label counters. */
  .custom-table .table-footer-row .table-footer-cell {
    @include glass2-microlabel;

    border-top: 1px solid var(--border-subtle);
    border-bottom: none;
    background: var(--surface-card);
  }

  /* Row add / edit affordances: muted icon buttons. */
  .custom-table .add-entry-cell .material-button,
  .custom-table .select-row-cell .material-button {
    border: none;
    background: transparent;
    color: var(--text-muted);
  }
}

#app[data-theme-style='dark-glass'],
#app[data-theme-style='light-glass-cool'] {
  @include glass2-table;
}
```

- [ ] **Step 2: Append the sticky/fixed-columns + perf mixin**

Mirrors the legacy perf rules (style.scss:1716–1772, 2155–2178 pre-Task-1) with new tokens:

```scss
/* ── Table: fixed columns + scroll performance (§6.4) ── */
@mixin glass2-table-fixed {
  /* backdrop-filter on many tbody cells kills scroll performance. */
  .custom-table tbody td:not(.fixed-cell),
  .custom-table tbody td:not(.fixed-cell)::before {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  /* Sticky data cells: opaque fallback bg (blur cannot sample siblings). */
  .custom-table tbody td.fixed-cell.table-td,
  .custom-table tbody td.fixed-cell.table-td::before {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .custom-table tbody td.fixed-cell.table-td::before {
    background-color: var(--glass-fixed-bg) !important;
  }

  /* select-row-cell / add-entry-cell are sticky cells from TableRow.vue. */
  .custom-table tbody tr td.select-row-cell,
  .custom-table tbody tr td.add-entry-cell {
    background: transparent !important;
  }

  .custom-table tbody tr td.select-row-cell::before,
  .custom-table tbody tr td.add-entry-cell::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background-color: var(--glass-fixed-bg);
  }

  .custom-table tbody tr td.select-row-cell > *,
  .custom-table tbody tr td.add-entry-cell > * {
    position: relative;
    z-index: 1;
  }

  /* Static (non-sticky) layout: no opaque overlay needed. */
  .table-wrapper:not(.stick-fixed-columns) tbody td.fixed-cell.table-td::before,
  .table-wrapper:not(.stick-fixed-columns) tbody tr td.select-row-cell::before,
  .table-wrapper:not(.stick-fixed-columns) tbody tr td.add-entry-cell::before {
    background-color: transparent !important;
  }

  .custom-table.show-fixed-column-border .last-fixed-cell {
    border-right: 1px solid var(--border-default) !important;
  }
}

#app[data-theme-style='dark-glass'],
#app[data-theme-style='light-glass-cool'] {
  @include glass2-table-fixed;
}
```

- [ ] **Step 3: Append reference chips, mono cells and the option pill styles**

```scss
/* ── Table: reference chips, option pills, mono cells (§6.4) ── */
@mixin glass2-table-cells {
  /* Reference cells without explicit colors: pill chips. */
  .custom-table .option:not(.option-variant) {
    border: 1px solid var(--border-default);
    border-radius: 10px;
    background: var(--surface-inset);
  }

  .custom-table .option:not(.option-variant) .reference-text {
    color: var(--link);
    font-size: 13px;
  }

  /* Explicitly coloured option_variant chips keep their DB colors. */
  .custom-table .option.option-variant.option-local-variant {
    border-radius: 10px;
  }

  /* JetBrains Mono where cell type is targetable. TableCell.vue exposes only
     the date-time class for datetime cells; number/ID cells have no class, so
     they stay in Inter (accepted by §12 of the spec). */
  .custom-table .cell-text.date-time {
    @include glass2-mono;

    font-size: 13px;
  }

  .custom-table .table-footer-cell {
    @include glass2-mono;
  }
}

#app[data-theme-style='dark-glass'],
#app[data-theme-style='light-glass-cool'] {
  @include glass2-table-cells;
}
```

- [ ] **Step 4: Append the enum chip palette (per-theme colors, §3 functional tints)**

```scss
/* ── Enum chips (.chip) — shared structure ── */
@mixin glass2-chips {
  .chip {
    display: inline-block;
    padding: 3px 10px;
    border: 1px solid var(--border-default);
    border-radius: 999px;
    background: var(--surface-inset);
    color: var(--text-secondary);
    font-family: Inter, sans-serif;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
  }
}

#app[data-theme-style='dark-glass'],
#app[data-theme-style='light-glass-cool'] {
  @include glass2-chips;
}

/* Coloured chips — dark-glass */
#app[data-theme-style='dark-glass'] .chip.green  { background: rgba(52, 226, 138, 0.12);  color: #34e28a; border-color: rgba(52, 226, 138, 0.32); }
#app[data-theme-style='dark-glass'] .chip.teal   { background: rgba(45, 212, 191, 0.12);  color: #2dd4bf; border-color: rgba(45, 212, 191, 0.35); }
#app[data-theme-style='dark-glass'] .chip.blue   { background: rgba(79, 201, 232, 0.12);  color: #4fc9e8; border-color: rgba(79, 201, 232, 0.32); }
#app[data-theme-style='dark-glass'] .chip.indigo { background: rgba(129, 140, 248, 0.12); color: #818cf8; border-color: rgba(129, 140, 248, 0.32); }
#app[data-theme-style='dark-glass'] .chip.purple { background: rgba(177, 140, 255, 0.12); color: #b18cff; border-color: rgba(177, 140, 255, 0.32); }
#app[data-theme-style='dark-glass'] .chip.amber  { background: rgba(255, 186, 83, 0.12);  color: #ffba53; border-color: rgba(255, 186, 83, 0.32); }
#app[data-theme-style='dark-glass'] .chip.orange { background: rgba(251, 146, 60, 0.12);  color: #fb923c; border-color: rgba(251, 146, 60, 0.32); }
#app[data-theme-style='dark-glass'] .chip.rose   { background: rgba(255, 92, 107, 0.12);  color: #ff5c6b; border-color: rgba(255, 92, 107, 0.3); }
#app[data-theme-style='dark-glass'] .chip.sky    { background: rgba(56, 189, 248, 0.12);  color: #38bdf8; border-color: rgba(56, 189, 248, 0.32); }
#app[data-theme-style='dark-glass'] .chip.lime   { background: rgba(163, 230, 53, 0.12);  color: #a3e635; border-color: rgba(163, 230, 53, 0.32); }

/* Coloured chips — light-glass-cool */
#app[data-theme-style='light-glass-cool'] .chip.green  { background: rgba(15, 169, 104, 0.09); color: #0fa968; border-color: rgba(15, 169, 104, 0.3); }
#app[data-theme-style='light-glass-cool'] .chip.teal   { background: rgba(15, 168, 149, 0.1);  color: #0b8577; border-color: rgba(15, 168, 149, 0.32); }
#app[data-theme-style='light-glass-cool'] .chip.blue   { background: rgba(14, 127, 168, 0.1);  color: #0e7fa8; border-color: rgba(14, 127, 168, 0.3); }
#app[data-theme-style='light-glass-cool'] .chip.indigo { background: rgba(99, 102, 241, 0.1);  color: #4f46e5; border-color: rgba(99, 102, 241, 0.28); }
#app[data-theme-style='light-glass-cool'] .chip.purple { background: rgba(139, 92, 246, 0.1);  color: #8b5cf6; border-color: rgba(139, 92, 246, 0.28); }
#app[data-theme-style='light-glass-cool'] .chip.amber  { background: rgba(245, 158, 11, 0.12); color: #b45309; border-color: rgba(245, 158, 11, 0.3); }
#app[data-theme-style='light-glass-cool'] .chip.orange { background: rgba(249, 115, 22, 0.1);  color: #c2410c; border-color: rgba(249, 115, 22, 0.28); }
#app[data-theme-style='light-glass-cool'] .chip.rose   { background: rgba(226, 61, 80, 0.08);  color: #e23d50; border-color: rgba(226, 61, 80, 0.28); }
#app[data-theme-style='light-glass-cool'] .chip.sky    { background: rgba(14, 165, 233, 0.1);  color: #0369a1; border-color: rgba(14, 165, 233, 0.28); }
#app[data-theme-style='light-glass-cool'] .chip.lime   { background: rgba(132, 204, 22, 0.1);  color: #4d7c0f; border-color: rgba(132, 204, 22, 0.28); }
```

Note: if stylelint complains about single-line declaration blocks, run `npx prettier --write src/styles/glass2.scss` — the values matter, not the formatting.

- [ ] **Step 5: Lint and rebuild**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
yarn lint:style
./local_rebuild_and_publish.sh --only_ui
```

Expected: stylelint exit 0; build succeeds.

- [ ] **Step 6: Visual checkpoint — table report screen**

Open the daily-report-style table in `dark-glass` and `light-glass-cool` (devtools attribute trick):
- Flat 60px rows, hairline separators, no pill shapes, no vertical borders (unless the view opts into `show-vertical-borders`).
- Row hover: faint full-row highlight. Click a cell: row tinted teal, cursor cell outlined.
- Column headers: uppercase 11px muted micro-labels with a single divider; scroll down — sticky header stays readable (frosted).
- Reference cells: small link-colored pill chips; enum/money chips are tinted capsules.
- Footer cells: mono micro-label counters.
- Wide table with fixed columns: scroll horizontally — sticky columns show solid `--glass-fixed-bg`, no bleed-through; scroll vertically fast — no jank.
- Datetime cells render in JetBrains Mono.
- Compare with the mockup report screen. Warm theme: floating pill rows still intact.

- [ ] **Step 7: Commit**

```bash
git add src/styles/glass2.scss
git commit -m "style(glass2): flat table rows, chips and footer"
```

---

## Task 6: Dropdowns, poppers, modals, confirm dialogs, overlay, toasts

§6.6 + §6.7. Overlay components render outside `#app`, so this mixin is instantiated at the `html` level (the attribute is mirrored on `html`, `body` and `#app`, so html-level rules also cover in-app content — this consolidates the legacy split between `#app`- and `html`-scoped rules). Also retokenizes the finishWith toast variables in `style.scss` and reintroduces the subtle hover on menu items (the global no-hover rule from commits 304c3929/8edf37dc stays for old themes; we override it per-theme with higher specificity + `!important`).

**Files:**
- Modify: `src/styles/glass2.scss` (append at end)
- Modify: `src/styles/style.scss` (toast blocks near the end of the file)

- [ ] **Step 1: Append the overlays mixin to `src/styles/glass2.scss`**

```scss
/* ── Dropdowns, poppers, modals (§6.6) ── */
@mixin glass2-overlays {
  .popper {
    z-index: 100050;
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    background: var(--surface-card-2);
    box-shadow: var(--shadow-card);
    backdrop-filter: var(--glass-blur-strong);
    -webkit-backdrop-filter: var(--glass-blur-strong);
    color: var(--text-primary);
    animation: none !important;
  }

  .popper .list-group-item {
    border-radius: 10px;
    background: transparent !important;
    color: var(--text-primary) !important;
  }

  /* Approved: subtle hover returns on menu/dropdown items in the new themes.
     Overrides the global no-hover rule (style.scss .list-group-item-action). */
  .popper .list-group-item-action:hover,
  .popper .list-group-item-action:focus {
    background-color: var(--surface-hover) !important;
  }

  .vm--modal,
  .modal-content {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--surface-card-2);
    box-shadow: var(--shadow-card);
    backdrop-filter: var(--glass-blur-strong);
    -webkit-backdrop-filter: var(--glass-blur-strong);
    color: var(--text-primary);
  }

  .vm--modal {
    overflow: hidden;
  }

  .modal-content .modal-title,
  .modal-content .modal-body,
  .modal-content .modal-header,
  .modal-content .modal-footer {
    color: var(--text-primary);
  }

  .modal-content .close {
    color: var(--text-primary) !important;
    text-shadow: none;
    opacity: 0.7;
  }

  .modal-content .close:hover,
  .modal-content .close:focus {
    opacity: 1;
  }

  .vm--overlay {
    background: var(--overlay-bg) !important;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .tabbed-modal .header {
    flex-shrink: 0;
    border-top-left-radius: var(--radius-card);
    border-top-right-radius: var(--radius-card);
  }

  .tabbed-modal .header-panel {
    border: none !important;
    border-bottom: 1px solid var(--border-subtle) !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .tabbed-modal .content {
    overflow: visible !important;
  }

  .modal__tab_header.only_tab {
    background-color: var(--surface-card) !important;
    border-bottom: 1px solid var(--border-subtle);
  }

  /* Confirm dialog (§6.6). */
  .glass-confirm-dialog {
    max-width: min(560px, calc(100vw - 1.5rem));
  }

  .glass-confirm-content {
    border-radius: var(--radius-card);
    color: var(--text-primary);
  }

  .glass-confirm-content .modal-title,
  .glass-confirm-content .modal-body {
    color: var(--text-primary);
  }

  .glass-confirm-content .close {
    color: var(--text-primary);
    text-shadow: none;
    opacity: 0.8;
  }

  .glass-confirm-content .close:hover,
  .glass-confirm-content .close:focus {
    opacity: 1;
  }

  .glass-confirm-body {
    padding: 1.5rem 1.75rem 1.15rem;
    font-size: clamp(1.05rem, 0.92rem + 0.65vw, 1.35rem);
    font-weight: 600;
    line-height: 1.35;
    color: var(--text-primary);
  }

  .glass-confirm-footer {
    border-top: 1px solid var(--border-subtle);
    padding: 1rem 1.75rem 1.35rem;
    gap: 0.65rem;
  }

  .glass-confirm-footer .btn-outline-secondary {
    border-color: var(--border-default);
    background: transparent;
    color: var(--text-primary);
  }
}

html[data-theme-style='dark-glass'],
html[data-theme-style='light-glass-cool'] {
  @include glass2-overlays;
}
```

- [ ] **Step 2: Retokenize the dark-glass toast vars in `src/styles/style.scss`**

Find this block near the end of `style.scss` and replace it:

Old:
```scss
html[data-theme-style='dark-glass'] {
  --status-error: #f87171;
  --finish-toast-success-rgb: 79, 214, 190;
  --finish-toast-warning-rgb: 246, 185, 65;
  --finish-toast-error-rgb: 248, 113, 113;
}
```

New:
```scss
html[data-theme-style='dark-glass'] {
  --status-error: #ff5c6b;
  --finish-toast-success-rgb: 52, 226, 138;
  --finish-toast-warning-rgb: 255, 186, 83;
  --finish-toast-error-rgb: 255, 92, 107;
}

html[data-theme-style='light-glass-cool'] {
  --status-error: #e23d50;
  --finish-toast-success-rgb: 15, 169, 104;
  --finish-toast-warning-rgb: 196, 145, 20;
  --finish-toast-error-rgb: 226, 61, 80;
}
```

- [ ] **Step 3: Extend the shared toast structure block to light-glass-cool**

Immediately below, the shared liquid-glass toast block starts with this selector list — extend it:

Old:
```scss
html[data-theme-style='light-glass'],
html[data-theme-style='dark-glass'] {
```

New:
```scss
html[data-theme-style='light-glass'],
html[data-theme-style='dark-glass'],
html[data-theme-style='light-glass-cool'] {
```

(The block body keeps `color: var(--accent)` / `var(--accent-2)` — the compat aliases from Task 2 map those to the new palette for both new themes; the warm theme keeps its own values.)

- [ ] **Step 4: Lint and rebuild**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
yarn lint:style
./local_rebuild_and_publish.sh --only_ui
```

Expected: stylelint exit 0; build succeeds.

- [ ] **Step 5: Visual checkpoint — overlays**

In both new themes (devtools trick for `light-glass-cool`):
- Profile dropdown: strong-blur frosted panel radius 16, items highlight subtly on hover. In warm/`light`/`dark` themes hover still shows NO highlight.
- Open a record in a modal: frosted `--surface-card-2` panel radius 20, dark translucent blurred overlay, readable close button.
- Trigger a confirm dialog (e.g. delete a record and cancel): styled per §6.6, secondary button is a glass chip.
- Trigger a toast (e.g. save a record with a `finishWith` flow, or any error toast): success/warning/error tints match the new palette in dark-glass; light-glass-cool gets glass toasts too.
- Scrollbars: slim 8px rounded thumbs in both new themes.

- [ ] **Step 6: Commit**

```bash
git add src/styles/glass2.scss src/styles/style.scss
git commit -m "style(glass2): dropdowns, modals, overlay and toasts"
```

---

## Task 7: AppIcon component + vendored Lucide icons

§5. New `src/utils/lucideIcons.ts` (vendored inner-SVG markup + material→lucide map) and `src/components/AppIcon.vue` (Lucide in new themes for mapped names, Material ligature fallback otherwise), registered globally.

**All SVG data below was extracted verbatim from `lucide-static@1.23.0` (npm) — do not retype it by hand; copy from this plan.** If an icon must be added later, copy its inner markup from `https://unpkg.com/lucide-static/icons/<name>.svg` (strip the outer `<svg …>` tag).

**Verification note:** the repo has NO unit-test infrastructure (no jest/vitest), so this component is verified by `yarn lint` + the full build + the Task 8 visual checkpoint. TDD is not applicable here; this is stated explicitly per the plan requirements.

**Files:**
- Create: `src/utils/lucideIcons.ts`
- Create: `src/components/AppIcon.vue`
- Modify: `src/main.ts` (import ~line 17, registration ~line 221)

- [ ] **Step 1: Create `src/utils/lucideIcons.ts`**

```ts
// Vendored Lucide icon data (from lucide-static@1.23.0, https://lucide.dev,
// ISC license). Only the icons we actually use are vendored — no runtime
// dependency on the full icon set. Values are the inner markup of each
// icon's 24×24 stroke-based SVG.
//
// To add an icon: copy the inner elements from
// https://unpkg.com/lucide-static/icons/<name>.svg (strip the outer <svg> tag).

export const lucideInnerSvg: Record<string, string> = {
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'calendar':
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  'calendar-check':
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'chevrons-up-down': '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  'circle-alert':
    '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  'circle-help':
    '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  'circle-x':
    '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  'code-xml':
    '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
  'ellipsis-vertical':
    '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
  'grip-vertical':
    '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
  'house':
    '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  'list-filter': '<path d="M2 5h20"/><path d="M6 12h12"/><path d="M9 19h6"/>',
  'maximize':
    '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  'pencil':
    '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  'pencil-off':
    '<path d="m10 10-6.157 6.162a2 2 0 0 0-.5.833l-1.322 4.36a.5.5 0 0 0 .622.624l4.358-1.323a2 2 0 0 0 .83-.5L14 13.982"/><path d="m12.829 7.172 4.359-4.346a1 1 0 1 1 3.986 3.986l-4.353 4.353"/><path d="m15 5 4 4"/><path d="m2 2 20 20"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'qr-code':
    '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
  'rotate-ccw':
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  'save':
    '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  'search': '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  'search-x':
    '<path d="m13.5 8.5-5 5"/><path d="m8.5 8.5 5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'square-arrow-out-up-right':
    '<path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><path d="m21 3-9 9"/><path d="M15 3h6v6"/>',
  'trash-2':
    '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'user':
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'users':
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
}

// Material Icons (ligature names, as used in templates and DB data) →
// Lucide icon names. Covers every name used in the codebase plus common
// DB-provided names (§5 of the spec).
export const materialToLucide: Record<string, string> = {
  add: 'plus',
  arrow_back: 'arrow-left',
  arrow_forward_ios: 'chevron-right',
  arrow_left: 'chevron-left',
  arrow_right: 'chevron-right',
  calendar_today: 'calendar',
  check: 'check',
  chevron_right: 'chevron-right',
  clear: 'x',
  close: 'x',
  delete: 'trash-2',
  developer_mode: 'code-xml',
  done: 'check',
  drag_indicator: 'grip-vertical',
  edit: 'pencil',
  edit_off: 'pencil-off',
  error_outline: 'circle-alert',
  event: 'calendar',
  expand_less: 'chevron-up',
  expand_more: 'chevron-down',
  filter_list: 'list-filter',
  fullscreen: 'maximize',
  group: 'users',
  help_outline: 'circle-help',
  highlight_off: 'circle-x',
  home: 'house',
  more_vert: 'ellipsis-vertical',
  open_in_new: 'square-arrow-out-up-right',
  person: 'user',
  qr_code_2: 'qr-code',
  restart_alt: 'rotate-ccw',
  save: 'save',
  search: 'search',
  search_off: 'search-x',
  today: 'calendar-check',
  unfold_more: 'chevrons-up-down',
}

// Returns a complete inline-SVG string for a material icon name, or null
// when the name is not mapped (caller falls back to the ligature font).
export const lucideMarkupForMaterialName = (name: string): string | null => {
  const lucideName = materialToLucide[name.trim()]
  if (lucideName === undefined) return null
  const inner = lucideInnerSvg[lucideName]
  if (inner === undefined) return null
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +
    inner +
    '</svg>'
  )
}
```

- [ ] **Step 2: Create `src/components/AppIcon.vue`**

Design notes: the wrapper KEEPS the `material-icons` class in both branches so all existing size/color CSS (`.md-14`, `.md-18`, `.md-36`, per-component `.material-icons` selectors, glass2 rules) keeps applying; when the Lucide SVG is rendered, there is no text content, so the ligature font has nothing to draw. `v-on="$listeners"` forwards `@click` etc. without `.native`. Class/attrs from the call site merge onto the root span automatically (Vue 2 behavior).

```vue
<template>
  <span
    v-if="lucideMarkup"
    class="material-icons app-icon-lucide"
    aria-hidden="true"
    v-on="$listeners"
    v-html="lucideMarkup"
  />
  <span v-else class="material-icons" v-on="$listeners">{{ name }}</span>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { namespace } from 'vuex-class'

import type { IThemeRef } from '@/utils_colors'
import { lucideMarkupForMaterialName } from '@/utils/lucideIcons'

const settings = namespace('settings')

// Icon wrapper: takes a Material Icons ligature name. In the Glass 2.0
// themes mapped names render as inline Lucide SVGs; unmapped names and all
// other themes fall back to the Material ligature span, so DB-provided
// names degrade gracefully (§5).
@Component
export default class AppIcon extends Vue {
  @Prop({ type: String, required: true }) name!: string

  @settings.State('currentThemeRef') currentThemeRef!: IThemeRef | null

  private get isGlass2Theme(): boolean {
    const themeName = this.currentThemeRef?.name
    return themeName === 'dark-glass' || themeName === 'light-glass-cool'
  }

  get lucideMarkup(): string | null {
    if (!this.isGlass2Theme) return null
    return lucideMarkupForMaterialName(this.name)
  }
}
</script>

<style lang="scss" scoped>
.app-icon-lucide {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  ::v-deep svg {
    display: block;
    width: 1em;
    height: 1em;
  }
}
</style>
```

- [ ] **Step 3: Register globally in `src/main.ts`**

Add the import next to the other component imports (after line 17, `import FormControl from '@/components/FormControl.vue'`):

```ts
import AppIcon from '@/components/AppIcon.vue'
```

Add the registration after `Vue.component('OzmaLink', OzmaLink)` (~line 221):

```ts
Vue.component('AppIcon', AppIcon)
```

- [ ] **Step 4: Lint (includes TS checking of the new files via eslint parser)**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
yarn lint
```

Expected: `DONE No lint errors found!` (eslint may auto-fix formatting — re-stage if it does).

- [ ] **Step 5: Commit**

```bash
git add src/utils/lucideIcons.ts src/components/AppIcon.vue src/main.ts
git commit -m "feat(icons): add AppIcon with vendored lucide icons"
```

---

## Task 8: Replace direct material-icons usages with AppIcon

Every direct `<span|i|input class="material-icons">` in component templates switches to `<AppIcon>` (globally registered — no per-file imports). Keep ALL other classes from the original element on the AppIcon (they merge onto its root span); drop only the `material-icons` class itself (AppIcon adds it back internally). Event handlers move over unchanged (AppIcon forwards listeners). Elements whose content is an emoji keep a non-AppIcon branch.

CSS note: component-scoped selectors like `.material-icons { font-size: 2rem }` keep working because AppIcon's root span retains the `material-icons` class, and the inner SVG is sized `1em`.

**Files (all modify):** `src/components/TopLevelUserView.vue`, `src/components/SearchPanel.vue`, `src/components/Calendar.vue`, `src/components/calendar/DatePicker.vue`, `src/components/modal/TabbedModal.vue`, `src/components/Avatar.vue`, `src/components/AlertBanner.vue`, `src/components/form/InputSlot.vue`, `src/components/ReadonlyDemoInstanceModal.vue`, `src/components/InviteUserModal.vue`, `src/components/ReferenceMultiSelect.vue`, `src/components/multiselect/MultiSelect.vue`, `src/components/buttons/ButtonContent.vue`, `src/components/kanban/Column.vue`, `src/components/views/board/RowCard.vue`, `src/components/views/Table.vue`, `src/components/views/table/TableCell.vue`, `src/components/views/table/TableRow.vue`, `src/components/views/menu/MenuEntry.vue`

- [ ] **Step 1: TopLevelUserView.vue (4 replacements)**

| Old | New |
|---|---|
| `<span class="material-icons md-36"> restart_alt </span>` | `<AppIcon class="md-36" name="restart_alt" />` |
| `<span class="material-icons md-36"> help_outline </span>` | `<AppIcon class="md-36" name="help_outline" />` |
| `<span class="material-icons md-36"> save </span>` | `<AppIcon class="md-36" name="save" />` |
| `<span class="material-icons md-36">developer_mode</span>` | `<AppIcon class="md-36" name="developer_mode" />` |

- [ ] **Step 2: SearchPanel.vue (3), Calendar.vue (3), DatePicker.vue (2)**

SearchPanel.vue:
| Old | New |
|---|---|
| `<i class="material-icons">clear</i>` | `<AppIcon name="clear" />` |
| `<i class="material-icons">search_off</i>` | `<AppIcon name="search_off" />` |
| `<span class="icon material-icons">search</span>` | `<AppIcon class="icon" name="search" />` |

Calendar.vue:
| Old | New |
|---|---|
| `<i class="material-icons">event</i>` | `<AppIcon name="event" />` |
| `<span class="material-icons md-18 mr-1">clear</span>` | `<AppIcon class="md-18 mr-1" name="clear" />` |
| `<span class="material-icons md-18 mr-1">today</span>` | `<AppIcon class="md-18 mr-1" name="today" />` |

DatePicker.vue (listeners forward automatically; keep the click handlers):
```vue
<AppIcon
  class="material-button md-18 month-arrow"
  name="arrow_left"
  @click="changeDate(-1)"
/>
```
and
```vue
<AppIcon
  class="material-button md-18 month-arrow"
  name="arrow_right"
  @click="changeDate(1)"
/>
```

- [ ] **Step 3: TabbedModal.vue (2), Avatar.vue (1), AlertBanner.vue (1), InputSlot.vue (1)**

TabbedModal.vue — both `<span class="material-icons">close</span>` → `<AppIcon name="close" />`.

Avatar.vue — `<span v-else class="material-icons"> person </span>` → `<AppIcon v-else name="person" />`.

AlertBanner.vue — `<i class="material-icons">close</i>` → `<AppIcon name="close" />`.

InputSlot.vue — `<span class="material-icons">edit_off</span>` → `<AppIcon name="edit_off" />` (the glass2 `.disabled-indicator .material-icons` rule still matches AppIcon's root span).

- [ ] **Step 4: ReadonlyDemoInstanceModal.vue (2), InviteUserModal.vue (1)**

| Old | New |
|---|---|
| `<i class="material-icons">close</i>` | `<AppIcon name="close" />` |
| `<i class="material-icons demo-icon">error_outline</i>` | `<AppIcon class="demo-icon" name="error_outline" />` |
| `<i class="material-icons invite-icon">group</i>` | `<AppIcon class="invite-icon" name="group" />` |

- [ ] **Step 5: ReferenceMultiSelect.vue (3)**

| Old | New |
|---|---|
| `<i class="material-icons rounded-circle md-14 open-modal-button">`<br>`  {{ iconValue(select.option.value.link.target) }}`<br>`</i>` | `<AppIcon`<br>`  class="rounded-circle md-14 open-modal-button"`<br>`  :name="iconValue(select.option.value.link.target)"`<br>`/>` |
| `<i class="material-icons md-18"> add </i>` | `<AppIcon class="md-18" name="add" />` |
| `<i class="material-icons qr_code" @click="openQRCodeScanner()">`<br>`  qr_code_2`<br>`</i>` | `<AppIcon class="qr_code" name="qr_code_2" @click="openQRCodeScanner()" />` |

- [ ] **Step 6: MultiSelect.vue (4)**

Replace the `<input type="button">` ligature hack with a real button (same handler, same surrounding classes):

Old:
```vue
<input
  v-if="showUnselectOption && !compactMode"
  type="button"
  class="material-icons md-14 material-button remove-value rounded-circle"
  value="close"
  @click.stop="unselectOption(index)"
/>
```
New:
```vue
<button
  v-if="showUnselectOption && !compactMode"
  type="button"
  class="material-button remove-value rounded-circle"
  @click.stop="unselectOption(index)"
>
  <AppIcon class="md-14" name="close" />
</button>
```

| Old | New |
|---|---|
| `<i class="material-icons">close</i>` | `<AppIcon name="close" />` |
| `<i class="material-icons">`<br>`  {{ showPopup ? 'expand_less' : 'expand_more' }}`<br>`</i>` | `<AppIcon :name="showPopup ? 'expand_less' : 'expand_more'" />` |
| `<i class="material-icons"> highlight_off </i>` | `<AppIcon name="highlight_off" />` |
| `<span class="material-icons md-14 remove-value">close</span>` | `<AppIcon class="md-14 remove-value" name="close" />` |

- [ ] **Step 7: ButtonContent.vue (3 — keep the emoji branch)**

Old:
```vue
<span
  v-if="button.icon"
  :class="['icon', iconType === 'emoji' ? 'emoji-icon' : 'material-icons']"
  >{{ button.icon }}</span
>
<span
  v-else-if="listItem && phantomIcon"
  v-visible="false"
  class="material-icons"
  >arrow_right</span
>
```
New:
```vue
<span v-if="button.icon && iconType === 'emoji'" class="icon emoji-icon">{{
  button.icon
}}</span>
<AppIcon v-else-if="button.icon" class="icon" :name="button.icon" />
<AppIcon
  v-else-if="listItem && phantomIcon"
  v-visible="false"
  name="arrow_right"
/>
```

And the dropdown arrow:
| Old | New |
|---|---|
| `<span`<br>`  v-if="button.caption && button.type == 'button-group'"`<br>`  class="material-icons ml-auto dropdown-icon"`<br>`  >arrow_right</span`<br>`>` | `<AppIcon`<br>`  v-if="button.caption && button.type == 'button-group'"`<br>`  class="ml-auto dropdown-icon"`<br>`  name="arrow_right"`<br>`/>` |

- [ ] **Step 8: kanban/Column.vue (1), views/board/RowCard.vue (1 — emoji branch)**

Column.vue:
```vue
<AppIcon
  v-if="createButton"
  class="material-button add-button"
  name="add"
  @click="$emit('create')"
/>
```

RowCard.vue — old:
```vue
<span
  v-if="col.icon && col.textHtml"
  :class="[
    'card-icon',
    { 'material-icons md-18': getIconType(col.icon) === 'material' },
  ]"
>
  {{ col.icon }}
</span>
```
New:
```vue
<AppIcon
  v-if="col.icon && col.textHtml && getIconType(col.icon) === 'material'"
  class="card-icon md-18"
  :name="col.icon"
/>
<span v-else-if="col.icon && col.textHtml" class="card-icon">
  {{ col.icon }}
</span>
```

- [ ] **Step 9: Table.vue (3), TableCell.vue (2), TableRow.vue (1), MenuEntry.vue (1 — emoji branch)**

Table.vue:
| Old | New |
|---|---|
| `<i class="material-icons sorting-icon">{{`<br>`  uv.extra.sortAsc ? 'expand_more' : 'expand_less'`<br>`}}</i>` | `<AppIcon`<br>`  class="sorting-icon"`<br>`  :name="uv.extra.sortAsc ? 'expand_more' : 'expand_less'"`<br>`/>` |
| `<i class="material-icons">drag_indicator</i>` | `<AppIcon name="drag_indicator" />` |
| `<span class="material-icons">close</span>` (sum popup close) | `<AppIcon name="close" />` |

TableCell.vue:
| Old | New |
|---|---|
| `<span`<br>`  class="material-icons md-14 reference-open-modal rounded-circle"`<br>`>`<br>`  open_in_new`<br>`</span>` | `<AppIcon`<br>`  class="md-14 reference-open-modal rounded-circle"`<br>`  name="open_in_new"`<br>`/>` |
| `<span class="material-icons">arrow_forward_ios</span>` | `<AppIcon name="arrow_forward_ios" />` |

TableRow.vue:
| Old | New |
|---|---|
| `<i class="material-icons edit-in-modal-icon">edit</i>` | `<AppIcon class="edit-in-modal-icon" name="edit" />` |

MenuEntry.vue — old:
```vue
<i
  :class="[
    'material-icons',
    'icon',
    {
      'no-icon': !entry.icon,
      'emoji-icon': getIconType(entry.icon) === 'emoji',
    },
  ]"
>
  {{ entry.icon || 'chevron_right' }}
</i>
```
New:
```vue
<i
  v-if="getIconType(entry.icon) === 'emoji'"
  class="material-icons icon emoji-icon"
>
  {{ entry.icon }}
</i>
<AppIcon
  v-else
  class="icon"
  :class="{ 'no-icon': !entry.icon }"
  :name="entry.icon || 'chevron_right'"
/>
```

- [ ] **Step 10: Verify no direct template usages remain, lint, rebuild**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
grep -rn 'class="[^"]*material-icons' src/components --include="*.vue" | grep -v AppIcon.vue
yarn lint
./local_rebuild_and_publish.sh --only_ui
```

Expected: the grep prints exactly ONE template hit — the intentional emoji branch in `MenuEntry.vue` (`class="material-icons icon emoji-icon"`, renders emoji text, never a glyph name). All other `material-icons` mentions live inside `<style>` blocks or `AppIcon.vue` itself. Lint passes; build succeeds.

- [ ] **Step 11: Visual checkpoint — icons**

- In `dark-glass`: icons across header, search, calendar, table (sort arrows, drag handles, edit pencils, reference open-in-new), multiselects, modals' close buttons are stroke-style Lucide glyphs.
- In warm `light-glass` / `light` / `dark`: the SAME spots still show Material ligature icons (AppIcon fallback) — this is the key regression check.
- Menu entries with emoji icons still show emoji in all themes.
- DB-defined button icons (ButtonsPanel buttons with `icon` from DB): mapped names show Lucide in new themes, unmapped names show the Material glyph — no broken text names anywhere.

- [ ] **Step 12: Commit**

```bash
git add -A src/components src/main.ts
git commit -m "refactor(icons): use AppIcon for material icon usages"
```

---

## Task 9: Monaco editor themes

§6.8. In `src/components/editors/CodeEditor.vue`: add `ozma-light-glass-cool`, retokenize `ozma-dark-glass` to the new palette (bg `#081217`, keywords cyan `#4FC9E8`, strings mint `#6EF0D2`, accent teal), extend the theme routing and the scoped `::v-deep` semantic token colors. `ozma-light-glass` stays untouched.

**Files:**
- Modify: `src/components/editors/CodeEditor.vue` (~lines 322–350 area for the new theme, 431–507 dark-glass def, 553–558 getter, 686–695 class list, after ~1092 the `::v-deep` colors)

- [ ] **Step 1: Add the `ozma-light-glass-cool` theme definition**

Insert directly after the closing `})` of the `monaco.editor.defineTheme('ozma-light-glass', …)` call (~line 350):

```ts
monaco.editor.defineTheme('ozma-light-glass-cool', {
  base: 'vs',
  inherit: true,
  rules: tokenRules(
    '0b8577', // keyword (teal)
    '0fa968', // string (green)
    '0e7fa8', // number (cyan)
    '74898f', // comment
    '8b5cf6', // type (purple)
    '40585f', // operator
    '0e7fa8', // @attr / .@attr
    'c2410c', // $arg / $$arg
    '0b1b1e', // identifiers
  ),
  colors: {
    'editor.background': '#f6fbfa',
    'editor.foreground': '#0b1b1e',
    'editorLineNumber.foreground': '#74898f',
    'editorLineNumber.activeForeground': '#40585f',
    'editor.selectionBackground': '#14b8a633',
    'editor.inactiveSelectionBackground': '#14b8a61f',
    'editor.lineHighlightBackground': '#0a232808',
    'editorCursor.foreground': '#0b8577',
    'editor.findMatchBackground': '#14b8a64d',
    'editor.findMatchHighlightBackground': '#14b8a626',
    'editorIndentGuide.background1': '#0a232812',
    'editorIndentGuide.activeBackground1': '#0a232830',
  },
})
```

- [ ] **Step 2: Retokenize `ozma-dark-glass`**

Replace the entire `('ozma-dark-glass', { … })` definition body (currently `semanticTokenColors` in the `#f6b941`/`#59d6cf` family, `rules` with `C9A0FF` keywords, `colors` with `#0b1623` background) with:

```ts
;(monaco.editor.defineTheme as any)('ozma-dark-glass', {
  base: 'vs-dark',
  inherit: true,
  semanticHighlighting: true,
  semanticTokenColors: {
    'variable': '#8cd8f0',
    'variable.readonly': '#8cf0e3',
    'variable.defaultLibrary': '#8cd8f0',
    'parameter': '#a3b8be',
    'function': '#45e3cf',
    'function.defaultLibrary': '#4fc9e8',
    'method': '#45e3cf',
    'method.defaultLibrary': '#4fc9e8',
    'class': '#4fc9e8',
    'class.defaultLibrary': '#4fc9e8',
    'interface': '#4fc9e8',
    'type': '#4fc9e8',
    'typeParameter': '#4fc9e8',
    'namespace': '#a3b8be',
    'property': '#8cf0e3',
    'enumMember': '#8cf0e3',
    'event': '#8cf0e3',
    'macro': '#2dd4bf',
    'label': '#a3b8be',
    'property.declaration': '#2dd4bf',
  },
  rules: [
    { token: 'keyword', foreground: '4FC9E8', fontStyle: 'bold' },
    { token: 'keyword.sql', foreground: '4FC9E8', fontStyle: 'bold' },
    { token: 'string', foreground: '6EF0D2' },
    { token: 'string.sql', foreground: '6EF0D2' },
    { token: 'number', foreground: 'FFBA53' },
    { token: 'number.sql', foreground: 'FFBA53' },
    { token: 'comment', foreground: '64808A', fontStyle: 'italic' },
    { token: 'comment.sql', foreground: '64808A', fontStyle: 'italic' },
    { token: 'type', foreground: '2DD4BF' },
    { token: 'predefined', foreground: '2DD4BF' },
    { token: 'operator', foreground: 'A3B8BE' },
    { token: 'operator.sql', foreground: 'A3B8BE' },
    { token: 'identifier', foreground: 'F1F7F7' },
    { token: 'identifier.quote', foreground: 'F1F7F7' },
    { token: 'identifier.quote.sql', foreground: 'F1F7F7' },
    { token: 'attribute', foreground: 'FFBA53' },
    { token: 'attribute.sql', foreground: 'FFBA53' },
    { token: 'variable', foreground: 'B18CFF' },
    { token: 'constant', foreground: '8CF0E3' },
    { token: 'string.escape', foreground: '8CF0E3' },
    { token: 'string.escape.sql', foreground: '8CF0E3' },
    { token: 'number.float', foreground: 'FFBA53' },
    { token: 'number.hex', foreground: 'FFBA53' },
    { token: 'comment.block', foreground: '64808A', fontStyle: 'italic' },
    { token: 'comment.block.sql', foreground: '64808A', fontStyle: 'italic' },
    { token: 'delimiter', foreground: 'A3B8BE80' },
    { token: 'delimiter.sql', foreground: 'A3B8BE80' },
    { token: 'delimiter.parenthesis', foreground: 'A3B8BECC' },
    { token: 'delimiter.parenthesis.sql', foreground: 'A3B8BECC' },
    { token: 'key.json', foreground: '2DD4BF' },
    { token: 'string.value.json', foreground: '6EF0D2' },
    { token: 'number.json', foreground: 'FFBA53' },
    { token: 'keyword.json', foreground: '8CF0E3' },
  ],
  colors: {
    'editor.background': '#081217',
    'editor.foreground': '#f1f7f7',
    'editorLineNumber.foreground': '#64808a99',
    'editorLineNumber.activeForeground': '#a3b8be',
    'editor.selectionBackground': '#2dd4bf3d',
    'editor.inactiveSelectionBackground': '#2dd4bf26',
    'editor.lineHighlightBackground': '#0e1920cc',
    'editorCursor.foreground': '#35d3c0',
    'editor.findMatchBackground': '#ffba5370',
    'editor.findMatchHighlightBackground': '#ffba5342',
    'editorIndentGuide.background1': '#a3b8be1a',
    'editorIndentGuide.activeBackground1': '#a3b8be38',
  },
})
```

- [ ] **Step 3: Extend the theme routing getter**

In `monacoTheme` (~line 552), the current code is:

```ts
    if (themeStyleName === 'light-glass') return 'ozma-light-glass'
    if (themeStyleName === 'dark-glass') return 'ozma-dark-glass'
```

Replace with (note: `light-glass-cool` does NOT match the existing `endsWith('-glass')` heuristic, so the explicit line is required):

```ts
    if (themeStyleName === 'light-glass') return 'ozma-light-glass'
    if (themeStyleName === 'light-glass-cool') return 'ozma-light-glass-cool'
    if (themeStyleName === 'dark-glass') return 'ozma-dark-glass'
```

- [ ] **Step 4: Extend the theme class list in `applyTokenThemeClass`**

Old (~line 686):
```ts
    for (const themeName of [
      'ozma-light',
      'ozma-light-glass',
      'ozma-dark',
      'ozma-dark-glass',
    ]) {
```
New:
```ts
    for (const themeName of [
      'ozma-light',
      'ozma-light-glass',
      'ozma-light-glass-cool',
      'ozma-dark',
      'ozma-dark-glass',
    ]) {
```

- [ ] **Step 5: Update the dark-glass `::v-deep` semantic token colors and add the cool block**

In the `<style>` section, replace the values in the `.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-*` rules (currently `#e0d69a`/`#c9a0ff`/`#59d6cf`/`#f6b941`/`#ff6fae`/`#5fc7bc`/`#9adca3`/`#e39b2e` family) so the whole group becomes:

```scss
.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-identifier {
  color: #f1f7f7 !important;
}
.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-keyword {
  color: #4fc9e8 !important;
  font-weight: 600;
}
.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-type {
  color: #2dd4bf !important;
}
.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-attribute {
  color: #ffba53 !important;
}
.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-variable {
  color: #b18cff !important;
}
.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-property {
  color: #8cf0e3 !important;
}
.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-function {
  color: #45e3cf !important;
  font-weight: 600;
}
.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-number {
  color: #ffba53 !important;
}
.code-editor.ozma-theme-ozma-dark-glass
  ::v-deep
  .ozma-token-relation-target {
  color: #f1f7f7 !important;
}
.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-namespace {
  color: #4fc9e8 !important;
  font-weight: 600;
}
.code-editor.ozma-theme-ozma-dark-glass ::v-deep .ozma-token-dotted-tail {
  color: #f1f7f7 !important;
}
```

Then append a new block after it (do NOT touch the `ozma-theme-ozma-light-glass` block — frozen warm theme):

```scss
.code-editor.ozma-theme-ozma-light-glass-cool ::v-deep .ozma-token-identifier {
  color: #0b1b1e !important;
}
.code-editor.ozma-theme-ozma-light-glass-cool ::v-deep .ozma-token-keyword {
  color: #0b8577 !important;
  font-weight: 600;
}
.code-editor.ozma-theme-ozma-light-glass-cool ::v-deep .ozma-token-type {
  color: #8b5cf6 !important;
}
.code-editor.ozma-theme-ozma-light-glass-cool ::v-deep .ozma-token-attribute {
  color: #0e7fa8 !important;
}
.code-editor.ozma-theme-ozma-light-glass-cool ::v-deep .ozma-token-variable {
  color: #c2410c !important;
}
.code-editor.ozma-theme-ozma-light-glass-cool ::v-deep .ozma-token-property {
  color: #0e8f96 !important;
}
.code-editor.ozma-theme-ozma-light-glass-cool ::v-deep .ozma-token-function {
  color: #0b8577 !important;
  font-weight: 600;
}
.code-editor.ozma-theme-ozma-light-glass-cool ::v-deep .ozma-token-number {
  color: #b45309 !important;
}
.code-editor.ozma-theme-ozma-light-glass-cool
  ::v-deep
  .ozma-token-relation-target {
  color: #0b1b1e !important;
}
.code-editor.ozma-theme-ozma-light-glass-cool ::v-deep .ozma-token-namespace {
  color: #8b5cf6 !important;
  font-weight: 600;
}
.code-editor.ozma-theme-ozma-light-glass-cool ::v-deep .ozma-token-dotted-tail {
  color: #0b1b1e !important;
}
```

- [ ] **Step 6: Lint and commit**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
yarn lint
git add src/components/editors/CodeEditor.vue
git commit -m "feat(editor): monaco themes for glass 2.0"
```

Expected: `DONE No lint errors found!` (visual check happens in the Task 10 checkpoint, once the theme exists in the DB).

---

## Task 10: Theme registration — utils_colors fallback + deploy.sh seeding

§2.3 + §10. `funapp.color_themes` columns (verified in `ozmadb/preload.json`): `schema_id` (ref `public.schemas`), `name` (string), `localized_name` (json). `funapp.color_variants`: `name`, `theme_id`, `foreground`, `background`, `border`, `font_weight`, `font_style`, `text_decoration`. Both stages use direct psql like the existing stages 7/8 (`docker exec ozma-postgres-1 psql`), idempotent via NOT EXISTS.

**Files:**
- Modify: `src/utils_colors.ts` (~lines 466–474)
- Modify: `deploy.sh` (insert after `stage_seed_field_attributes` call at line 530, before `stage_clear_settings`)

- [ ] **Step 1: Add light-glass-cool to the frontend fallback chain**

In `src/utils_colors.ts`, old:
```ts
  // Keep light as the default for users without an explicit preference.
  return (
    tryFindTheme('light') ??
    tryFindTheme('light-glass') ??
    tryFindTheme('dark') ??
    tryFindTheme('dark-glass') ??
    null
  )
```
New:
```ts
  // Keep light as the default for users without an explicit preference.
  return (
    tryFindTheme('light') ??
    tryFindTheme('light-glass') ??
    tryFindTheme('light-glass-cool') ??
    tryFindTheme('dark') ??
    tryFindTheme('dark-glass') ??
    null
  )
```

- [ ] **Step 2: Add the seeding stage to `deploy.sh`**

Insert between the `stage_seed_field_attributes` invocation and the `stage_clear_settings` definition:

```bash
stage_seed_glass_cool_theme() {
  info "\n==> Stage 7b: Seed light-glass-cool theme"

  run_script_on_server << 'REMOTE_SCRIPT'
    set -euo pipefail
    docker exec ozma-postgres-1 psql -U postgres -d ozmadb << 'SQL'
      INSERT INTO funapp.color_themes (schema_id, name, localized_name)
      SELECT schema_id, 'light-glass-cool',
             '{"ru": "Светлая стеклянная (холодная)", "en": "Light glass (cool)"}'
      FROM funapp.color_themes
      WHERE name = 'light-glass'
        AND NOT EXISTS (
          SELECT 1 FROM funapp.color_themes WHERE name = 'light-glass-cool'
        )
      LIMIT 1;

      INSERT INTO funapp.color_variants
        (name, theme_id, foreground, background, border,
         font_weight, font_style, text_decoration)
      SELECT v.name, t_new.id, v.foreground, v.background, v.border,
             v.font_weight, v.font_style, v.text_decoration
      FROM funapp.color_variants v
      JOIN funapp.color_themes t_old
        ON v.theme_id = t_old.id AND t_old.name = 'light-glass'
      JOIN funapp.color_themes t_new
        ON t_new.name = 'light-glass-cool'
      WHERE NOT EXISTS (
        SELECT 1 FROM funapp.color_variants x WHERE x.theme_id = t_new.id
      );
SQL
REMOTE_SCRIPT

  ok "light-glass-cool theme seeded"
}

stage_seed_glass_cool_theme
```

- [ ] **Step 3: Verify shell syntax and lint**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
bash -n deploy.sh && echo "syntax ok"
yarn lint
```

Expected: `syntax ok`; lint passes.

- [ ] **Step 4: Seed the LOCAL instance and rebuild**

The local dev instance uses the same postgres container, so run the stage's SQL directly (this is the "local script path" from §10.3 — one-off, idempotent):

```bash
docker exec ozma-postgres-1 psql -U postgres -d ozmadb << 'SQL'
INSERT INTO funapp.color_themes (schema_id, name, localized_name)
SELECT schema_id, 'light-glass-cool',
       '{"ru": "Светлая стеклянная (холодная)", "en": "Light glass (cool)"}'
FROM funapp.color_themes
WHERE name = 'light-glass'
  AND NOT EXISTS (
    SELECT 1 FROM funapp.color_themes WHERE name = 'light-glass-cool'
  )
LIMIT 1;

INSERT INTO funapp.color_variants
  (name, theme_id, foreground, background, border,
   font_weight, font_style, text_decoration)
SELECT v.name, t_new.id, v.foreground, v.background, v.border,
       v.font_weight, v.font_style, v.text_decoration
FROM funapp.color_variants v
JOIN funapp.color_themes t_old
  ON v.theme_id = t_old.id AND t_old.name = 'light-glass'
JOIN funapp.color_themes t_new
  ON t_new.name = 'light-glass-cool'
WHERE NOT EXISTS (
  SELECT 1 FROM funapp.color_variants x WHERE x.theme_id = t_new.id
);
SQL
docker exec ozma-postgres-1 psql -U postgres -d ozmadb -c \
  "SELECT name FROM funapp.color_themes ORDER BY name;"
```

Expected: the second command lists `light-glass-cool` among the themes. (If the docker container is not running, start the local stack first — see `restore-ozma-local.sh` / `docker-compose.yml`.) Then:

```bash
./local_rebuild_and_publish.sh --only_ui
```

- [ ] **Step 5: Visual checkpoint — theme switcher end-to-end**

- Reload `http://localhost:9080` (hard reload to refresh cached themes). The profile menu now lists «Светлая стеклянная (холодная)».
- Switch to it FOR REAL (no devtools trick): full cool-light look everywhere, persists across reload (localStorage `preferredTheme`), no light-theme flash on reload (pre-first-paint script behavior, commit 8de3f137).
- Open the Monaco editor (development mode → any view source): `ozma-light-glass-cool` colors on the cool theme; switch to dark-glass — new `#081217`-family palette.

- [ ] **Step 6: Commit**

```bash
git add src/utils_colors.ts deploy.sh
git commit -m "feat(themes): register light-glass-cool fallback and deploy seeding"
```

---

## Task 11: Final verification pass (spec §11)

No new code — a structured acceptance pass. Fix-ups discovered here get their own small commits (`style(glass2): polish <area> after verification`).

**Files:** none (verification only)

- [ ] **Step 1: Serve the mockup for side-by-side comparison**

```bash
python3 -m http.server 8899 --directory "/Users/vientooscuro/Downloads/Новый дизайн экранов" &
```

Open `http://localhost:8899` in a second window.

- [ ] **Step 2: Reference screens × both new themes (§11.2)**

For each of the 4 reference screens — main menu, daily-report table, transaction form, schema workspace (Monaco) — in BOTH `dark-glass` and `light-glass-cool`:
- Compare layout tokens against the mockup: card radii (20/24), paddings (28), row height (60px), micro-labels, gradient primary buttons, chip tints, header typography.
- Interactions: hover lift on buttons, press scale, focus rings on inputs, row hover, dropdown item hover.

- [ ] **Step 3: Warm theme regression (§11.3)**

Repeat the Task 1 screenshot comparison on the FINAL build: warm `light-glass` main menu / table / form / dropdown / modal / toast must match `/tmp/glass2-before/` exactly (floating table rows, Manrope/Space Grotesk, Material icons, no menu hover highlight).

- [ ] **Step 4: Smoke (§11.4)**

- Cycle through ALL themes via the switcher: `light` → `light-glass` → `light-glass-cool` → `dark` → `dark-glass`; no stuck styles (attribute-driven CSS swaps cleanly), no console errors.
- Reload on each new theme: no first-paint flash.
- Dropdowns, modals, confirm dialogs, toasts, Monaco in both new themes.
- Wide table: sticky columns opaque, fast scroll smooth.
- Mobile viewport (devtools, ~390px): menu cards, form cards, table remain usable; no horizontal overflow from the new paddings.

- [ ] **Step 5: Final lint gate and wrap-up**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
yarn lint && yarn lint:style
git status
git log --oneline master..HEAD
```

Expected: both linters pass; ~10 commits on the branch; working tree clean. The branch is ready for review/merge. Production seeding happens automatically on the next `deploy.sh` run (stage 7b).

---

## Appendix A: Full enumeration of legacy blocks affected by Task 1

By ORIGINAL `src/styles/style.scss` line numbers (pre-Task-1), for diff review. "→ light" = dark-glass selectors removed from a shared list; "DELETE" = whole rule removed.

- 601–631 shared html token block → light; 633–674 html dark token block **kept** (deleted in Task 2); 676–696 light html tokens untouched
- 698–731 `#app` bridge → light; 733–752 headings → light; 754–783 orbs → light; 785–795 `@keyframes glass-rise` kept
- 797–814 big shared card block → light; 816–824 confirm dialog/content → light; 826–831 light kept
- 833–849 dark confirm colors DELETE; 851–869 dark modal colors DELETE; 871–889 light kept
- 891–897 confirm body → light; 899–901 light kept; 903–905 DELETE; 907–919 confirm footer → light
- 921–939 popper + items → light; 941–975 vm--modal/tabbed → light (dark parts removed)
- 977–1006 is-root/userview-div/header/profile → light; 1008–1032 menu blocks → light
- 1034–1075 table wrappers + th → light; 1077–1085 list-group/input-group → light
- 1087–1095 dark inputs DELETE; 1097–1105 light kept; 1107–1112 dark focus DELETE; 1114–1121 light kept
- 1123–1157 select-container → light; 1159–1197 btn/material-button/menu-entry → light
- 1199–1210 dark reference hover DELETE; 1212–1227 menuEntry variant hover → light; 1229–1236 dark menu hover DELETE
- 1238–1243 badge → light; 1245–1253 dark save DELETE; 1255–1263 light kept; 1265–1271 dark danger DELETE; 1273–1279 light kept
- 1281–1287 overlay → light; 1289–1297 dark form cards DELETE; 1299–1309 light kept; 1311–1343 sub-block shells → light
- 1345–1350 dark inline inputs DELETE; 1352–1357 light kept; 1359–1369 dark sub-block DELETE; 1371–1383 light kept
- 1385–1399 title/last-child → light; 1401–1403 DELETE; 1405–1407 light kept; 1409–1444 sub-block internals → light
- 1446–1457 dark sub-block table DELETE; 1459–1565 dark floating rows DELETE (entire group); 1567–1656 light floating rows kept
- 1658–1671 dark cursor gradient DELETE; 1673–1685 light kept; 1687–1695 dark option chip DELETE; 1697–1701 light kept
- 1703–1714 option radius + td padding → light; 1716–1772 perf/fixed-cells → light; 1774–1778 field gap → light
- 1780–1786 dark required DELETE; 1788–1793 light kept; 1795–1800 disabled indicator → light
- 1802–1812 border-label → light; 1814–1816 DELETE; 1818–1820 light kept; 1822–1825 DELETE; 1827–1829 light kept
- 1831–1866 dark orbs DELETE; 1868–1903 light orbs kept; 1905–1912 content z-index → light
- 1914–1934 table th/capture → light; 1936–1944 dark table-th DELETE; 1946–1955 light kept
- 1957–1971 dark resize DELETE; 1973–1985 light kept; 1987–1990 DELETE; 1992–1994 light kept
- 1996–2012 dark vertical borders DELETE; 2014–2028 light kept; 2030–2037 dark footer DELETE; 2039–2044 light kept
- 2046–2050 dark fixed border DELETE; 2052–2054 light kept; 2056–2060 DELETE; 2062–2064 light kept; 2066–2069 DELETE; 2071–2073 light kept
- 2075–2095 chip base/neutral → light (dark neutral DELETE); 2104–2114 light chips kept; 2116–2126 dark chips DELETE
- 2128–2178 perf/scroll + embedded tables → light (dark sticky-in-form DELETE)
- 2180–2208 `@supports` fallback → light (dark-only inner rule DELETE)
- 2211+ toast blocks: NOT touched by Task 1 (extended in Task 6)

## Appendix B: Notes, decisions and known gaps

1. **Warning color for light-glass-cool** — §3.2 omits `--warning`. Chosen: `#b45309` (amber-700, consistent with the warm theme's light amber chip text) with tint `rgba(245, 158, 11, 0.12)`; toast warning rgb reuses the warm theme's `196, 145, 20`. Report to the user if a different value is preferred.
2. **JetBrains Mono in table cells** — `TableCell.vue` exposes only the `date-time` class for datetime cells; number/ID cells carry no type class, so they stay in Inter. Accepted by spec §12.
3. **Pagination page buttons (§6.4)** — the table has no page-button pagination component (only footer aggregate cells and the add-entry row); footer cells get the micro-label/mono treatment, and there is nothing else to style. If a `b-pagination` shows up anywhere, style it in the Task 11 polish pass.
4. **`--glass-fixed-bg` values** — computed as the flattened color of `--surface-card` over `--bg-shell`: `#0c171d` (dark) / `#fbfdfd` (cool light).
5. **Icons kept as ligature fallback everywhere outside the two new themes** — including `arrow_left`/`arrow_right` (Material triangles) which map to Lucide chevrons in the new themes only.
6. **`light-glass-cool` and the Monaco `endsWith('-glass')` heuristic** — the new theme name does NOT end in `-glass`, hence the explicit routing line in Task 9 Step 3; without it the editor would silently fall back to `ozma-light`.
7. **Warning/success-tinted controls (§6.5)** — in the current app these colors come from DB color variants (`cell_variant`/`option_variant` attributes), which map onto `--cell-*`/`--backgroundColor` consumer vars; the Task 2 bridge keeps that mechanism working, and the token blocks expose `--warning-tint`/`--success-tint`/`--danger-tint` for any explicit per-control rules a view may add. No hardcoded per-state input rule exists in the legacy CSS to port; if the visual pass (Task 11) finds a specific control that needs it, add e.g. `.form-control.warning-tinted { background: var(--warning-tint) !important; border-color: var(--warning) !important; }` scoped to the new themes in the polish commit.

