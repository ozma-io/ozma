<i18n>
    {
        "en": {
            "item_not_found": "Record not found",
            "delete": "Delete",
            "delete_confirmation": "Are you sure want to delete this record?",
            "ok": "OK",
            "cancel": "Cancel",
            "no_value": "(No value)",
            "yes": "Yes",
            "no": "No"
        },
        "ru": {
            "item_not_found": "Запись не найдена",
            "delete": "Удалить",
            "delete_confirmation": "Вы действительно хотите удалить эту запись?",
            "ok": "ОК",
            "cancel": "Отмена",
            "no_value": "(Пусто)",
            "yes": "Да",
            "no": "Нет"
        }
    }
</i18n>

<template>
  <div
    fluid
    class="view-form"
  >
    <div v-if="rowPositions.length === 0 && firstRow === null">
      {{ $t('item_not_found') }}
    </div>
    <template v-else>
      <!-- The first form control is special, it points either to the empty row or to the first added row
                 _dynamically_. This is as to not lose focus when user starts editing empty row. -->
      <FormEntry
        v-if="firstRow !== null"
        :uv="uv"
        :blocks="gridBlocks"
        :row="firstRow.row"
        :local-row="firstRow.local"
        :locked="addedLocked"
        :indirect-links="indirectLinks"
        :scope="scope"
        :level="level"
        @update="updateValue({ ...firstRow.rowRef, column: arguments[0] }, arguments[1])"
        @goto="$emit('goto', $event)"
      />
      <FormEntry
        v-for="rowId in newRowsPositions"
        :key="`added-${rowId}`"
        :uv="uv"
        :blocks="gridBlocks"
        :row="uv.newRows[rowId]"
        :local-row="local.newRows[rowId]"
        :locked="addedLocked"
        :indirect-links="indirectLinks"
        :scope="scope"
        :level="level"
        @update="updateValue({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])"
        @delete="deleteRowAndSignal({ type: 'added', id: rowId })"
        @goto="$emit('goto', $event)"
      />
      <FormEntry
        v-for="rowI in rowPositions"
        :key="rowI"
        :uv="uv"
        :blocks="gridBlocks"
        :row="uv.rows[rowI]"
        :local-row="local.rows[rowI]"
        :indirect-links="indirectLinks"
        :scope="scope"
        :level="level"
        :selection-mode="selectionMode"
        @update="updateValue({ type: 'existing', position: rowI, column: arguments[0] }, arguments[1])"
        @delete="deleteRowAndSignal({ type: 'existing', position: rowI })"
        @goto="$emit('goto', $event)"
        @select="$emit('select', $event)"
      />
    </template>
  </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { Store } from "vuex";
import { namespace } from "vuex-class";

import { tryDicts, mapMaybe } from "@/utils";
import { AttributesMap, IResultColumnInfo } from "@/api";
import { CombinedUserView, ICombinedValue, IRowCommon, ICombinedRow, IAddedRow, homeSchema } from "@/state/user_view";
import { AddedRowId } from "@/state/staging_changes";
import { IQuery } from "@/state/query";
import { LocalUserView, SimpleLocalUserView, ILocalRowInfo, ILocalRow, ValueRef, RowRef } from "@/local_user_view";
import { UserView } from "@/components";
import { ISelectionRef } from "@/components/BaseUserView";
import BaseUserView from "@/components/BaseUserView";
import FormEntry from "@/components/views/form/FormEntry.vue";
import { IActionArguments } from "@/state/actions";

import {
  IFieldInfo, IBlockInfo, IFormValueExtra, IFormRowExtra, IFormUserViewExtra, GridElement, IGridSection, IGridInput, IButtons, IGridButtons, IButtonAction
} from "@/components/form/types";

type IFormLocalRowInfo = ILocalRowInfo<IFormRowExtra>;
type IFormLocalRow = ILocalRow<IFormValueExtra, IFormRowExtra>;

class LocalFormUserView extends LocalUserView<IFormValueExtra, IFormRowExtra, IFormUserViewExtra> {
  constructor(store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>, oldLocal: LocalUserView<IFormValueExtra, IFormRowExtra, IFormUserViewExtra> | null) {
    super(store, uv, defaultRawValues, oldLocal);
  }

