<i18n>
    {
        "en": {
            "save_scoped": "Save scoped",
            "save_and_select_scoped": "Save and select"
        },
        "ru": {
            "save_scoped": "Сохранить вложенное",
            "save_and_select_scoped": "Сохранить и выбрать"
        }
    }
</i18n>

<template>
  <ModalUserView
    :selection-mode="selectEntity !== undefined"
    :view="currentView"
    :autofocus="autofocus"
    @close="$emit('close')"
    @goto="goto"
    @select="selectFromView"
    @update:actions="$emit('update:actions', $event)"
  />
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { IEntityRef, IEntity } from "@/api";
import { equalEntityRef } from "@/values";
import type { IQuery } from "@/state/query";
import { ErrorKey } from "@/state/errors";
import { ISelectionRef } from "@/components/BaseUserView";
import ModalUserView from "@/components/ModalUserView.vue";

const entities = namespace("entities");
const errors = namespace("errors");

const errorKey = "modal_user_view";

@Component({ components: { ModalUserView } })
export default class SelectUserView extends Vue {
  @entities.Action("getEntity") getEntity!: (ref: IEntityRef) => Promise<IEntity>;
  @errors.Mutation("setError") setError!: (args: { key: ErrorKey; error: string }) => void;
  @errors.Mutation("resetErrors") resetErrors!: (key: ErrorKey) => void;
  @Prop({ type: Object }) selectEntity!: IEntityRef | undefined;
  @Prop({ type: Object, required: true }) initialView!: IQuery;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;

  private currentView: IQuery = this.initialView;

  private async selectFromView(selection: ISelectionRef) {
    if (this.selectEntity === undefined) {
      throw new Error("Impossible");
    }

    const entityInfo = await this.getEntity(this.selectEntity);
    if (!(equalEntityRef(this.selectEntity, selection.entity) || entityInfo.children.some(x => equalEntityRef(x.ref, selection.entity)))) {
      const message = "Entry from invalid entity selected";
      this.setError({ key: errorKey, error: message });
      throw new Error(message);
    } else {
      this.resetErrors(errorKey);
    }

    this.$emit("select", selection.id);
  }

  private destroyed() {
    this.resetErrors(errorKey);
  }

  private goto(query: IQuery) {
    this.currentView = query;
  }
}
</script>
