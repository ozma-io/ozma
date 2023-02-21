<i18n>
    {
        "en": {
            "save_scoped": "Save scoped",
            "save_and_select_scoped": "Save and select"
        },
        "ru": {
            "save_scoped": "Сохранить вложенное",
            "save_and_select_scoped": "Сохранить и выбрать"
        },
        "es": {
            "save_scoped": "Guardar con ámbito",
            "save_and_select_scoped": "Guardar y seleccionar"
        }
    }
</i18n>

<template>
  <ModalUserView
    :selection-mode="selectEntity !== undefined"
    :view="currentView"
    :autofocus="autofocus"
    @close="closeView"
    @goto="goto"
    @select="selectFromView"
    @update:actions="$emit('update:actions', $event)"
  />
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { IEntityRef, IEntity } from "ozma-api";

import { inheritedFromEntity } from "@/values";
import type { IQuery } from "@/state/query";
import { ErrorKey } from "@/state/errors";
import { ISelectionRef } from "@/components/BaseUserView";
import ModalUserView from "@/components/ModalUserView.vue";
import type { ScopeName } from "@/state/staging_changes";

const entities = namespace("entities");
const staging = namespace("staging");
const errors = namespace("errors");

const errorKey = "modal_user_view";

@Component({ components: { ModalUserView } })
export default class SelectUserView extends Vue {
  @entities.Action("getEntity") getEntity!: (ref: IEntityRef) => Promise<IEntity>;
  @errors.Mutation("setError") setError!: (args: { key: ErrorKey; error: string }) => void;
  @errors.Mutation("resetErrors") resetErrors!: (key: ErrorKey) => void;
  @staging.Mutation("lockScope") lockScope!: (scope: ScopeName) => void;
  @staging.Mutation("unlockScope") unlockScope!: (scope: ScopeName) => void;
  @Prop({ type: Object }) selectEntity!: IEntityRef | undefined;
  @Prop({ type: Object, required: true }) initialView!: IQuery;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: String, required: true }) parentScope!: ScopeName;

  private currentView: IQuery = null as any;

  private created() {
    this.currentView = this.initialView;
    this.lockScope(this.parentScope);
  }

  private async selectFromView(selection: ISelectionRef) {
    if (this.selectEntity === undefined) {
      throw new Error("Impossible");
    }

    const entityInfo = await this.getEntity(this.selectEntity);
    if (!inheritedFromEntity(this.selectEntity, entityInfo, selection.entity)) {
      const message = "Entry from invalid entity selected";
      this.setError({ key: errorKey, error: message });
      throw new Error(message);
    } else {
      this.resetErrors(errorKey);
    }

    this.$emit("select", selection.id);
  }

  private closeView() {
    this.$emit("close");
  }

  private destroyed() {
    this.resetErrors(errorKey);
    this.unlockScope(this.parentScope);
  }

  private goto({ query }: { query: IQuery; replace?: boolean }) {
    this.currentView = query;
  }
}
</script>
