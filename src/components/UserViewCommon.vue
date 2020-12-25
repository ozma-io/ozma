<i18n>
    {
        "en": {
            "create": "Create new entry",
            "create_in_modal": "Create referenced entry in modal window",
            "export_to_csv": "Export to .csv",
            "import_from_csv": "Import from .csv",
            "scan_qrcode": "Scan QR Code",
            "qrcode_error_not_attr":"Adding data error! Check for the @input_from_qrcode attribute.",
            "qrcode_error_not_ref":"Adding data error! Make sure that the field you fill out is a link to a table:",
            "scan_barcode": "Scan Bar Code",
            "error": "Error"
        },
        "ru": {
            "create": "Создать новую запись",
            "create_in_modal": "Создать связанную запись в окне",
            "export_to_csv": "Экспорт в .csv",
            "import_from_csv": "Импорт из .csv",
            "scan_qrcode": "QR Code сканер",
            "qrcode_error_not_attr":"Ошибка добавления данных! Проверьте наличие атрибута @input_from_qrcode.",
            "qrcode_error_not_ref":"Ошибка добавления данных! Убедитесь что заполняемое поле является ссылкой на таблицу:",
            "scan_barcode": "Сканер штрих-кодов",
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
      @select="selectFromUserView($event)"
      @close="modalView = null"
    />
    <QRCodeScanner
      :open-scanner="openQRCodeScanner"
      :multi-scan="true"
      :link="currentQRCodeLink"
      @select="selectFromQRScanner($event)"
    />
    <BarCodeScanner
      :open-scanner="openBarCodeScanner"
      @select="selectFromBarScanner($event)"
    />
  </span>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { namespace } from "vuex-class";
import * as R from "ramda";

import BaseUserView from "@/components/BaseUserView";
import { LocalUserView, ValueRef } from "@/local_user_view";
import { IAttrToQueryOpts, attrToQuery, IQuery } from "@/state/query";

import { homeSchema, valueToPunnedText, currentValue } from "@/state/user_view";
import { funappSchema, IEntityRef, IFieldRef } from "@/api";
import SelectUserView from "@/components/SelectUserView.vue";
import { mapMaybe, saveToFile, tryDicts } from "@/utils";
import { Action } from "@/components/ActionsMenu.vue";
import { IPanelButton } from "@/components/ButtonsPanel.vue";
import { ScopeName, UserViewKey, IAddedResult, AddedRowId } from "@/state/staging_changes";
import { attrToLink, Link } from "@/links";
import QRCodeScanner, { IQRResultContent } from "@/components/qrcode/QRCodeScanner.vue";
import BarCodeScanner from "@/components/barcode/BarCodeScanner.vue";

interface IModalReferenceField {
  field: ValueRef;
  uv: IQuery;
  entity: IEntityRef;
}

interface IQRCodeReferenceField {
  field: ValueRef;
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

const staging = namespace("staging");

@Component({ components: { SelectUserView, QRCodeScanner, BarCodeScanner } })
export default class UserViewCommon extends mixins<BaseUserView<LocalUserView<undefined, undefined, undefined>, undefined, undefined, undefined>>(BaseUserView) {
  @staging.Action("addEntry") addEntry!: (args: { scope: ScopeName; entityRef: IEntityRef; userView: UserViewKey; position?: number }) => Promise<IAddedResult>;
  @staging.Action("setAddedField") setAddedField!: (args: { scope: ScopeName; fieldRef: IFieldRef; userView: UserViewKey; id: AddedRowId; value: unknown }) => Promise<void>;

  modalView: IQuery | null = null;
  openQRCodeScanner = false;
  openBarCodeScanner = false;
  currentQRCodeLink: Link | null = null;

  get createView() {
    const opts: IAttrToQueryOpts = {
      infoByDefault: true,
    };
    const home = homeSchema(this.uv.args);
    if (home !== null) {
      opts.homeSchema = home;
    }

    return attrToLink(this.uv.attributes["create_link"], opts);
  }

  private exportToCsv() {
    let data = "";
    this.uv.info.columns.forEach(col => {
      data += csvCell(col.name);
    });
    data += "\n";
    this.uv.newRowsPositions.forEach(rowId => {
      const row = this.uv.newRows[rowId];
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

    saveToFile(`${this.uv.name}.csv`, "text/csv", data);
  }

  private async importFromCsv(file: File) {
    // @ts-ignore
    const Papa = await import("papaparse");

    const info = this.uv.info;
    const entityRef = info.mainEntity!;
    const userView = this.uv.userViewKey;
    Papa.parse(file, {
      worker: true,
      header: true,
      skipEmptyLines: true,
      step: async (rawRow: { data: Record<string, string> }) => {
        const added = await this.addEntry({
          scope: this.scope,
          entityRef,
          userView,
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
              scope: this.scope,
              fieldRef: {
                entity: entityRef,
                name: columnInfo.mainField.name,
              },
              userView,
              id: added.id,
              value: currValue,
            });
          } else {
            return Promise.resolve();
          }
        }));
      },
    });
  }

  get panelButtons(): IPanelButton[] {
    const panelButtons = this.uv.attributes["panel_buttons"];

    if (!Array.isArray(panelButtons)) {
      return [];
    }

    return mapMaybe((rawButton: unknown) => {
      if (typeof rawButton !== "object" || rawButton === null) {
        return undefined;
      }
      const buttonObj = rawButton as Record<string, unknown>;

      if (!Array.isArray(buttonObj.actions)) {
        return undefined;
      }
      if (typeof buttonObj.name !== "string") {
        return undefined;
      }
      const buttonIcon = typeof buttonObj.icon === "string" ? buttonObj.icon : undefined;

      const opts: IAttrToQueryOpts = {};
      const home = homeSchema(this.uv.args);
      if (home !== null) {
        opts.homeSchema = home;
      }
      const actions = mapMaybe((rawAction: unknown) => {
        const link = attrToLink(rawAction, opts);
        if (link === null) {
          return undefined;
        }
        // `rawAction` at this point is guaranteed to be `Record<string, unknown>`,
        // but TypeScript doesn't support advanced type witnesses like that.
        const actionObj = rawAction as Record<string, unknown>;
        if (typeof actionObj.name !== "string") {
          return undefined;
        }
        const icon = typeof actionObj.icon === "string" ? actionObj.icon : undefined;

        return {
          icon,
          name: actionObj.name,
          link,
        };
      }, buttonObj.actions);
      return {
        icon: buttonIcon,
        name: buttonObj.name,
        actions,
      };
    }, panelButtons);
  }

  @Watch("panelButtons", { deep: true, immediate: true })
  private pushPanelButtons() {
    this.$emit("update:panelButtons", this.panelButtons);
  }

  /**
   * Return true if `hide_default_actions` attribute is not set
   * @return {boolean} Allow showing default actions (edit, import from csv, etc.)
   */
  get showDefaultActions() {
    return !(this.uv.attributes["hide_default_actions"] === true);
  }

  get actions() {
    const actions: Action[] = [];

    const extraActions = this.uv.attributes["extra_actions"];
    if (Array.isArray(extraActions)) {
      const opts: IAttrToQueryOpts = {};
      const home = homeSchema(this.uv.args);
      if (home !== null) {
        opts.homeSchema = home;
      }
      extraActions.forEach((rawAction: unknown) => {
        const link = attrToLink(rawAction, opts);
        if (link === null) {
          return;
        }
        // `rawAction` at this point is guaranteed to be `Record<string, unknown>`,
        // but TypeScript doesn't support advanced type witnesses like that.
        const actionObj = rawAction as Record<string, unknown>;
        if (typeof actionObj.name !== "string") {
          return;
        }

        const icon = typeof actionObj.icon === "string" ? actionObj.icon : undefined;
        actions.push({
          icon,
          name: actionObj.name,
          order: -10,
          link,
        });
      });
    }

    const qrcodeActions = this.uv.attributes["qrcode_actions"];
    if (Array.isArray(qrcodeActions)) {
      const opts: IAttrToQueryOpts = {};
      const home = homeSchema(this.uv.args);
      if (home !== null) {
        opts.homeSchema = home;
      }
      qrcodeActions.forEach((rawAction: unknown) => {
        const link = attrToLink(rawAction, opts);
        if (link === null) {
          return;
        }
        // `rawAction` at this point is guaranteed to be `Record<string, unknown>`,
        // but TypeScript doesn't support advanced type witnesses like that.
        const actionObj = rawAction as Record<string, unknown>;
        if (typeof actionObj.name !== "string") {
          return;
        }
        actions.push({
          name: actionObj.name,
          callback: () => this.qrCodeCallback(link),
        });
      });
    }

    if (this.createView !== null) {
      actions.push({ name: this.$t("create").toString(), link: this.createView });
    }

    const modalReferenceField = this.modalReferenceField;
    if (modalReferenceField) {
      actions.push({
        name: this.$t("create_in_modal").toString(),
        callback: () => {
          this.modalView = modalReferenceField.uv;
        },
      });
    }

    if (typeof this.uv.info.mainEntity === "object" && this.showDefaultActions) {
      actions.push({
        icon: "import_export",
        name: this.$t("import_from_csv").toString(),
        uploadFile: file => this.importFromCsv(file),
      });
    }

    // FIXME: workaround until we have proper role-based permissions for this.
    if (this.uv.attributes["export_to_csv"] || "__export_to_csv" in this.$route.query) {
      actions.push({
        icon: "import_export",
        name: this.$t("export_to_csv").toString(),
        callback: () => this.exportToCsv(),
      });
    }

    if (this.uv.attributes["scan_qrcode"]) {
      actions.push({
        icon: "qr_code_2",
        name: this.$t("scan_qrcode").toString(),
        callback: () => {
          this.openQRCodeScanner = !this.openQRCodeScanner;
        },
      });
    }

    if (this.uv.attributes["scan_barcode"] === true) {
      actions.push({
        icon: "qr_code_scanner",
        name: this.$t("scan_barcode").toString(),
        callback: () => {
          this.openBarCodeScanner = !this.openBarCodeScanner;
        },
      });
    }

    return actions;
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

  @Watch("actions", { deep: true, immediate: true })
  private pushActions() {
    this.$emit("update:actions", this.actions);
  }

  private selectFromUserView(id: number) {
    if (this.modalReferenceField === null) {
      throw new Error("Impossible");
    }

    void this.updateValue(this.modalReferenceField.field, id);
    this.modalView = null;
  }

  get qrCodeReferenceField(): IQRCodeReferenceField | null {
    const qrCodeReferenceField = mapMaybe((column, columnIndex): IQRCodeReferenceField | undefined => {
      const getColumnAttr = (name: string) => tryDicts(name, this.uv.columnAttributes[columnIndex], this.uv.attributes);
      const inputFormQRCodeAttr = Boolean(getColumnAttr("input_from_qrcode"));
      const fieldType = this.uv.info.columns[columnIndex].mainField?.field.fieldType;
      if (inputFormQRCodeAttr && fieldType !== undefined && fieldType.type === "reference") {
        return {
          field: { type: "new", column: columnIndex },
          entity: fieldType.entity,
        };
      }
      return undefined;
    }, this.uv.columnAttributes);
    return qrCodeReferenceField.pop() || null;
  }

  private selectFromQRScanner(result: Array<IQRResultContent>) {
    result.forEach(r => {
      if (this.qrCodeReferenceField == null) {
        this.makeToast(this.$t("qrcode_error_not_attr").toString());
      } else if (this.qrCodeReferenceField.entity.schema === r.schema && this.qrCodeReferenceField.entity.name === r.name) {
        void this.updateValue(this.qrCodeReferenceField.field, r.id);
      } else {
        this.makeToast(this.$t("qrcode_error_not_ref").toString() + `{schema: ${r.schema}, name: ${r.name}}`);
      }
    });
  }

  private makeToast(message: string) {
    this.$bvToast.toast(message, {
      title: this.$t("error").toString(),
      variant: "danger",
      solid: true,
      noAutoHide: true,
    });
  }

  private selectFromBarScanner(result: Array<string>) {
    result.forEach(r => {
      void this.updateValue({ type: "new", column: 1 }, r);
    });
  }

  private qrCodeCallback(link: Link | null) {
    if (link !== null) {
      this.currentQRCodeLink = link;
      this.openQRCodeScanner = !this.openQRCodeScanner;
    }
  }
}
</script>
