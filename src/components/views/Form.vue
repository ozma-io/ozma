<i18n>
    {
        "en": {
            "item_not_found": "Record not found",
            "delete": "Delete",
            "delete_confirmation": "Are you sure want to delete this record?",
            "ok": "OK",
            "cancel": "Cancel",
            "yes": "Yes",
            "no": "No"
        },
        "ru": {
            "item_not_found": "Запись не найдена",
            "delete": "Удалить",
            "delete_confirmation": "Вы действительно хотите удалить эту запись?",
            "ok": "ОК",
            "cancel": "Отмена",
            "yes": "Да",
            "no": "Нет"
        }
    }
</i18n>

<template>
  <div
    class="view-form"
  >
    <div v-if="rowPositions.length === 0 && firstRow === null">
      {{ $t('item_not_found') }}
    </div>
    <template v-else>
      <b-modal
        :id="$id('confirmDelete')"
        lazy
        ok-variant="danger"
        :ok-title="$t('ok')"
        :cancel-title="$t('cancel')"
        @ok="deleteRowAndSignal"
        @hidden="toBeDeletedRef = null"
      >
        {{ $t('delete_confirmation') }}
      </b-modal>

      <!-- The first form control is special, it points either to the empty row or to the first added row
           dynamically_. This is as to not lose focus when user starts editing empty row. -->
      <FormEntry
        v-if="firstRow !== null"
        :uv="uv"
        :blocks="gridBlocks"
        :row="firstRow.row"
        :locked="addedLocked"
        :scope="scope"
        :level="level"
        :show-delete="useDeleteAction === null"
        @update="updateValue({ ...firstRow.ref, column: arguments[0] }, arguments[1])"
        @delete="confirmDelete(firstRow.ref)"
        @goto="$emit('goto', $event)"
      />
      <FormEntry
        v-for="rowId in newRowsPositions"
        :key="`added-${rowId}`"
        :uv="uv"
        :blocks="gridBlocks"
        :row="uv.newRows[rowId]"
        :locked="addedLocked"
        :scope="scope"
        :level="level"
        :show-delete="useDeleteAction === null"
        @update="updateValue({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])"
        @delete="confirmDelete({ type: 'added', id: rowId })"
        @goto="$emit('goto', $event)"
      />
      <FormEntry
        v-for="rowI in rowPositions"
        :key="rowI"
        :uv="uv"
        :blocks="gridBlocks"
        :row="uv.rows[rowI]"
        :scope="scope"
        :level="level"
        :selection-mode="selectionMode"
        :show-delete="useDeleteAction === null"
        @update="updateValue({ type: 'existing', position: rowI, column: arguments[0] }, arguments[1])"
        @delete="confirmDelete({ type: 'existing', position: rowI })"
        @goto="$emit('goto', $event)"
        @select="$emit('select', $event)"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { AttributesMap, IResultColumnInfo } from "ozma-api";

import { tryDicts, mapMaybe } from "@/utils";
import { AddedRowId } from "@/state/staging_changes";
import { UserView } from "@/components";
import { Action } from "@/components/ActionsMenu.vue";
import BaseUserView, { baseUserViewHandler, IBaseRowExtra, IBaseValueExtra, IBaseViewExtra } from "@/components/BaseUserView";
import FormEntry from "@/components/views/form/FormEntry.vue";
import { attrToLink, Link } from "@/links";
import { IAddedRow, ICombinedRow, ICombinedUserView, ICombinedValue, IExtendedRowCommon, IExtendedRowInfo, IRowCommon, IUserViewHandler, RowRef } from "@/user_views/combined";
import { GridElement, IGridInput, IGridSection } from "@/components/form/FormGrid.vue";

export interface IButtonAction {
  name: string;
  variant: string;
  link: Link;
}

export interface IElementField {
  type: "field";
  index: number;
  columnInfo: IResultColumnInfo;
  caption: string;
  forceCaption: boolean;
}

export interface IElementButtons {
  type: "buttons";
  actions: IButtonAction[];
}

export type FormElement = IElementField | IElementButtons;

export type FormGridElement = GridElement<FormElement>;

export interface IFormValueExtra extends IBaseValueExtra {
  attributes: AttributesMap;
  visible: boolean;
}

export type IFormRowExtra = IBaseRowExtra;

export type IFormViewExtra = IBaseViewExtra;

export type IFormCombinedUserView = ICombinedUserView<IFormValueExtra, IFormRowExtra, IFormViewExtra>;
export type IFormExtendedRowInfo = IExtendedRowInfo<IFormRowExtra>;
export type IFormExtendedRowCommon = IExtendedRowCommon<IFormValueExtra, IFormRowExtra>;

const createCommonLocalValue = (uv: IFormCombinedUserView, row: IRowCommon & IFormExtendedRowInfo, columnIndex: number, value: ICombinedValue) => {
  const columnAttrs = uv.columnAttributes[columnIndex];
  const attributes = {
    ...uv.attributes,
    ...columnAttrs,
    ...row.attributes,
    ...value.attributes,
  };
  const visible = Boolean(attributes["visible"] ?? true);
  return {
    attributes,
    visible,
  };
};

