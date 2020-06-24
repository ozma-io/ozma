<i18n>
    {
        "en": {
            "create": "Create new",
            "create_in_modal": "Create referenced in modal window"
        },
        "ru": {
            "create": "Создать новую",
            "create_in_modal": "Создать связанную запись в окне"
        }
    }
</i18n>

<template>
  <span>
    <ModalUserView
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
import * as R from "ramda";

import BaseUserView from "@/components/BaseUserView";
import { LocalUserView } from "@/local_user_view";
import { IAttrToQueryOpts, attrToQuery, IQuery } from "@/state/query";
import { ValueRef } from "@/local_user_view";
import { homeSchema } from "@/state/user_view";
import { funappSchema, IEntityRef } from "@/api";
import ModalUserView from "@/components/ModalUserView.vue";
import { mapMaybe } from "@/utils";
import { IAction } from "@/components/ActionsMenu.vue";

interface IModalReferenceField {
  field: ValueRef;
  uv: IQuery;
  entity: IEntityRef;
}

@Component({ components: { ModalUserView } })
export default class UserViewCommon extends mixins<BaseUserView<LocalUserView<null, null, null>, null, null, null>>(BaseUserView) {
  modalView: IQuery | null = null;

  get createView() {
    const opts: IAttrToQueryOpts = {
      infoByDefault: true,
    };
    const home = homeSchema(this.uv.args);
    if (home !== null) {
      opts.homeSchema = home;
    }
    return attrToQuery(this.uv.attributes["create_view"], opts);
  }

  get actions() {
    const actions: IAction[] = [];
    const extraActions = this.uv.attributes["extra_actions"];
    if (Array.isArray(extraActions)) {
      const opts: IAttrToQueryOpts = {};
      const home = homeSchema(this.uv.args);
      if (home !== null) {
        opts.homeSchema = home;
      }
      extraActions.forEach((action: any) => {
        const querySelf = attrToQuery(action, opts);
        if (action.name && querySelf) {
          actions.push({
            name: String(action.name),
            query: querySelf,
          });
        }
      });
    }
    if (this.createView !== null) {
      actions.push({ name: this.$t("create").toString(), query: this.createView });
    }
    const modalReferenceField = this.modalReferenceField;
    if (modalReferenceField) {
      actions.push({ name: this.$t("create_in_modal").toString(), callback: () => this.modalView = modalReferenceField.uv });
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
