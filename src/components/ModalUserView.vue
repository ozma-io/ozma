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
  <ModalPortal
    to="tabbed-modal"
    :tab-name="title"
    :selected="selected"
    :view="view"
    @close="$emit('close')"
  >
    <template #actions-menu>
      <ActionsMenu
        title="view_headline"
        :actions="actions"
        menu-align="right"
        @goto="$emit('goto', $event)"
      />
    </template>

    <template #actions-right>
      <i
        class="material-icons modal__tab_fullscreen_button"
        @click.stop="openFullscreen"
      >fullscreen</i>
    </template>

    <section class="section-modal">
      <UserView
        :is-root="isRoot"
        :args="view.args"
        :default-values="view.defaultValues"
        :selection-mode="selectionMode"
        :scope="uid"
        @update:actions="extraActions = $event"
        @update:title="title = $event"
        @goto="$emit('goto', $event)"
        @select="$emit('select', $event)"
      />
      <div
        v-if="!changes.isScopeEmpty(uid)"
        class="selection_view_save__container"
      >
        <button
          type="button"
          class="selection_view_save__button"
          :title="$t(selectionMode ? 'save_and_select_scoped' : 'save_scoped')"
          @click="saveView"
        >
          <input
            type="button"
            class="material-icons"
            value="save"
          >
        </button>
      </div>
    </section>
  </ModalPortal>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { Action } from "@/components/ActionsMenu.vue";
import type { IQuery } from "@/state/query";
import { queryLocation } from "@/state/query";
import { CurrentChanges, ScopeName } from "@/state/staging_changes";
import ModalPortal from "@/components/modal/ModalPortal";
import { router } from "@/modules";

const staging = namespace("staging");

@Component({ components: { ModalPortal } })
export default class ModalUserView extends Vue {
  @staging.State("current") changes!: CurrentChanges;
  @staging.Action("submit") submitChanges!: (_: { scope?: ScopeName; preReload?: () => Promise<void> }) => Promise<void>;
  @staging.Action("removeScope") removeScope!: (scope: ScopeName) => Promise<void>;
  @Prop({ type: Boolean, default: false }) isRoot!: boolean;
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
  @Prop({ type: Object, required: true }) view!: IQuery;
  @Prop({ type: Boolean, default: false }) selected!: boolean;

  private title = "";
  private extraActions: Action[] = [];

  get actions() {
    const actions: Action[] = [];
    actions.push(...this.extraActions);
    return actions;
  }

  private openFullscreen() {
    router.push(queryLocation(this.view));
  }

  private async saveView() {
    await this.submitChanges({ scope: this.uid });
  }

  private destroyed() {
    this.removeScope(this.uid);
  }
}
</script>

<style lang="scss" scoped>
  .selection_view_save__container {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    position: sticky;
    bottom: 0;
    z-index: 1000;
    height: 50px;

    /* Ugly fix for ugly iOS, does not the best padding, but save button hides otherwise */
    padding-bottom: 50px;
  }

  .section-modal {
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .selection_view_save__button {
    height: fit-content;
    background-color: var(--WarningColor);
    color: var(--StateTextColor);
    padding: 5px;
    border-radius: 3px;
    animation: color-change-2x 2s linear infinite alternate both;
    display: flex;
    justify-content: center;
  }

  .selection_view_save__button > input {
    background: none;
    border: none;
    padding: 0 20px;
  }
</style>
