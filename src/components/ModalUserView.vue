<i18n>
    {
        "en": {
            "new_entry": "New entry",
            "error": "Error",
            "saved": "All changes saved",
            "show_errors": "Show errors",
            "staging_error": "Error while submitting changes: {msg}",
            "save_scoped": "Save scoped",
            "save_and_select_scoped": "Save and select"
        },
        "ru": {
            "new_entry": "Новая запись",
            "error": "Ошибка",
            "saved": "Все изменения сохранены",
            "show_errors": "Показать ошибки",
            "staging_error": "Ошибка сохранения изменений: {msg}",
            "save_scoped": "Сохранить вложенное",
            "save_and_select_scoped": "Сохранить и выбрать"
        }
    }
</i18n>

<template>
  <ModalPortal
    to="tabbed-modal"
    :autofocus="autofocus"
    :view="view"
    @close="$emit('close')"
    @go-back-window="$emit('go-back-window')"
  >
    <template #header>
      <HeaderPanel
        :title="titleOrNewEntry"
        :buttons="buttons"
        :is-enable-filter="enableFilter"
        :filter-string="filterString"
        :view="view"
        :is-loading="isUserViewLoading"
        @update:filterString="filterString = $event"
        @goto="$emit('goto', $event)"
      />
    </template>

    <section class="section-modal">
      <div class="view-container">
        <UserView
          :is-root="isRoot"
          :args="view.args"
          :default-values="view.defaultValues"
          :selection-mode="selectionMode"
          :scope="uid"
          :filter="filterWords"
          :filter-string="filterString"
          @update:buttons="buttons = $event"
          @update:enableFilter="enableFilter = $event"
          @update:isLoading="isUserViewLoading = $event"
          @update:title="title = $event"
          @goto="$emit('goto', $event)"
          @goto-previous="$emit('goto-previous')"
          @select="$emit('select', $event)"
        />
      </div>
    </section>
  </ModalPortal>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { namespace } from "vuex-class";

import type { IQuery } from "@/state/query";
import { queryLocation } from "@/state/query";
import { CombinedTransactionResult, CurrentChanges, ScopeName } from "@/state/staging_changes";
import ModalPortal from "@/components/modal/ModalPortal";
import { router } from "@/modules";
import type { Button } from "@/components/buttons/buttons";
import HeaderPanel from "@/components/panels/HeaderPanel.vue";
import { convertToWords } from "@/utils";
import { ErrorKey } from "@/state/errors";
import { ISelectionRef } from "./BaseUserView";

const staging = namespace("staging");
const errors = namespace("errors");
const auth = namespace("auth");

@Component({ components: { ModalPortal, HeaderPanel } })
export default class ModalUserView extends Vue {
  @auth.State("protectedCalls") protectedCalls!: number;
  @staging.State("current") changes!: CurrentChanges;
  @staging.Action("submit") submitChanges!: (_: { scope?: ScopeName; preReload?: () => Promise<void>; errorOnIncomplete?: boolean }) => Promise<CombinedTransactionResult[]>;
  @staging.Action("clearAdded") clearAdded!: (_: { scope?: ScopeName; onlyUntouched?: boolean }) => Promise<void>;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;
  @Prop({ type: Boolean, default: false }) isRoot!: boolean;
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
  @Prop({ type: Object, required: true }) view!: IQuery;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;

  private title = "";
  private buttons: Button[] = [];

  private enableFilter = false;
  private filterString = "";
  private isUserViewLoading = false;

  private savedRecently: { show: boolean; timeoutId: NodeJS.Timeout | null } = {
    show: false,
    timeoutId: null,
  };

  private get isSaving(): boolean {
    return this.protectedCalls > 0;
  }

  get errors() {
    return Object.entries(this.rawErrors).flatMap(([key, keyErrors]) => keyErrors.map(error => {
      return this.$t(`${key}_error`, { msg: error });
    }));
  }

  private makeErrorToast() {
    this.$bvToast.hide();
    this.errors.forEach(error => {
      this.$bvToast.toast(error.toString(), {
        title: this.$t("error").toString(),
        variant: "danger",
        solid: true,
        autoHideDelay: 10000,
      });
    });
  }

  private get titleOrNewEntry() {
    const isNewEntry = this.view.args.args === null;
    return isNewEntry ? this.$t("new_entry").toString() : this.title;
  }

  get filterWords() {
    const value = this.filterString;
    if (value !== "") {
      return Array.from(new Set(convertToWords(value.toString())));
    }
    return [];
  }

  private openFullscreen() {
    void router.push(queryLocation(this.view));
  }

  saveViewIfChanged() {
    if (!this.changes.isScopeEmpty(this.uid)) {
      void this.saveView();
      return true;
    }
    return false;
  }

  private async saveView() {
    const ops = await this.submitChanges({ scope: this.uid, errorOnIncomplete: true });
    if (ops.length === 1) {
      const op = ops[0];
      if (op.type === "insert") {
        this.$emit("select", {
          entity: op.entity,
          id: op.id,
        } as ISelectionRef);
      }
    }

    if (this.errors.length === 0) {
      this.$bvToast.hide();
    }

    if (this.savedRecently.timeoutId !== null) {
      clearTimeout(this.savedRecently.timeoutId);
    }
    this.savedRecently.show = true;
    this.savedRecently.timeoutId = setTimeout(() => {
      this.savedRecently.show = false;
    }, 5000);
  }

  private destroyed() {
    void this.clearAdded({ scope: this.uid });
  }
}
</script>

<style lang="scss" scoped>
  .section-modal {
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .view-container {
    overflow: auto;
    height: 100%;
  }

  .fullscreen-button {
    cursor: pointer;
  }

  .save-cluster {
    position: absolute;
    bottom: 2rem;
    right: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1000;

    &.is-mobile {
      bottom: 1rem;
      right: 1rem;
    }
  }

  .save-cluster-button {
    height: 4rem;
    width: 4rem;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
  }

  .save-cluster-indicator {
    height: 4rem;
    width: 4rem;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    color: var(--default-backgroundDarker2Color);
  }

  .show-errors-button {
    height: 3rem;
    width: 3rem;
    margin-bottom: 0.5rem;
    background-color: #dc354533;
    color: #dc3545cc;
  }

  .save-button {
    color: var(--StateTextColor);

    &.save {
      background-color: #97d777;
    }
  }

  .saving-spinner {
    height: 4rem;
    width: 4rem;
    border-color: #97d777;
    border-right-color: transparent;
    border-width: 0.5rem;
    opacity: 0.5;
  }
</style>
