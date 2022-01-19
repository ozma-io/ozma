<i18n>
    {
        "en": {
            "create": "Create new entry",
            "create_in_modal": "Create referenced entry in modal window",
            "export_to_csv": "Export to .csv",
            "import_from_csv": "Import from .csv",
            "selected_n_entries": "{n} out of {loaded} entries are selected",
            "remove_selected_rows": "Delete selected entries",
            "error": "Error"
        },
        "ru": {
            "create": "Создать новую запись",
            "create_in_modal": "Создать связанную запись в окне",
            "export_to_csv": "Экспорт в .csv",
            "import_from_csv": "Импорт из .csv",
            "selected_n_entries": "Выбрано {n} из {loaded} записей",
            "remove_selected_rows": "Удалить выбранные записи",
            "error": "Ошибка"
        }
    }
</i18n>

<template>
  <span>
    <SelectUserView
      v-if="modalView"
      :select-view="modalView"
      :entity="modalReferenceField.entity"
      autofocus
      :parent-scope="scope"
      @select="selectFromUserView($event)"
      @close="modalView = null"
    />
    <QRCodeScanner
      v-if="selectedQRCodeReference !== null"
      :open-scanner="openQRCodeScanner"
      :reference-entity="selectedQRCodeReference.referenceEntity"
      :entries="selectedQRCodeReference.entries"
      multi-scan
      @select="selectFromScanner(qrCodeColumnIndex, $event)"
    />
    <QRCodeScanner
      v-if="selectedBarCodeReference !== null"
      :open-scanner="openBarCodeScanner"
      :reference-entity="openBarCodeScanner.referenceEntity"
      :entries="openBarCodeScanner.entries"
      multi-scan
      text-input
      @select="selectFromScanner(barCodeColumnIndex, $event)"
    />

    <transition name="fade-transform">
      <div
        v-if="selectedSome && selectionButtons.length !== 0"
        class="selection-buttons-wrapper"
      >
        <div class="selection-buttons-label">
          {{ $t("selected_n_entries", { n: selectedLength, loaded: loadedRowsCount }) }}
        </div>
        <div
          class="selection-buttons-panel"
        >
          <ButtonsPanel
            :buttons="selectionButtons"
          />
        </div>
      </div>
    </transition>
  </span>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { FunDBError, IEntity, IEntityRef, IEntriesRequestOpts, IInsertEntityOp, ITransaction } from "ozma-api";
import { AutoSaveLock } from "@/state/staging_changes";
import { Action, namespace } from "vuex-class";

import { encodeUTF16LE, getBOM, mapMaybe, saveToFile, tryDicts } from "@/utils";
import { defaultVariantAttribute, bootstrapVariantAttribute } from "@/utils_colors";
import BaseUserView, { IBaseRowExtra, IBaseValueExtra, IBaseViewExtra, userViewTitle } from "@/components/BaseUserView";
import { attrToQuery, IQuery } from "@/state/query";
import SelectUserView from "@/components/SelectUserView.vue";
import type { IQRResultContent } from "@/components/qrcode/QRCodeScanner.vue";
import { RowRef, ValueRef } from "@/user_views/combined";
import type { ICommonUserViewData, ICombinedUserViewAny } from "@/user_views/combined";
import { getReferenceInfo } from "@/state/entries";
import { attrToButton, Button, attrToButtons, attrToButtonsOld } from "@/components/buttons/buttons";
import { IAttrToLinkOpts } from "@/links";
import { convertParsedRows, serializeValue, valueFromRaw, valueToText } from "@/values";
import { ErrorKey } from "@/state/errors";

import Api from "@/api";
import { fetchUserViewData } from "@/user_views/fetch";

interface IModalReferenceField {
  field: ValueRef;
  uv: IQuery;
  entity: IEntityRef;
}

const csvCell = (str: string): string => {
  return `"${str.replace(/"/g, `""`)}"`;
};

const csvSeparator = "\t";

const csvExportOpts: IEntriesRequestOpts = {
  chunk: { limit: 10000 },
};

const csvImportChunk = 100;

const staging = namespace("staging");
const errors = namespace("errors");
const entities = namespace("entities");

