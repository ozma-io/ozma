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
        },
        "es": {
            "new_entry": "La nueva entrada",
            "error": "El error",
            "saved": "Todos los cambios están guardados",
            "show_errors": "Mostrar  los errores",
            "staging_error": "El error al enviar cambios: {msg}",
            "save_scoped": "Guardar con el ámbito",
            "save_and_select_scoped": "Guardar y seleccionar"
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
        :title="titleOrNewEntry ?? undefined"
        :buttons="buttons"
        :is-enable-filter="enableFilter"
        :filter-string="filterString"
        :view="view"
        :is-loading="isUserViewLoading"
        :type="'modal'"
        @update:filter-string="filterString = $event"
        @goto="$emit('goto', $event)"
      />
    </template>

    <section class="section-modal">
      <div
        class="view-container"
      >
        <UserView
          is-root
          in-container
          :args="view.args"
          :default-values="view.defaultValues"
          :selection-mode="selectionMode"
          :scope="uid"
          :filter="filterWords"
          :filter-string="filterString"
          @update:buttons="buttons = $event"
          @update:enable-filter="enableFilter = $event"
          @update:is-loading="isUserViewLoading = $event"
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
import { CurrentChanges, ISubmitResult, ScopeName } from "@/state/staging_changes";
import ModalPortal from "@/components/modal/ModalPortal";
import { router } from "@/modules";
import type { Button } from "@/components/buttons/buttons";
import HeaderPanel from "@/components/panels/HeaderPanel.vue";
import { convertToWords } from "@/utils";
import { ErrorKey } from "@/state/errors";
import { UserString } from "@/translations";

const staging = namespace("staging");
const errors = namespace("errors");
const auth = namespace("auth");

@Component({ components: { ModalPortal, HeaderPanel } })
export default class ModalUserView extends Vue {
  @auth.State("protectedCalls") protectedCalls!: number;
  @staging.State("current") changes!: CurrentChanges;
  @staging.Action("submit") submitChanges!: (_: { scope?: ScopeName; preReload?: () => Promise<void>; errorOnIncomplete?: boolean }) => Promise<ISubmitResult>;
  @staging.Action("clearAdded") clearAdded!: (_: { scope?: ScopeName; onlyUntouched?: boolean }) => Promise<void>;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
  @Prop({ type: Object, required: true }) view!: IQuery;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;

  private title: UserString | null = null;
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

  get titleOrNewEntry(): string | null {
    if (this.view.args.args === null) {
      return this.$t("new_entry").toString();
    } else {
      return this.title ? this.$ust(this.title) : null;
    }
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
    bottom: 1rem;
    right: 1rem;
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
    height: 3rem;
    width: 3rem;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
  }

  .save-cluster-indicator {
    height: 3rem;
    width: 3rem;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    color: var(--default-backgroundDarker2Color);

    .material-icons {
      font-size: 2rem;
    }
  }

  .show-errors-button {
    height: 3rem;
    width: 3rem;
    margin-bottom: 0.5rem;
    background-color: #df4151;
    color: #831721;
  }

  .save-button {
    color: var(--StateTextColor);

    &.save {
      background-color: #39ac00;
    }
  }

  .saving-spinner {
    height: 3rem;
    width: 3rem;
    border-color: #39ac00;
    border-right-color: transparent;
    border-width: 0.5rem;
    opacity: 0.5;
  }
</style>
