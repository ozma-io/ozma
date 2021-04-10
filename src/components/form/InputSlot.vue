<i18n>
    {
    "en": {
        "ok": "OK",
        "cancel": "Cancel",
        "readonly_field": "Read-only field",
        "required_field": "Required field"

        },
    "ru": {
        "ok": "ОК",
        "cancel": "Отмена",
        "readonly_field": "Поле только для чтения",
        "required_field": "Обязательное поле"
        }
    }
</i18n>
<template>
  <b-row
    :class="{'input_slot__row': inline, 'input-slot_cell-edit': isCellEdit}"
  >
    <Modal
      v-if="modal"
      :show="isModalOpen"
      fullscreen
      @opened="onModalOpen"
      @close="onModalClose"
    >
      <template #content>
        <div class="input_modal__input_group">
          <div>
            <slot
              :onFocus="onModalFocus"
              modal
              :autofocus="isModalOpen"
            />
          </div>
          <div class="input_modal__button_container">
            <button
              type="button"
              class="input_modal__button__ok"
              @click="closeModal"
            >
              {{ $t('ok') }}
            </button>
          </div>
        </div>
      </template>
    </Modal>
    <template v-if="!(modalOnly && modal)">
      <b-col
        v-if="label"
        :cols="inline ? 4 : 12"
      >
        <div class="input_label__container">
          <label
            v-if="label"
            class="input_label"
            :for="inputName"
            :title="label"
          >{{ label }}</label>
        </div>
      </b-col>
      <b-col
        :cols="(!!label && inline) ? 8 : 12"
        :class="['input_container', `text_align_${textAlign}`, {'input_container_cell-edit': isCellEdit}]"
      >
        <div
          :class="[
            'input-slot',
            {
              'required': required,
              'empty': empty,
              'inline': !label || inline,
            },
          ]"
          :style="[
            {
              backgroundColor: backgroundColor ? backgroundColor : 'var(--input-backgroundColor)',
            },
            colorVariables,
          ]"
        >
          <div
            v-if="required"
            v-b-tooltip.hover.bottom.noninteractive
            class="required-indicator"
            :title="$t('required_field')"
          />
          <div
            v-if="disabled"
            v-b-tooltip.hover.bottom.noninteractive
            :class="[
              'disabled-indicator',
              {
                'is-cell-edit': isCellEdit,
              },
            ]"
            :title="$t('readonly_field')"
          >
            <span class="material-icons">edit_off</span>
          </div>
          <slot
            :onFocus="onNonmodalFocus"
          />
        </div>
      </b-col>
    </template>
  </b-row>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import Modal from "@/components/modal/Modal.vue";
import Input from "@/components/form/Input.vue";

@Component({ components: { Modal, Input } })
export default class InputSlot extends Vue {
  @Prop({ type: String }) label!: string;
  @Prop({ type: Boolean, default: true }) inline!: boolean;
  // FIXME: remove this and style parent nodes instead.
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;
  @Prop({ type: String }) backgroundColor!: string;
  @Prop({ type: Object }) colorVariables!: Record<string, unknown> | null;
  @Prop({ type: String, default: "left" }) textAlign!: string;
  @Prop({ type: Boolean, default: false }) modal!: boolean;
  @Prop({ type: Boolean, default: false }) modalOnly!: boolean;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ type: Boolean, required: true }) empty!: boolean;

  private focused = false;
  private isModalOpen = false;

  private created() {
    if (this.modalOnly && this.modal) {
      this.isModalOpen = true;
    }
  }

  private get inputName(): string {
    return `${this.uid}-input`;
  }

  private onModalOpen() {
    this.$nextTick(() => {
      if (this.$refs.controlModal) {
        const control = this.$refs.controlModal as HTMLElement;
        control.focus();
      }
    });
  }

  private emptyHandler() {
  }

  private onModalClose() {
    this.isModalOpen = false;
    this.$emit("close-modal-input");
  }

  private onModalFocus() {
    this.$emit("focus");
  }

  private onNonmodalFocus() {
    if (this.modal) {
      this.isModalOpen = true;
    }
    this.$emit("focus");
  }

  private closeModal() {
    this.focused = false;
    this.isModalOpen = false;
  }
}
</script>

<style lang="scss" scoped>
  .input_slot__row {
    flex-direction: row;
  }

  .input_label__container {
    padding: 0;
    display: flex;
    height: 2em;
  }

  .input_label {
    align-self: center;
    margin-bottom: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;
    color: var(--form-foregroundDarkenColor);
  }

  .input_container_cell-edit {
    padding: 0;
  }

  .input-slot {
    position: relative;
    border-radius: 0.2rem;

    $indicator-size: (18px / 14px) * 1rem;
    $indicator-padding: 0.2rem;

    .disabled-indicator {
      height: $indicator-size;
      width: $indicator-size;
      position: absolute;
      z-index: 10;
      padding: $indicator-padding;
      color: var(--default-foregroundDarkerColor);
      transition: background-color 0.1s;

      &.is-cell-edit {
        height: $indicator-size + $indicator-padding * 2;
        width: $indicator-size + $indicator-padding * 2;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: var(--input-backgroundColor);
        border: 1px solid var(--input-borderColor);
        border-right-color: var(--input-backgroundColor);
        border-top-left-radius: 50%;
        border-bottom-left-radius: 50%;
        z-index: 31;
      }

      .material-icons {
        font-size: $indicator-size;
      }
    }

    &.inline .disabled-indicator {
      left: -1 * ($indicator-size  + $indicator-padding);
      top: $indicator-size / 4;

      &.is-cell-edit {
        /* False-positive */
        /* stylelint-disable-next-line */
        left: calc(#{-1 * ($indicator-size + $indicator-padding * 2)} + 1px);
        top: 0;
      }
    }

    &:not(.inline) .disabled-indicator {
      left: unset;
      top: -1.75rem;
      right: 0.25rem;
    }

    &.required {
      > .required-indicator {
        height: 1rem;
        width: 1rem;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 50%;
        position: absolute;
        left: -1.5rem;
        top: 0.5rem;
        z-index: 10;
        transition: background-color 0.1s;
      }

      &:not(.inline) {
        > .required-indicator {
          left: unset;
          top: -1.5rem;
          right: 0.5rem;
        }
      }

      &.empty {
        > .required-indicator {
          background-color: rgba(255, 120, 100, 0.9);
        }
      }
    }
  }

  .input-slot_cell-edit {
    padding: 0;
    margin: 0;
  }

  .input_modal__input_group {
    display: flex;
    flex-direction: column;
    height: auto;
    position: relative;
    top: 40%;
    padding: 0 5%;
    background-color: var(--table-backgroundColor);
  }

  .input_modal__button__ok,
  .input_modal__button__cancel {
    outline: none;
    border: 0;
    padding: 10px 18px;
    cursor: pointer;
    color: var(--MainTextColor);
    box-shadow: 0 4px 8px var(--MainBorderColor);
    background: var(--MainBackgroundColor);
    font-weight: 600;
    width: 100%;
    border-radius: 0;
    margin-top: 5px;
  }

  .input_modal__button__ok {
    background-color: var(--SuccessColor);
  }

  .input_modal__button__cancel {
    background-color: var(--FailColor);
  }

  .v--modal-overlay {
    z-index: 1000;
  }

  .text_align_right {
    text-align: right;
  }

  .text_align_left {
    text-align: left;
  }
</style>