@Component({
  components: {
    SelectUserView,
    QRCodeScanner: () => import("@/components/qrcode/QRCodeScanner.vue"),
  },
})
export default class UserViewCommon extends mixins<BaseUserView<IBaseValueExtra, IBaseRowExtra, IBaseViewExtra>>(BaseUserView) {
  @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>); args?: any[] }) => Promise<any>;
  @Action("reload") reload!: () => Promise<void>;
  @errors.Mutation("setError") setError!: (_: { key: ErrorKey; error: string }) => void;
  @staging.Action("addAutoSaveLock") addAutoSaveLock!: () => Promise<AutoSaveLock>;
  @staging.Action("removeAutoSaveLock") removeAutoSaveLock!: (id: AutoSaveLock) => Promise<void>;
  @entities.Action("getEntity") getEntity!: (ref: IEntityRef) => Promise<IEntity>;

  modalView: IQuery | null = null;
  openQRCodeScanner = false;
  openBarCodeScanner = false;
  showDeleteEntiesButton = false;
  private autoSaveLock: AutoSaveLock | null = null;

  private async addMyAutoSaveLock() {
    if (this.autoSaveLock !== null) return;

    const lock = await this.addAutoSaveLock();
    this.autoSaveLock = lock;
  }

  private removeMyAutoSaveLock() {
    if (this.autoSaveLock === null) return;

    void this.removeAutoSaveLock(this.autoSaveLock);
    this.autoSaveLock = null;
  }

  protected beforeDestroy() {
    this.removeMyAutoSaveLock();
  }

  @Watch("uv", { immediate: true })
  private async onUserViewUpdate(uv: ICombinedUserViewAny) {
    let disableAutoSave: boolean;

    const disableAutoSaveRaw = uv.attributes["disable_auto_save"];
    if (typeof disableAutoSaveRaw === "boolean") {
      disableAutoSave = disableAutoSaveRaw;
    } else {
      disableAutoSave = false;
      if ("post_create_link" in uv.attributes) {
        disableAutoSave = true;
      } else if (uv.info.mainEntity) {
        const entity = await this.getEntity(uv.info.mainEntity);
        if (entity.hasInsertTriggers) {
          disableAutoSave = true;
        }
      }
    }

    if (disableAutoSave) {
      await this.addMyAutoSaveLock();
    } else {
      this.removeMyAutoSaveLock();
    }
    await this.updateShowDeleteEntriesButton();
  }

  private async updateShowDeleteEntriesButton() {
    this.showDeleteEntiesButton = false;

    if (!this.uv.info.mainEntity) return;
    if (this.uv.extra.softDisabled) return;

    const entity = await this.getEntity(this.uv.info.mainEntity);
    this.showDeleteEntiesButton = entity?.access.delete ?? false;
  }

  private async exportToCsv() {
    // Gods do I hate Excel:
    //
    // *. It doesn't open CSV files in UTF-8 encoding automatically. You need to specify BOM;
    // *. By default it uses _region-specific_ field separator. You need to specify it as say `sep=,\n` in the beginning of the file for it to work;
    // *. BUT! BOM and field separator specifiers don't work together -- Excel forgets encoding!;
    // *. BUT again: Excel can autodetect tabs and _only_ tabs as field separators automatically without a field separator specifier;
    // *. BUT some versions of Excel fail to do this unless you use UTF16-LE (and only LE);
    // *. This autodetection also works reliably only if all cells are quoted (likely because it stumbles on some symbol that gives no problems to anything else).
    //
    // So we need to specifically use `\t` separator, UTF16-LE with BOM and all cells should be quoted. Then it works in:
    // *. LibreOffice (which actually happily eats any compliant CSV file);
    // *. Excel Online
    // *. Google Docs
    // *. (untested) Excel for Mac
    // I'd like the reader to think long and hard about benefits of open standards and avoidance of vendor lock-ins right here, right now.
    try {
      let data: ICommonUserViewData;
      if (this.uv.rowLoadState.complete) {
        data = this.uv;
      } else {
        const fetched = await fetchUserViewData(this.$store, this.uv.args, csvExportOpts);
        // Always a full user view with rows.
        if (!fetched.complete) {
          throw new Error("Too many entries to export");
        }
        convertParsedRows(fetched.info, fetched.rows!);
        data = fetched;
      }

      let output = "";

      data.info.columns.forEach((col, index) => {
        const csvColumnNameRaw = data.columnAttributes[index]["csv_column_name"] ?? data.attributes["csv_column_name"];
        const csvColumnName = typeof csvColumnNameRaw === "string" ? csvColumnNameRaw : null;
        output += csvCell(csvColumnName ?? col.name);
        if (index < data.info.columns.length - 1) {
          output += csvSeparator;
        }
      });
      output += "\n";

      data.rows!.forEach(row => {
        row.values.forEach((cell, colI) => {
          const info = this.uv.info.columns[colI];
          // This makes export non-reversible, because we don't export reference IDs. Some clients ask for main fields in these columns though.
          const value = cell.pun !== undefined ? valueToText(info.punType!, cell.pun) : valueToText(info.valueType, cell.value);
          output += csvCell(value);
          if (colI < row.values.length - 1) {
            output += csvSeparator;
          }
        });
        output += "\n";
      });

      const title = userViewTitle(this.uv) ?? "unnamed";
      const bom = getBOM("le");
      const encoded = [bom, encodeUTF16LE(output)];
      saveToFile(`${title}.csv`, encoded, { type: "text/csv;charset=utf-16le" });
    } catch (e) {
      this.setError({ key: "export_csv", error: e.message });
      throw e;
    }
  }

  private async importFromCsv(file: File) {
    // @ts-ignore
    const Papa = await import("papaparse");
    const streaming = Boolean(this.uv.attributes["csv_import_streaming"]);
    const skipEmptyRows = Boolean(this.uv.attributes["csv_import_skip_empty_rows"] ?? true);

    const entityRef = this.uv.info.mainEntity!;
    const emptyRow = Object.fromEntries(mapMaybe((value, colI) => {
      if (value.value === undefined || value.value === null) {
        return undefined;
      }
      const col = this.uv.info.columns[colI];
      return [col.mainField!.name, value.value];
    }, this.uv.emptyRow!.values));
    const columnNames = Object.fromEntries(mapMaybe((info, colI) => {
      if (!info.mainField) {
        return undefined;
      }

      const csvColumnNameRaw = this.uv.columnAttributes[colI]?.["csv_column_name"];
      const csvColumnName = typeof csvColumnNameRaw === "string" ? csvColumnNameRaw : null;
      const csvImportColumnRaw = this.uv.columnAttributes[colI]?.["csv_import_column"]; // Deprecated attribute.
      const csvImportColumn = typeof csvImportColumnRaw === "string" ? csvImportColumnRaw : null;

      const columnName = csvImportColumn ?? csvColumnName ?? info.name;
      const mainField = {
        name: info.mainField.name,
        field: {
          fieldType: info.mainField.field.fieldType,
          isNullable: info.mainField.field.isNullable || info.mainField.field.defaultValue !== undefined,
        },
      };
      return [columnName, mainField];
    }, this.uv.info.columns));

    const maxTries = streaming ? 3 : 1;
    let submittedCount = 0;
    let operations: IInsertEntityOp[] = [];
    let previousSubmit: Promise<void> = Promise.resolve();

    const submitOperations = () => {
      const currentOperations = operations;
      operations = [];
      const prev = previousSubmit;
      previousSubmit = (async () => {
        await prev;
        if (currentOperations.length === 0) {
          return;
        }

        try {
          const transaction: ITransaction = {
            operations: currentOperations,
          };
          let currentTry = 1;
          while (true) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await this.callProtectedApi({
                func: Api.runTransaction,
                args: [transaction],
              });
              break;
            } catch (e) {
              if (e instanceof FunDBError && (e.name === "concurrent_update" || e.name === "network_failure") && currentTry < maxTries) {
                currentTry++;
              } else {
                throw e;
              }
            }
          }
          submittedCount += currentOperations.length;
        } catch (e) {
          const suffix = submittedCount > 0 ? ` (imported ${submittedCount} rows)` : "";
          this.setError({ key: "import_csv", error: e.message + suffix });
          throw e;
        }
      })();
      return previousSubmit;
    };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      step: (rawRow: { data: Record<string, string> }) => {
        try {
          if (skipEmptyRows && Object.values(rawRow.data).every(x => x === "")) {
            return;
          }
          const row = { ...emptyRow };
          for (const [columnName, rawValue] of Object.entries(rawRow.data)) {
            const mainField = columnNames[columnName];
            if (mainField) {
              const value = valueFromRaw(mainField.field, rawValue);
              if (value === undefined) {
                throw new Error(`Failed to validate value "${rawValue}" for field ${mainField.name} at row ${operations.length + 1}`);
              }
              if (value !== null) {
                row[mainField.name] = serializeValue(mainField.field.fieldType, value);
              }
            }
          }
          operations.push({
            type: "insert",
            entity: entityRef,
            entries: row,
          });
        } catch (e) {
          this.setError({ key: "import_csv", error: e.message });
          throw e;
        }
        if (streaming && operations.length >= csvImportChunk) {
          void submitOperations();
        }
      },
      complete: async () => {
        await submitOperations();
        await this.reload();
      },
    });
  }

  private get loadedRowsCount(): string {
    return `${this.uv.rowLoadState.fetchedRowCount}${this.uv.rowLoadState.complete ? "" : "+"}`;
  }

  private get selectedRowIds(): any[] | null {
    const columnIndex = this.uv.columnAttributes.findIndex(attributes => attributes["entry_id"]);

    if (columnIndex === -1 && this.uv.info.mainEntity) {
      const rows = this.uv.extra.selectedRows.keys().map((rowRef: RowRef) => this.uv.getRowByRef(rowRef));
      const ids = mapMaybe(row => (row as any)?.mainId ?? undefined, rows); // mainId is guaranteed to exist here.
      return ids;
    }

    if (columnIndex !== -1) {
      const rows = this.uv.extra.selectedRows.keys().map((rowRef: RowRef) => this.uv.getRowByRef(rowRef));
      const ids = rows.map(row => row?.values[columnIndex].value);
      return ids;
    }

    return null;
  }

  get attrButtons(): Button[] {
    const opts: IAttrToLinkOpts = {
      homeSchema: this.uv.homeSchema ?? undefined,
      defaultActionArgs: { ids: this.selectedRowIds ?? undefined },
    };

    const panelButtons = this.uv.attributes["panel_buttons"]; // Will be deleted
    const buttons = this.uv.attributes["buttons"];
    if (panelButtons) {
      console.warn("@panel_buttons attribute deprecated,  will be deleted future.");
      return attrToButtonsOld(panelButtons, opts); // Will be deleted
    } else {
      return attrToButtons(buttons, opts);
    }
  }

  get buttons() {
    return [...this.staticButtons, ...this.attrButtons.filter(button => button.display !== "selection_panel" && button.display !== "selectionPanel")];
  }

  @Watch("buttons", { deep: true, immediate: true })
  private pushButtons() {
    this.$emit("update:buttons", this.buttons);
  }

  /**
   * Return true if `hide_default_actions` attribute is not set
   * @return {boolean} Allow showing default actions (edit, import from csv, etc.)
   */
  get showDefaultActions() {
    return !(this.uv.attributes["hide_default_actions"] === true);
  }

  get staticButtons(): Button[] {
    const extraActions = this.uv.attributes["extra_actions"];
    const extraActionsButtons = attrToButtonsOld(extraActions).map(button => ({ ...button, display: undefined }));
    if (extraActionsButtons.length > 0) {
      console.warn("@extra_actions attribute deprecated,  will be deleted future.");
    }
    const buttons: Button[] = extraActionsButtons;

    if (this.creationButtons) {
      buttons.push({
        icon: "add",
        caption: this.$t("create").toString(),
        buttons: this.creationButtons,
        type: "button-group",
        variant: bootstrapVariantAttribute("success"),
      });
    } else if (this.creationLink) {
      buttons.push({
        icon: "add",
        caption: this.$t("create").toString(),
        link: this.creationLink,
        type: "link",
        variant: bootstrapVariantAttribute("success"),
      });
    }

    const modalReferenceField = this.modalReferenceField;
    if (modalReferenceField) {
      buttons.push({
        caption: this.$t("create_in_modal").toString(),
        callback: () => {
          this.modalView = modalReferenceField.uv;
        },
        type: "callback",
        variant: defaultVariantAttribute,
      });
    }

    if (typeof this.uv.info.mainEntity === "object" && this.showDefaultActions) {
      buttons.push({
        icon: "file_upload",
        caption: this.$t("import_from_csv").toString(),
        uploadFile: file => this.importFromCsv(file),
        type: "upload-file",
        variant: defaultVariantAttribute,
      });
    }

    // FIXME: workaround until we have proper role-based permissions for this.
    if (this.uv.rows !== null && (this.uv.attributes["export_to_csv"] || "__export_to_csv" in this.$route.query)) {
      buttons.push({
        icon: "file_download",
        caption: this.$t("export_to_csv").toString(),
        callback: () => this.exportToCsv(),
        type: "callback",
        variant: defaultVariantAttribute,
      });
    }

    if (this.selectedQRCodeReference !== null && this.qrCodeButton) {
      buttons.push({
        icon: this.qrCodeButton.icon,
        caption: this.qrCodeButton.caption,
        display: this.qrCodeButton.display,
        tooltip: this.qrCodeButton.tooltip,
        variant: this.qrCodeButton.variant,
        callback: () => {
          this.openQRCodeScanner = !this.openQRCodeScanner;
        },
        type: "callback",
      });
    }

    if (this.selectedBarCodeReference !== null && this.barCodeButton) {
      buttons.push({
        icon: this.barCodeButton.icon,
        caption: this.barCodeButton.caption,
        display: this.barCodeButton.display,
        tooltip: this.barCodeButton.tooltip,
        variant: this.barCodeButton.variant,
        callback: () => {
          this.openBarCodeScanner = !this.openBarCodeScanner;
        },
        type: "callback",
      });
    }

    return buttons;
  }

  get selectionButtons() {
    const buttons = this.attrButtons.filter(button => button.display === "selection_panel" || button.display === "selectionPanel");

    if (this.showDeleteEntiesButton) {
      buttons.push(
        {
          icon: "delete_sweep",
          caption: this.$t("remove_selected_rows").toString(),
          callback: () => this.removeSelectedRows(),
          variant: bootstrapVariantAttribute("danger"),
          type: "callback",
        },
      );
    }
    return buttons;
  }

  private removeSelectedRows() {
    this.uv.extra.selectedRows.keys().forEach(rowRef => this.deleteRow(rowRef));
  }

  // Used to create referenced entries and automatically insert them into current table.
  get modalReferenceField(): IModalReferenceField | null {
    const modalReferenceField = mapMaybe((column, columnIndex): IModalReferenceField | undefined => {
      const getColumnAttr = (name: string) => tryDicts(name, this.uv.columnAttributes[columnIndex], this.uv.attributes);
      const referenceViewAttr = Boolean(getColumnAttr("main_reference_field"));
      const referenceUV = attrToQuery(getColumnAttr("select_view"));
      const fieldType = this.uv.info.columns[columnIndex].mainField?.field.fieldType;
      if (referenceUV && referenceViewAttr && fieldType !== undefined && fieldType.type === "reference") {
        return {
          field: { type: "new", column: columnIndex },
          uv: referenceUV,
          entity: fieldType.entity,
        };
      }
      return undefined;
    }, this.uv.columnAttributes);
    return modalReferenceField.pop() ?? null;
  }

  private selectFromUserView(id: number) {
    if (this.modalReferenceField === null) {
      throw new Error("Impossible");
    }

    void this.updateValue(this.modalReferenceField.field, id);
    this.modalView = null;
  }

  private selectFromScanner(columnIndex: number, result: IQRResultContent[]) {
    result.forEach(r => {
      void this.updateValue({ type: "new", column: columnIndex }, r.id);
    });
  }

  get barCodeButton() {
    if (this.barCodeColumnIndex === null) return null;

    return attrToButton(this.uv.columnAttributes[this.barCodeColumnIndex]["barcode_text_input"], undefined, true);
  }

  get qrCodeButton() {
    if (this.qrCodeColumnIndex === null) return null;

    return attrToButton(this.uv.columnAttributes[this.qrCodeColumnIndex]["barcode_camera_input"], undefined, true);
  }

  get barCodeColumnIndex() {
    const ret = this.uv.columnAttributes.findIndex(attrs => attrs["barcode_text_input"]);
    if (ret === -1) {
      return null;
    } else {
      return ret;
    }
  }

  get qrCodeColumnIndex() {
    const ret = this.uv.columnAttributes.findIndex(attrs => attrs["barcode_camera_input"]);
    if (ret === -1) {
      return null;
    } else {
      return ret;
    }
  }

  get selectedBarCodeReference() {
    if (this.barCodeColumnIndex === null) {
      return null;
    }
    return getReferenceInfo(this.uv, this.barCodeColumnIndex, null);
  }

  get selectedQRCodeReference() {
    if (this.qrCodeColumnIndex === null) {
      return null;
    }
    return getReferenceInfo(this.uv, this.qrCodeColumnIndex, null);
  }

  private makeToast(message: string) {
    this.$bvToast.toast(message, {
      title: this.$t("error").toString(),
      variant: "danger",
      solid: true,
    });
  }
}
</script>

<style lang="scss" scoped>
  .selection-buttons-wrapper {
    position: fixed;
    bottom: 3rem;
    left: 50%;
    transform: translate(-50%, 0);
    padding: 0.5rem;
    background-color: #000a;
    border-radius: 0.5rem;
    z-index: 1000;

    .selection-buttons-label {
      padding: 0.5rem;
      padding-top: 0;
      text-align: center;
      color: white;
    }

    ::v-deep {
      .buttons-panel {
        gap: 0.5rem;
      }
    }
  }

  .fade-transform-enter-active,
  .fade-transform-leave-active {
    transition: opacity 0.4s, transform 0.4s, $color-transition;
  }

  .fade-transform-enter,
  .fade-transform-leave-to {
    opacity: 0;
    transform: translate(-50%, 1rem);
  }
</style>