  createCommonLocalValue(row: IRowCommon, localRow: IFormLocalRowInfo, columnIndex: number, value: ICombinedValue): IFormValueExtra {
    const columnAttrs = this.uv.columnAttributes[columnIndex];
    const attributes = { ...this.uv.attributes, ...columnAttrs, ...row.attributes, ...value.attributes };
    const visible  =  "visible" in attributes ? Boolean(attributes["visible"]) : true;
    const extra = {
      attributes,
      visible
    };
    return extra;
  }

  createLocalValue(rowIndex: number, row: ICombinedRow, localRow: IFormLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: IFormValueExtra | null) {
    const extra = this.createCommonLocalValue(row, localRow, columnIndex, value);
    if (extra.attributes["selectable"] && value.info) {
      localRow.extra.selectionEntry = {
        entity: value.info.fieldRef.entity,
        id: value.info.id,
      };
    } else if (this.uv.info.mainEntity) {
      localRow.extra.selectionEntry = {
        entity: this.uv.info.mainEntity,
        id: row.mainId!,
      };
    }
    return extra;
  }

  createAddedLocalValue(rowId: AddedRowId, row: IAddedRow, localRow: IFormLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: IFormValueExtra | null) {
    const extra = this.createCommonLocalValue(row, localRow, columnIndex, value);
    return extra;
  }

  createEmptyLocalValue(row: IRowCommon, localRow: IFormLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: IFormValueExtra | null) {
    const extra = this.createCommonLocalValue(row, localRow, columnIndex, value);
    return extra;
  }

  createCommonLocalRow(row: IRowCommon): IFormRowExtra {
    return {};
  }

  createLocalRow(rowIndex: number, row: ICombinedRow) {
    const extra = this.createCommonLocalRow(row);
    if (row.mainId !== undefined) {
      extra.selectionEntry = {
        entity: this.uv.info.mainEntity!,
        id: row.mainId,
      };
    }
    return extra;
  }

  createAddedLocalRow(rowId: AddedRowId, row: IAddedRow) {
    return this.createCommonLocalRow(row);
  }

  createEmptyLocalRow(row: IRowCommon) {
    return this.createCommonLocalRow(row);
  }

  createLocalUserView(): IFormUserViewExtra {
    const extra = {
      homeSchema: homeSchema(this.uv.args),
    };
    return extra;
  }
}

const query = namespace("query");
const actions = namespace("actions");

@UserView({
  localConstructor: LocalFormUserView,
})
@Component({
  components: {
    FormEntry,
  },
})
export default class UserViewForm extends mixins<BaseUserView<LocalFormUserView, IFormValueExtra, IFormRowExtra, IFormUserViewExtra>>(BaseUserView) {
  @query.State("previous") previousQuery!: IQuery | null;
  @actions.Action("getActionResult") getActionResult!: (args: IActionArguments) => Promise<void>;

  @Prop({ type: CombinedUserView, required: true }) uv!: CombinedUserView;
  @Prop({ type: Boolean, default: false }) isRoot!: boolean;
  @Prop({ type: Object, required: true }) local!: LocalFormUserView;

  private deletedOne = false;

  get firstRow() {
    if (this.uv.newRowsPositions.length === 0 && this.uv.rows === null && this.uv.info.mainEntity !== null) {
      return {
        row: this.local.emptyRow!.row,
        local: this.local.emptyRow!.local,
        rowRef: { type: "new" },
      };
    } else if (this.uv.newRowsPositions.length > 0) {
      return {
        row: this.uv.newRows[this.uv.newRowsPositions[0]],
        local: this.local.newRows[this.uv.newRowsPositions[0]],
        rowRef: { type: "added", id: this.uv.newRowsPositions[0] },
      };
    } else {
      return null;
    }
  }

  // Because we treat the first added row specially we use only second+ new rows here.
  get newRowsPositions() {
    return this.uv.newRowsPositions.slice(1);
  }

  get blockSizes(): number[] {
    const rawBlockSizes = this.uv.attributes["block_sizes"];
    if (!(rawBlockSizes instanceof Array)) {
      return [12];
    }
    const blockSizes = rawBlockSizes.map(x => {
      const n = Math.round(Number(x));
      if (Number.isInteger(n)) {
        return Math.max(0, Math.min(12, n));
      } else {
        return undefined;
      }
    });
    if (blockSizes.some(x => x === undefined)) {
      return [12];
    } else {
      return blockSizes as number[];
    }
  }

