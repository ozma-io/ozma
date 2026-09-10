# User-view UX bundle (filters + confirm) — design

Date: 2026-04-28
Repo: `ozma` (frontend)

Bundle of four independent UX improvements for user views. All changes are
frontend-only — backend (`ozmadb`) already exposes everything we need
(`IArgument.attributeTypes`, `IExecutedViewExpr.argumentAttributes`,
`linkHandler` for actions, etc.).

---

## Task 1 — Hide individual arguments via `visible = false`

### Goal

Allow user-view authors to declare arguments that are passed via URL but not
shown in the filters popup:

```
{
  $id string null { visible = false },
  $status string null { caption = "Статус" },
}
```

### Behavior (decision: option B)

- Arguments where `argumentAttributes[name].visible === false` are excluded
  from the filters popup (`ArgumentEditor.vue::args` getter).
- The "Filters" header button is **not shown** if every argument is hidden.
  - "Every argument is hidden" includes the dev-mode auto-show: if all args
    are hidden, dev-mode does not force the button either.
- Default values, URL serialization, etc. remain unchanged — only UI
  presentation is affected.

### Implementation

- File: `src/components/ArgumentEditor.vue`
  - In the `args` getter, filter out arguments whose `visible` attribute is
    strictly `false`.
  - In the `button` getter, base its visibility on the **filtered** list
    (i.e. `args.length > 0`), not the raw `argumentsMap`.

### Why no backend work

`Resolve.fs::ResolveArgumentAttributesMap` and
`Compile.fs::CompileArgumentAttributes` already process attributes on
arguments; the frontend already receives `argumentAttributes` per argument.

---

## Task 2 — `confirm` before action/click

### Goal

Allow declaring a confirmation dialog on any button/link click:

```
@buttons = [
  {
    display: 'selectionPanel',
    variant: 'info',
    name: 'Добавить в PL-отчёт',
    action: { schema: 'fin', name: 'add_transaction_to_pl_report' },
    confirm: {
      title: 'Точно добавить?',
      message: 'Это нельзя отменить',
      okTitle: 'Да',
      okVariant: 'danger',
      cancelTitle: 'Отмена',
      cancelVariant: 'outline-secondary'
    }
  }
]
```

### Behavior (decisions: B + A)

- Applies to **any executable button** in `Button` (`callback`, `link`,
  `location`, `upload-file`, `button-group` is N/A — its children carry their
  own confirm).
- If `confirm` is **absent** → no dialog (current behavior unchanged).
- `confirm: true` shorthand → default dialog using i18n strings already
  defined in `TopLevelUserView.vue` (`clear_changes_confirm` family) — we
  add fresh keys: `confirm_default_title`, `confirm_default_ok`,
  `confirm_default_cancel`.

### Schema

```ts
export interface IButtonConfirm {
  title?: UserString
  message?: UserString
  okTitle?: UserString
  okVariant?: ColorVariantAttribute  // ColorVariantAttribute, NOT raw HEX
  cancelTitle?: UserString
  cancelVariant?: ColorVariantAttribute
}
```

`true` is also accepted at the parser level → resolves to all-defaults.

### Implementation

- File: `src/components/buttons/buttons.ts`
  - Add `confirm?: IButtonConfirm` field to `IButton`.
  - Add helper `attrToConfirm(attr: unknown): IButtonConfirm | undefined`
    that:
      - returns `{}` for `attr === true`
      - returns parsed object for `typeof attr === 'object'` (uses
        `rawToUserString`, `colorVariantFromAttribute`)
      - otherwise `undefined`.
  - Wire it into `attrToButton` (and `attrToButtonsOld` for symmetry).
- File: `src/components/buttons/ButtonItem.vue`
  - Wrap `onClickCallback` and `onClickLink` in
    `await this.askConfirm(this.button.confirm)` — if it returns `false`,
    early-return.
  - `askConfirm` calls `this.$bvModal.msgBoxConfirm(message ?? title ?? defaultTitle, opts)`
    using the variant strings derived from `ColorVariantAttribute`.

### Why not in `linkHandler`

`linkHandler` doesn't see callback-only buttons (e.g. "Filters" toggle).
Confirmation belongs to "click intent", which is the button layer.

---

## Task 3 — Multi-select: clear-all "×" + race-condition fix

### Goal