export const formUserViewHandler: IUserViewHandler<IFormValueExtra, IFormRowExtra, IFormViewExtra> = {
  ...baseUserViewHandler,

  createLocalValue(
    uv: IFormCombinedUserView,
    rowIndex: number,
    row: ICombinedRow & IFormExtendedRowInfo,
    columnIndex: number,
    value: ICombinedValue,
    oldView: IFormViewExtra | null,
    oldRow: IFormRowExtra | null,
    oldValue: IFormValueExtra | null,
  ) {
    const baseExtra = baseUserViewHandler.createLocalValue(uv, rowIndex, row, columnIndex, value, oldView, oldRow, oldValue);
    const commonExtra = createCommonLocalValue(uv, row, columnIndex, value);
    return { ...baseExtra, ...commonExtra };
  },

  createAddedLocalValue(
    uv: IFormCombinedUserView,
    rowId: AddedRowId,
    row: IAddedRow & IFormExtendedRowInfo,
    columnIndex: number,
    value: ICombinedValue,
    oldView: IFormViewExtra | null,
    oldRow: IFormRowExtra | null,
    oldValue: IFormValueExtra | null,
  ) {
    const baseExtra = baseUserViewHandler.createAddedLocalValue(uv, rowId, row, columnIndex, value, oldView, oldRow, oldValue);
    const commonExtra = createCommonLocalValue(uv, row, columnIndex, value);
    return { ...baseExtra, ...commonExtra };
  },

  createEmptyLocalValue(
    uv: IFormCombinedUserView,
    row: IRowCommon & IFormExtendedRowInfo,
    columnIndex: number,
    value: ICombinedValue,
    oldView: IFormViewExtra | null,
    oldRow: IFormRowExtra | null,
    oldValue: IFormValueExtra | null,
  ) {
    const baseExtra = baseUserViewHandler.createEmptyLocalValue(uv, row, columnIndex, value, oldView, oldRow, oldValue);
    const commonExtra = createCommonLocalValue(uv, row, columnIndex, value);
    return { ...baseExtra, ...commonExtra };
  },
};

@UserView({
  handler: formUserViewHandler,
})
@Component({
  components: {
    FormEntry,
  },
})
export default class UserViewForm extends mixins<BaseUserView<IFormValueExtra, IFormRowExtra, IFormViewExtra>>(BaseUserView) {
  private deletedOne = false;
  private toBeDeletedRef: RowRef | null = null;

  get firstRow(): { row: IFormExtendedRowCommon; ref: RowRef } | null {
    if (this.uv.newRowsOrder.length === 0 && this.uv.rows === null && this.uv.info.mainEntity !== null) {
      return {
        row: this.uv.emptyRow!,
        ref: { type: "new" },
      };
    } else if (this.uv.newRowsOrder.length > 0) {
      return {
        row: this.uv.newRows[this.uv.newRowsOrder[0]],
        ref: { type: "added", id: this.uv.newRowsOrder[0] },
      };
    } else {
      return null;
    }
  }

  // Because we treat the first added row specially we use only second+ new rows here.
  get newRowsPositions() {
    return this.uv.newRowsOrder.slice(1);
  }

  // When we only have one record displayed, we hide "Delete" button and add is an an action to menu instead.
  get useDeleteAction(): RowRef | null {
    if (this.rowPositions.length === 0 && this.newRowsPositions.length === 1) {
      return { type: "added", id: this.newRowsPositions[0] };
    } else if (this.rowPositions.length === 1 && this.newRowsPositions.length === 0) {
      return { type: "existing", position: this.rowPositions[0] };
    } else {
      return null;
    }
  }

  get blockSizes(): number[] | null {
    const rawBlockSizes = this.uv.attributes["block_sizes"];
    if (!(rawBlockSizes instanceof Array)) {
      return null;
    }
    const blockSizes = rawBlockSizes.map(x => {
      const n = Math.round(Number(x));
      return Number.isInteger(n)
        ? Math.max(0, Math.min(n, 12))
        : undefined;
    });
    return blockSizes.every(x => x !== undefined)
      ? blockSizes as number[]
      : null;
  }

