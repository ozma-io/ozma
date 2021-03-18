<i18n>
    {
        "en": {
            "create": "Create new entry",
            "create_in_modal": "Create referenced entry in modal window",
            "export_to_csv": "Export to .csv",
            "import_from_csv": "Import from .csv",
            "scan_qrcode": "Scan QR code",
            "scan_barcode": "Scan bar code",
            "remove_selected_rows": "Remove selected entries",
            "error": "Error"
        },
        "ru": {
            "create": "Создать новую запись",
            "create_in_modal": "Создать связанную запись в окне",
            "export_to_csv": "Экспорт в .csv",
            "import_from_csv": "Импорт из .csv",
            "scan_qrcode": "Сканер QR-кодов",
            "scan_barcode": "Сканер штрих-кодов",
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
      v-if="selectedQRCodeEntity !== null"
      :open-scanner="openQRCodeScanner"
      :entity="selectedQRCodeEntity"
      multi-scan
      @select="selectFromScanner(qrCodeColumnIndex, $event)"
    />
    <QRCodeScanner
      v-if="selectedBarCodeEntity !== null"
      :open-scanner="openBarCodeScanner"
      :entity="selectedBarCodeEntity"
      multi-scan
      text-input
      @select="selectFromScanner(barCodeColumnIndex, $event)"
    />
  </span>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import * as R from "ramda";
import { IEntityRef } from "ozma-api";

import { mapMaybe, saveToFile, tryDicts } from "@/utils";
import BaseUserView, { IBaseRowExtra, IBaseValueExtra, IBaseViewExtra, userViewTitle } from "@/components/BaseUserView";
import { IAttrToQueryOpts, attrToQuery, IQuery } from "@/state/query";
import SelectUserView from "@/components/SelectUserView.vue";
import type { IQRResultContent } from "@/components/qrcode/QRCodeScanner.vue";
import { ValueRef, valueToPunnedText } from "@/user_views/combined";
import { referenceEntriesRef } from "@/state/entries";

import type { Button } from "@/components/buttons/buttons";
import { attrToButtons } from "@/components/buttons/buttons";

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
    this.uv.info.columns.forEach(col => {
      data += csvCell(col.name);
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
          const fallbackName: string | null = R.pathOr(
            null, [index, "csv_import_column"],
            this.uv.columnAttributes,
          );
          const columnName = fallbackName || columnInfo.name;
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

  get attrButtons(): Button[] {
    const buttons = this.uv.attributes["panel_buttons"];

    const opts: IAttrToQueryOpts = {
      homeSchema: this.uv.homeSchema ?? undefined,
    };

    return attrToButtons(buttons, opts);
  }

  get buttons() {
    return [...this.staticButtons, ...this.selectionButtons, ...this.attrButtons];
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
    const extraActionsButtons = attrToButtons(extraActions);
    if (extraActionsButtons.length > 0) {
      console.warn("@extra_actions attribute deprecated,  will be deleted future.");
    }
    const buttons: Button[] = extraActionsButtons;

    if (this.creationLink !== null) {
      buttons.push({
        icon: "add",
        name: this.$t("create").toString(),
        link: this.creationLink,
        type: "link",
        variant: "success",
      });
    }

    const modalReferenceField = this.modalReferenceField;
    if (modalReferenceField) {
      buttons.push({
        name: this.$t("create_in_modal").toString(),
        callback: () => {
          this.modalView = modalReferenceField.uv;
        },
        type: "callback",
      });
    }

    if (typeof this.uv.info.mainEntity === "object" && this.showDefaultActions) {
      buttons.push({
        icon: "import_export",
        name: this.$t("import_from_csv").toString(),
        uploadFile: file => this.importFromCsv(file),
        type: "upload-file",
      });
    }

    // FIXME: workaround until we have proper role-based permissions for this.
    if (this.uv.attributes["export_to_csv"] || "__export_to_csv" in this.$route.query) {
      buttons.push({
        icon: "import_export",
        name: this.$t("export_to_csv").toString(),
        callback: () => this.exportToCsv(),
        type: "callback",
      });
    }

    if (this.selectedQRCodeEntity !== null) {
      buttons.push({
        icon: "qr_code_2",
        name: this.$t("scan_qrcode").toString(),
        callback: () => {
          this.openQRCodeScanner = !this.openQRCodeScanner;
        },
        type: "callback",
      });
    }

    if (this.selectedBarCodeEntity !== null) {
      buttons.push({
        icon: "qr_code_scanner",
        name: this.$t("scan_barcode").toString(),
        callback: () => {
          this.openBarCodeScanner = !this.openBarCodeScanner;
        },
        type: "callback",
      });
    }

    return buttons;
  }

  get selectionButtons() {
    const buttons: Button[] = [];
    if (this.uv.info.mainEntity && this.uv.extra.selectedRows.length > 0) {
      buttons.push(
        {
          icon: "delete_sweep",
          name: this.$t("remove_selected_rows").toString(),
          callback: () => this.removeSelectedRows(),
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

  get barCodeColumnIndex() {
    const ret = this.uv.columnAttributes.findIndex(attrs => attrs["scan_barcode"]);
    if (ret === -1) {
      return null;
    } else {
      return ret;
    }
  }

  get qrCodeColumnIndex() {
    const ret = this.uv.columnAttributes.findIndex(attrs => attrs["scan_qrcode"]);
    if (ret === -1) {
      return null;
    } else {
      return ret;
    }
  }

  get selectedBarCodeEntity() {
    if (this.barCodeColumnIndex !== null) {
      const fieldType = this.uv.info.columns[this.barCodeColumnIndex].mainField?.field.fieldType;

      if (fieldType?.type === "reference") {
        return referenceEntriesRef(fieldType);
      }
    }
    return null;
  }

  get selectedQRCodeEntity() {
    if (this.qrCodeColumnIndex !== null) {
      const fieldType = this.uv.info.columns[this.qrCodeColumnIndex].mainField?.field.fieldType;

      if (fieldType?.type === "reference") {
        return referenceEntriesRef(fieldType);
      }
    }
    return null;
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
