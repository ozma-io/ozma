<i18n>
    {
        "en": {
            "create": "Create new",
            "create_in_modal": "Create referenced in modal window",
            "export_to_csv": "Export to .csv",
            "import_from_csv": "Import from .csv"
        },
        "ru": {
            "create": "Создать новую",
            "create_in_modal": "Создать связанную запись в окне",
            "export_to_csv": "Экспорт в .csv",
            "import_from_csv": "Импорт из .csv"
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
  </span>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { namespace } from "vuex-class";
import * as R from "ramda";

import BaseUserView from "@/components/BaseUserView";
import { LocalUserView } from "@/local_user_view";
import { IAttrToQueryOpts, attrToQuery, IQuery } from "@/state/query";
import { ValueRef } from "@/local_user_view";
import { homeSchema, valueToPunnedText, currentValue } from "@/state/user_view";
import { funappSchema, IEntityRef, IFieldRef } from "@/api";
import SelectUserView from "@/components/SelectUserView.vue";
import { mapMaybe, saveToFile } from "@/utils";
import { Action } from "@/components/ActionsMenu.vue";
import { ScopeName, UserViewKey, IAddedResult, AddedRowId } from "@/state/staging_changes";
import { attrToLink } from "@/links";

interface IModalReferenceField {
  field: ValueRef;
  uv: IQuery;
  entity: IEntityRef;
}

const csvCell = (str: string): string => {
  let csvstr = str.replace(/"/g, '""');
  if (csvstr.search(/("|;|\n)/g) > 0) {
    csvstr = "\"" + csvstr + "\"";
  }
  csvstr += ";";
  return csvstr;
};

const staging = namespace("staging");

@Component({ components: { SelectUserView } })
export default class UserViewCommon extends mixins<BaseUserView<LocalUserView<undefined, undefined, undefined>, undefined, undefined, undefined>>(BaseUserView) {
  @staging.Action("addEntry") addEntry!: (args: { scope: ScopeName; entityRef: IEntityRef; userView: UserViewKey; position?: number }) => Promise<IAddedResult>;
  @staging.Action("setAddedField") setAddedField!: (args: { scope: ScopeName; fieldRef: IFieldRef; userView: UserViewKey; id: AddedRowId; value: any }) => Promise<void>;

  modalView: IQuery | null = null;

  get createView() {
    const opts: IAttrToQueryOpts = {
      infoByDefault: true,
    };
    const home = homeSchema(this.uv.args);
    if (home !== null) {
      opts.homeSchema = home;
    }
    return attrToLink(this.uv.attributes["create_view"], opts);
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
        data +- csvCell(valueToPunnedText(info.valueType, cell));
      });
      data += "\n";
    });
    if (this.uv.rows != null) {
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
      step: async (rawRow: any) => {
        const row = rawRow.data as Record<string, string>;
        const added = await this.addEntry({
          scope: this.scope,
          entityRef,
          userView,
        });

        await Promise.all(this.uv.info.columns.map((columnInfo, index) => {
          const fallbackName: string | null = R.pathOr(
            null, [index, 'csv_import_column'],
            this.uv.columnAttributes
          );
          const columnName = fallbackName || columnInfo.name;
          const currValue = row[columnName];
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
      }
    });
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
      extraActions.forEach((action: any) => {
        if (typeof action.name !== "string") {
          return;
        }
        const link = attrToLink(action, opts);
        if (link === null) {
          return;
        }
        actions.push({
          name: action.name,
          order: -10,
          link,
        });
      });
    }

    if (this.createView !== null) {
      actions.push({ name: this.$t("create").toString(), link: this.createView });
    }

    const modalReferenceField = this.modalReferenceField;
    if (modalReferenceField) {
      actions.push({ name: this.$t("create_in_modal").toString(), callback: () => this.modalView = modalReferenceField.uv });
    }

    if (this.uv.info.mainEntity != null) {
      actions.push({ name: this.$t("import_from_csv").toString(), uploadFile: (file) => this.importFromCsv(file) });
    }

    // FIXME: workaround until we have proper role-based permissions for this.
    if ("__export_to_csv" in this.$route.query) {
      actions.push({name: this.$t("export_to_csv").toString(), callback: () => this.exportToCsv()});
    }

    return actions;
  }

  // Used to create referenced entries and automatically insert them into current table.
  get modalReferenceField(): IModalReferenceField | null {
    const modalReferenceField = R.head(mapMaybe((column, columnIndex): IModalReferenceField | undefined => {
      const referenceViewAttr = Boolean(R.pathOr(false, ["columnAttributes", String(columnIndex), "main_reference_field"], this.uv));
      const selectViewAttr = R.pathOr(false, ["columnAttributes", String(columnIndex), "select_view"], this.uv);
      const referenceUV = attrToQuery(selectViewAttr);
      const entity = R.path<IEntityRef>(["info", "columns", String(columnIndex), "mainField", "field", "fieldType", "entity"], this.uv);
      if (referenceUV && entity && referenceViewAttr) {
        return {
          field: { type: "new", column: columnIndex },
          uv: referenceUV,
          entity,
        };
      }
      return undefined;
    }, this.uv.columnAttributes));

    return modalReferenceField || null;
  }

  @Watch("actions", { deep: true, immediate: true })
  private pushActions() {
    this.$emit("update:actions", this.actions);
  }

  private selectFromUserView(id: number) {
    if (this.modalReferenceField === null) {
      throw new Error("Impossible");
    }

    this.updateValue(this.modalReferenceField.field, id);
    this.modalView = null;
  }
}
</script>