  get gridBlocks(): GridElement[] {
    const viewAttrs = this.uv.attributes;
    const blocks: IGridSection[] = this.blockSizes.map(size => ({ type: "section", size, content: [] }));
    const inputWidth = R.equals(this.blockSizes, [12]) ? 6 : 12;

    //Add columns to blocks
    this.uv.info.columns.forEach((columnInfo, i) => {
      const columnAttrs = this.uv.columnAttributes[i];
      const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs);

      const visibleColumnAttr = getColumnAttr("visible");
      const visible = visibleColumnAttr === undefined ? true : Boolean(visibleColumnAttr);

      if (!visible) {
        return;
      }

      const blockAttr = Number(getColumnAttr("form_block"));
      const blockNumber = Number.isNaN(blockAttr) ? 0 : blockAttr;
      const block = Math.max(0, Math.min(blockNumber, blocks.length - 1));

      const formElementAttr = String(getColumnAttr("form_element"));

      const captionAttr = getColumnAttr("caption");
      const caption = captionAttr !== undefined ? String(captionAttr) : columnInfo.name;

      const field = {
        index: i,
        columnInfo,
        caption,
      };

      const element: IGridInput = {
        type: "input",
        size: inputWidth,
        field,
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
     *             call_process: [{ schema: 'foo', call: 'delete' }],
     *         },
     *         {   
     *             name: 'Добавить записи',
     *             variant: 'success',
     *             call_process: [{ schema: 'foo', call: 'add' }],
     *         },
     *         {   
     *             name: 'Обновить записи',
     *             variant: 'warning',
     *             call_process: [{ schema: 'foo', call: 'update' }],
     *         }
     *     ]
     * },
     * {
     *     form_block : 4,
     *     actions : [
     *         {   
     *             name: 'Удалить записи 1',
     *             variant: 'danger',
     *             call_process: [{ schema: 'foo', call: 'delete' }],
     *         },
     *         {   
     *             name: 'Добавить записи 1',
     *             variant: 'success',
     *             call_process: [{ schema: 'foo', call: 'add' }],
     *         },
     *         {   
     *             name: 'Обновить записи 1',
     *             variant: 'warning',
     *             call_process: [{ schema: 'foo', call: 'update' }],
     *         }
     *     ]
     * }]
     */
    const formButtons = this.uv.attributes['form_buttons'];
    if(formButtons !== undefined && Array.isArray(formButtons)){
      formButtons.forEach((buttons: IButtons, i: number) => {

        const blockAttr = Number(buttons["form_block"]);
        const blockNumber = Number.isNaN(blockAttr) ? 0 : blockAttr;
        const block = Math.max(0, Math.min(blockNumber, blocks.length - 1));

        const actions: IButtonAction[] = [];
        if(buttons.actions !== undefined && Array.isArray(buttons.actions)){
          buttons.actions.forEach((action: any) => {
            if (typeof action.name !== "string")
              return;
            if (typeof action.variant !== "string")
              return;
            if (action.call_process && typeof action.call_process === "object" && action.call_process !== null) {
              actions.push({ name: String(action.name), variant: String(action.variant), callback: () => this.callProcess(action.call_process) });
            }
          })
        }

        if( actions.length > 0){
          const element: IGridButtons = {
            type: "buttons",
            actions
          };
          blocks[block].content.push(element);
        }
      })
    }
    return blocks;
  }
  
  private callProcess(querySelf: string){
    this.getActionResult({ref: {schema: "user", name: "test_action"}, args: [{'hello': 'world'}]});
  }

  private init() {
    if (this.isRoot) {
      this.$emit("update:bodyStyle", `
        @media print {
            @page {
                size: portrait;
            }
        }
      `);
    }
  }

  private created() {
    this.init();
  }

  private deleteRowAndSignal(ref: RowRef) {
    this.deleteRow(ref);
    this.deletedOne = true;
  }

  @Watch("uv", { deep: true })
  private uvChanged() {
    this.init();
  }

  @Watch("rowPositions")
  private returnIfEmpty() {
    if (this.isRoot && this.deletedOne && this.rowPositions.length === 0 && this.uv.newRowsPositions.length === 0 && this.previousQuery !== null) {
      this.deletedOne = false; // In case we end up in the same uv.
      this.$emit("goto", this.previousQuery);
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
    padding: 0 0 50px 0 !important;
    overflow-y: auto;
    overflow-x: hidden;
    height: 100% !important;
    width: 100vw;
    background-color: var(--MainBackgroundColor);
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .view-form {
        overflow: auto !important;
      }
    }
  }
</style>