  get gridBlocks(): FormGridElement[] {
    const viewAttrs = this.uv.attributes;
    const blocks: IGridSection<FormElement>[] =
      (this.blockSizes ?? [12]).map(size => ({ type: "section", size, content: [] }));
    // If 'block_sizes' attribute is not used or invalid,
    // then two-column layout is used.
    const inputWidth = this.blockSizes === null ? 6 : 12;

    // Add columns to blocks
    this.uv.info.columns.forEach((columnInfo, i) => {
      const columnAttrs = this.uv.columnAttributes[i];
      const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs);

      const visible = Boolean(getColumnAttr("visible") ?? true);
      if (!visible) {
        return;
      }

      const blockAttr = Number(getColumnAttr("form_block"));
      const blockNumber = Number.isNaN(blockAttr) ? 0 : blockAttr;
      const block = Math.max(0, Math.min(blockNumber, blocks.length - 1));

      const captionAttr = getColumnAttr("caption");
      const caption = String(captionAttr ?? columnInfo.name);

      const element: IGridInput<IElementField> = {
        type: "element",
        size: inputWidth,
        element: {
          type: "field",
          index: i,
          columnInfo,
          caption,
          forceCaption: Boolean(captionAttr),
        },
      };
      blocks[block].content.push(element);
    });

    // Add buttons from @form_buttons attributes to blocks
    /*
     * EXAMPLE
     * @"form_buttons" = [{
     *     form_block : 3,
     *     actions : [
     *         {
     *             name: 'Удалить записи',
     *             variant: 'danger',
     *             call_process: { schema: 'foo', name: 'delete', args: {'hello':'world'}},
     *         },
     *         {
     *             name: 'Добавить записи',
     *             variant: 'success',
     *             call_process: { schema: 'foo', name: 'add' },
     *         },
     *         {
     *             name: 'Обновить записи',
     *             variant: 'warning',
     *             call_process: { schema: 'foo', name: 'update' },
     *         }
     *     ]
     * },
     * {
     *     form_block : 4,
     *     actions : [
     *         {
     *             name: 'Удалить записи 1',
     *             variant: 'danger',
     *             call_process: { schema: 'foo', name: 'delete' },
     *         },
     *         {
     *             name: 'Добавить записи 1',
     *             variant: 'success',
     *             call_process: { schema: 'foo', name: 'add' },
     *         },
     *         {
     *             name: 'Обновить записи 1',
     *             variant: 'warning',
     *             call_process: { schema: 'foo', name: 'update' },
     *         }
     *     ]
     * }]
     */
    const formButtons = this.uv.attributes["form_buttons"];
    if (formButtons !== undefined && Array.isArray(formButtons)) {
      formButtons.forEach((buttons, i) => {
        const blockAttr = Number(buttons["form_block"]);
        const blockNumber = Number.isNaN(blockAttr) ? 0 : blockAttr;
        const block = Math.max(0, Math.min(blockNumber, blocks.length - 1));

        const actions: IButtonAction[] = [];
        if (Array.isArray(buttons["actions"])) {
          buttons["actions"].forEach(action => {
            if (typeof action.name !== "string") {
              return;
            }
            if (typeof action.variant !== "string") {
              return;
            }
            const link = attrToLink(action);
            if (link === null) {
              return;
            }
            actions.push({ name: action.name, variant: action.variant, link });
          });
        }

        if (actions.length > 0) {
          const element: IGridInput<IElementButtons> = {
            type: "element",
            size: 12,
            element: {
              type: "buttons",
              actions,
            },
          };
          blocks[block].content.push(element);
        }
      });
    }
    return blocks;
  }

  private init() {
    if (this.isTopLevel) {
      this.$emit("update:bodyStyle", `
        @media print {
            @page {
                size: portrait;
            }
        }
      `);
    }
  }

  get actions() {
    const actions: Action[] = [];
    const deleteRef = this.useDeleteAction;
    if (deleteRef !== null) {
      actions.push(
        { name: this.$t("delete").toString(), callback: () => this.confirmDelete(deleteRef) },
      );
    }
    return actions;
  }

  private confirmDelete(ref: RowRef) {
    this.toBeDeletedRef = ref;
    this.$bvModal.show(this.$id("confirmDelete"));
  }

  private deleteRowAndSignal() {
    this.deleteRow(this.toBeDeletedRef!);
    this.deletedOne = true;
  }

  @Watch("actions", { deep: true, immediate: true })
  private updateActions() {
    this.$emit("update:actions", this.actions);
  }

  private created() {
    this.init();
  }

  @Watch("uv")
  private uvChanged() {
    this.init();
  }

  @Watch("rowPositions")
  private returnIfEmpty() {
    // Go back if we removed all entries.
    if (this.isRoot && this.deletedOne && this.rowPositions.length === 0 && this.uv.newRowsOrder.length === 0) {
      this.deletedOne = false; // In case we end up in the same uv.
      this.$emit("goto-previous");
    }
  }

  get rowPositions() {
    if (this.uv.rows === null) {
      return [];
    } else {
      return mapMaybe((row, rowI) => row.deleted ? undefined : rowI, this.uv.rows);
    }
  }
}
</script>

<style scoped>
  .view-form {
    height: 100% !important;
    padding: 5px !important;
    overflow-y: auto;
    overflow-x: hidden;

    /* background-color: var(--MainBackgroundColor); */
    background-color: #f8f9fa;
  }

  @media print {
    .view-form {
      background-color: white;
    }
  }
</style>