1. Add a small "×" inline in the multi-select field for one-click clearing
   without opening the popup. Keep the existing "Clear" button inside the
   popup. (decision: option C)
2. Fix the bug where rapid select / unselect actions are lost in ~50 % of
   cases (decision: option F — root-cause fix).

### Root cause of the race

`ValueSelect.vue::addValue` / `removeValue` build the new array from
`this.value` (the prop) and emit `update:value`. If two clicks fire in the
same tick, the second computation still uses the **stale** prop, and one
update is lost. Same family of bugs in `unselectOption` if the parent re-
renders slowly.

### Fix (decision: approach C — buffered apply)

- File: `src/components/ValueSelect.vue`
  - Maintain `private pendingValue: unknown[] | null | undefined = undefined`
    (sentinel `undefined` = "no pending change").
  - Reset `pendingValue` in a `@Watch('value')` whenever a new prop arrives.
  - In `addValue` / `removeValue` / `clearValues`:
      - Read base from `pendingValue ?? this.value`.
      - Compute the next array.
      - Store it in `pendingValue`.
      - In `nextTick`, emit `update:value` exactly once, then clear
        `pendingValue` (let the watcher do it on prop arrival).
  - `selectedOptions` getter (in `MultiSelect.vue`) is unaffected — it still
    reads `value` prop. UI consistency is preserved because the popup
    closes/reopens cycle is short and parent prop arrives next tick anyway.

This eliminates the "old prop seen twice" race because the second click in
the same tick reads `pendingValue` (already includes the first click).

### Inline "×" button

- File: `src/components/multiselect/MultiSelect.vue`
  - Add a `<button class="clear-all-button">×</button>` inside
    `.select-container` (right side, before the dropdown chevron).
  - Visible iff `showClearOptions` is true **and** `!disabled`.
  - On click: `event.stopPropagation()`; call `this.unselectAll()`; do not
    open the popup.

### Tests / verification (manual)

The MultiSelect file has no existing unit tests — verification will be
manual via the dev server: rapid clicks on different options, on the same
option, on the chip "×", on the field-level "×".

---

## Task 4 — "Reset filters" button (back to opening snapshot)

### Goal

Add a "Reset" button in the filters popup that returns all argument values
to the snapshot of when the user view was first opened. Arguments that
were in the URL at that moment are restored; arguments the user edited
since are reverted. (decision: option A; UX: option D — popup stays open)

### Implementation

- File: `src/components/UserView.vue`
  - Add `private initialArguments: IUserViewArguments['args'] | null = null`.
  - In a `@Watch('state', { immediate: true })` (or `created` + watcher):
      - When `state.state === 'show'` and `initialArguments === null`,
        capture `this.args.args` snapshot.
      - When the user view **identity** changes (different `source` key),
        reset the snapshot to the new `args.args`. We treat opening the
        same view in a new tab as a separate snapshot.
  - Pass `initialArguments` down through `argumentEditorProps`:
      ```ts
      const argumentEditorProps: IArgumentEditorProps = {
        userView: this.state.uv,
        applyArguments: …,
        initialArguments: this.initialArguments,
      }
      ```

- File: `src/components/ArgumentEditor.vue`
  - Add `initialArguments` prop (`Record<ArgumentName, unknown> | null`).
  - Add a "Reset" button rendered in the footer next to "Apply", visible
    iff:
      - `initialArguments !== null`, **and**
      - `currentArguments` differs from the deserialised initial snapshot.
  - On click:
      - Set `updatedArguments` = the deserialised initial snapshot
        (overrides `initialArguments` getter and `defaultArguments`).
      - **Do not close the popup** (decision D). Auto-apply (debounced) or
        manual apply works as today.
  - i18n already has the `reset` key.

---

## Out of scope

- Changing how nested user-view arguments are serialised on the wire.
- Adding a "Reset" indicator in the header outside the popup.
- Confirmation for arbitrary cell-level links (`attrToLinkSelf`).

---

## Rollout

1. Land Task 1 + 4 together (both touch `ArgumentEditor.vue`).
2. Land Task 2 (independent — buttons module).
3. Land Task 3 (independent — multiselect/value-select).

Single commit per task is fine; one PR / push is acceptable since the
features are user-facing and independently toggle-able by their respective
attributes (`visible`, `confirm`).
