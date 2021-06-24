<i18n>
    {
        "en": {
            "create": "Create new entry",
            "create_in_modal": "Create referenced entry in modal window",
            "export_to_csv": "Export to .csv",
            "import_from_csv": "Import from .csv",
            "selected_n_entries": "{n} entries selected",
            "remove_selected_rows": "Remove selected entries",
            "error": "Error"
        },
        "ru": {
            "create": "Создать новую запись",
            "create_in_modal": "Создать связанную запись в окне",
            "export_to_csv": "Экспорт в .csv",
            "import_from_csv": "Импорт из .csv",
            "selected_n_entries": "Выбрано {n} записей",
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
          {{ $t("selected_n_entries", { n: selectedLength }) }}
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
import { IEntityRef } from "ozma-api";

import { mapMaybe, saveToFile, tryDicts } from "@/utils";
import BaseUserView, { IBaseRowExtra, IBaseValueExtra, IBaseViewExtra, userViewTitle } from "@/components/BaseUserView";
import { attrToQuery, IQuery } from "@/state/query";
import SelectUserView from "@/components/SelectUserView.vue";
import type { IQRResultContent } from "@/components/qrcode/QRCodeScanner.vue";
import { RowRef, ValueRef, valueToPunnedText } from "@/user_views/combined";
import { getReferenceInfo } from "@/state/entries";
import { getColorVariables } from "@/utils_colors";

import { attrToButton, Button, attrToButtons, attrToButtonsOld } from "@/components/buttons/buttons";
import { IAttrToLinkOpts } from "@/links";

interface IModalReferenceField {
  field: ValueRef;
  uv: IQuery;
  entity: IEntityRef;
}

const csvCell = (str: string): string => {
  let csvstr = str.replace(/"/g, `""`);
  if (csvstr.search(/("|;|\n)/g) > 0) {
    csvstr = `"${csvstr}"`;
  }
  csvstr += ";";
  return csvstr;
};

@Component({
  components: {
    SelectUserView,
    QRCodeScanner: () => import("@/components/qrcode/QRCodeScanner.vue"),
  },
})
export default class UserViewCommon extends mixins<BaseUserView<IBaseValueExtra, IBaseRowExtra, IBaseViewExtra>>(BaseUserView) {
  modalView: IQuery | null = null;
  openQRCodeScanner = false;
  openBarCodeScanner = false;

  private exportToCsv() {
    let data = "";
    this.uv.info.columns.forEach((col, index) => {
      const csvColumnNameRaw = this.uv.columnAttributes[index]?.["csv_column_name"];
      const csvColumnName = typeof csvColumnNameRaw === "string" ? csvColumnNameRaw : null;
      data += csvCell(csvColumnName ?? col.name);
    });
    data += "\n";
    Object.values(this.uv.newRows).forEach(row => {
      row.values.forEach((cell, colI) => {
        const info = this.uv.info.columns[colI];
        data += csvCell(valueToPunnedText(info.valueType, cell));
      });
      data += "\n";
    });
    if (this.uv.rows !== null) {
      this.uv.rows.forEach(row => {
        row.values.forEach((cell, colI) => {
          const info = this.uv.info.columns[colI];
          data += csvCell(valueToPunnedText(info.valueType, cell));
        });
        data += "\n";
      });
    }

    const title = userViewTitle(this.uv) ?? "unnamed";
    saveToFile(`${title}.csv`, "text/csv", data);
  }

  private async importFromCsv(file: File) {
    // @ts-ignore
    const Papa = await import("papaparse");

    const info = this.uv.info;
    const entityRef = info.mainEntity!;
    Papa.parse(file, {
      worker: true,
      header: true,
      skipEmptyLines: true,
      step: async (rawRow: { data: Record<string, string> }) => {
        const id = await this.addEntry({
          scope: this.scope,
          entityRef,
        });

        await Promise.all(this.uv.info.columns.map((columnInfo, index) => {
          const csvColumnNameRaw = this.uv.columnAttributes[index]?.["csv_column_name"];
          const csvColumnName = typeof csvColumnNameRaw === "string" ? csvColumnNameRaw : null;
          const csvImportColumnRaw = this.uv.columnAttributes[index]?.["csv_import_column"]; // Deprecated attribute.
          const csvImportColumn = typeof csvImportColumnRaw === "string" ? csvImportColumnRaw : null;

          const columnName = csvImportColumn ?? csvColumnName ?? columnInfo.name;
          const currValue = rawRow.data[columnName];
          if (columnInfo.mainField && currValue) {
            return this.setAddedField({
              fieldRef: {
                entity: entityRef,
                name: columnInfo.mainField.name,
              },
              id,
              value: currValue,
            });
          } else {
            return Promise.resolve();
          }
        }));
        this.uv.trackAddedEntry(id);
      },
    });
  }

  private get selectedRowIds(): number[] {
    if (this.uv.info.mainEntity === undefined) return [];

    const rows = this.uv.extra.selectedRows.keys().map((rowRef: RowRef) => this.uv.getRowByRef(rowRef));
    const ids = mapMaybe(row => (row as any)?.mainId ?? undefined, rows); // mainId is guaranteed to exist here.
    return ids;
  }

  get attrButtons(): Button[] {
    const opts: IAttrToLinkOpts = {
      homeSchema: this.uv.homeSchema ?? undefined,
      defaultActionArgs: { ids: this.selectedRowIds },
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
    return [...this.staticButtons, ...this.attrButtons.filter(button => button.display !== "selectionPanel")];
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

    if (this.creationLink !== null) {
      buttons.push({
        icon: "add",
        caption: this.$t("create").toString(),
        link: this.creationLink,
        type: "link",
        variant: "success",
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
      });
    }

    if (typeof this.uv.info.mainEntity === "object" && this.showDefaultActions) {
      buttons.push({
        icon: "file_upload",
        caption: this.$t("import_from_csv").toString(),
        uploadFile: file => this.importFromCsv(file),
        type: "upload-file",
      });
    }

    // FIXME: workaround until we have proper role-based permissions for this.
    if (this.uv.attributes["export_to_csv"] || "__export_to_csv" in this.$route.query) {
      buttons.push({
        icon: "file_download",
        caption: this.$t("export_to_csv").toString(),
        callback: () => this.exportToCsv(),
        type: "callback",
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
    const buttons = this.attrButtons.filter(button => button.display === "selectionPanel");

    if (this.uv.info.mainEntity) {
      buttons.push(
        {
          icon: "delete_sweep",
          caption: this.$t("remove_selected_rows").toString(),
          callback: () => this.removeSelectedRows(),
          variant: "danger",
          colorVariables: getColorVariables("button", "danger"),
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
    return modalReferenceField.pop() || null;
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
    background-color: #0007;
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

      button {
        width: 100%;
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
