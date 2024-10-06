<i18n>
  {
    "en": {
      "ok": "Done",
      "readonly_field": "Read-only field",
      "required_field": "Required field"
    },
    "ru": {
      "ok": "Готово",
      "readonly_field": "Поле только для чтения",
      "required_field": "Обязательное поле"
    },
    "es": {
      "ok": "Hecho",
      "readonly_field": "El campo de solo lectura",
      "required_field": "El campo obligatorio"
    }
  }
</i18n>
<template>
  <b-row
    :class="[
      'row-override',
      variantClassName,
      'cell-local-variant',
      {
        'input-slot_cell-edit': isCellEdit,
      },
    ]"
  >
    <TabbedModal
      v-if="modal"
      :show="isModalOpen"
      fullscreen
      @opened="onModalOpen"
      @close="onModalClose"
    >
      <div class="modal-content">
        <div class="header">
          <div v-if="label" class="label">
            {{ $ustOrEmpty(label) }}
          </div>
        </div>

        <div class="input_modal__input_group">
          <div class="input_modal__input">
            <slot
              :onFocus="onModalFocus"
              :onBlur="onBlur"
              modal
              :autofocus="isModalOpen"
            />
          </div>
          <div class="ok-button-wrapper">
            <b-button block variant="outline-primary" @click="closeModal">
              {{ $t('ok') }}
            </b-button>
          </div>
        </div>
      </div>
    </TabbedModal>
    <template v-if="!(modalOnly && modal)">
      <b-col
        :cols="12"
        :class="[
          'input_container',
          `text_align_${textAlign}`,
          {
            'input_container_cell-edit': isCellEdit,
          },
        ]"
      >
        <div
          :class="[
            'border-label',
            { 'increase-z-index': focused && !$isMobile },
          ]"
        >
          {{ $ustOrEmpty(label) }}
        </div>
        <div
          :class="[
            'input-slot',
            variantClassName,
            'cell-local-variant',
            {
              required: required,
              empty: empty,
            },
          ]"
          :style="[
            variantVariables,
            {
              backgroundColor: backgroundColor
                ? backgroundColor
                : 'var(--cell-backgroundColor)',
            },
          ]"
        >
          <div
            v-if="!hideRequiredAndDisabledIcons && (required || disabled)"
            :class="[
              'indicator-container',
              {
                'cell-edit': isCellEdit,
                required: required,
              },
            ]"
            :title="$t(required ? 'required_field' : 'readonly_field')"
          >
            <div
              v-if="required && !disabled"
              :class="[
                'required-indicator',
                {
                  empty: empty,
                },
              ]"
            />

            <div v-if="disabled" class="disabled-indicator">
              <span class="material-icons">edit_off</span>
            </div>
          </div>

          <slot :onFocus="onNonmodalFocus" :onBlur="onBlur" />
        </div>
      </b-col>
    </template>
  </b-row>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import TabbedModal from '@/components/modal/TabbedModal.vue'
import Input from '@/components/form/Input.vue'
import type { ColorVariantAttribute } from '@/utils_colors'
import {
  getColorVariantAttributeClassName,
  getColorVariantAttributeVariables,
} from '@/utils_colors'
import type { UserString } from '@/state/translations'
import { isUserString } from '@/state/translations'

@Component({ components: { TabbedModal, Input } })
export default class InputSlot extends Vue {
  @Prop({ validator: isUserString, required: true }) label!: UserString
  // FIXME: remove this and style parent nodes instead.
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean
  @Prop({ type: String }) backgroundColor!: string
  /* @Prop({ type: Object }) colorVariables!: Record<string, unknown> | null; */
  @Prop({ type: Object }) colorVariantAttribute!: ColorVariantAttribute
  @Prop({ type: String, default: 'left' }) textAlign!: string
  // FIXME:
  // Хм, странно, что у нас теперь модал управляется из InputSlotа - это прямо неправильно.
  // https://bitbucket.org/myprocessx/funwithflags/pull-requests/1097
  @Prop({ type: Boolean, default: false }) modal!: boolean
  @Prop({ type: Boolean, default: false }) modalOnly!: boolean
  @Prop({ type: Boolean, default: false }) required!: boolean
  @Prop({ type: Boolean, default: false }) disabled!: boolean
  @Prop({ type: Boolean, required: true }) empty!: boolean
  @Prop({ type: Boolean, required: false })
  hideRequiredAndDisabledIcons!: boolean

  private isModalOpen = false
  private focused = false

  private created() {
    if (this.modalOnly && this.modal) {
      this.isModalOpen = true
    }
  }

  private get variantClassName(): string | null {
    return getColorVariantAttributeClassName(this.colorVariantAttribute)
  }

  private get variantVariables(): Record<string, string> | null {
    return getColorVariantAttributeVariables(this.colorVariantAttribute)
  }

  private get inputName(): string {
    return `${this.uid}-input`
  }

  private onModalOpen() {}

  private onModalClose() {
    this.isModalOpen = false
    this.$emit('close-modal-input')
  }

  private onModalFocus() {
    this.focused = true
    this.$emit('focus')
  }

  private onNonmodalFocus() {
    this.focused = true
    if (this.modal) {
      this.isModalOpen = true
    }
    this.$emit('focus')
  }

  private onBlur() {
    this.focused = false
    this.$emit('blur')
  }

  private closeModal() {
    this.isModalOpen = false
  }
}
</script>

<style lang="scss" scoped>
@include variant-to-local('cell');

.row-override {
  margin: 0px !important;

  &:hover {
    ::v-deep .disabled-indicator {
      display: block !important;
    }
  }
}

.modal-content {
  background-color: var(--default-backgroundDarker1Color);
  height: 100%;
}

.header {
  margin-bottom: 0.25rem;
}

.label {
  overflow: hidden;
  font-size: 1.5rem;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.border-label {
  position: absolute;
  top: -0.5rem;
  left: 1.5rem;
  z-index: 40;
  border-radius: 0.5rem;
  background-color: var(--default-backgroundColor);
  padding: 0 0.25rem;
  pointer-events: none;
  color: var(--default-foregroundDarkerColor);
  font-size: 0.875rem;
  line-height: 1;

  &.increase-z-index {
    z-index: 42;
  }
}

.longer-input-label {
  transform: translateX(15px);
  padding-right: 0;
  padding-left: 0;
}

.input-label-with-indicator {
  padding-right: 5px;
}

.input_label__container {
  display: flex;
  padding: 0;
  height: 100%;
}

.input_label {
  align-self: center;
  margin-bottom: 0;
  width: 95%;
  overflow: hidden;
  color: var(--form-foregroundDarkenColor);
  font-weight: 600;
  font-size: 1rem;
  text-overflow: ellipsis;
  white-space: pre;
}

.input_container_cell-edit {
  padding: 0;
}

.ok-button-wrapper {
  padding: 1rem 0;
}

.input-slot {
  position: relative;
  border-radius: 0.5rem;

  .indicator-container {
    $indicator-size: 1rem;
    $indicator-padding: 0.125rem;
    $input-height: 2.5rem;
    display: flex;

    position: absolute;
    top: calc($input-height / 2 - $indicator-size / 2);

    left: -1 * ($indicator-size + 2 * $indicator-padding);
    justify-content: center;
    align-items: center;
    width: $indicator-size + $indicator-padding * 2;
    height: $indicator-size + $indicator-padding * 2;

    &.cell-edit {
      top: 0;
      /* False-positive */
      /* stylelint-disable-next-line */
      left: calc(#{-1 * ($indicator-size + 2 * $indicator-padding)} + 1px);
    }

    &.cell-edit {
      border: 1px solid var(--cell-borderColor);
      border-right-color: var(--cell-backgroundColor);
      border-top-left-radius: 50%;
      border-bottom-left-radius: 50%;
      background-color: var(--cell-backgroundColor);
    }

    .required-indicator {
      position: absolute;
      opacity: 0.05;
      transition:
        background-color 0.1s,
        opacity 0.1s;
      border-radius: 50%;
      background-color: var(--cell-foregroundColor);
      width: 0.5 * $indicator-size;
      height: 0.5 * $indicator-size;

      &.empty {
        opacity: 1;
        background-color: rgba(255, 120, 100);
      }
    }

    .disabled-indicator {
      display: none; // to show on input_slot__row hover
      line-height: 1;

      .material-icons {
        color: var(--default-foregroundDarkerColor);
      }
    }
  }
}

.input-slot_cell-edit {
  margin: 0;
  padding: 0;
}

.input_modal__input_group {
  display: flex;
  flex-direction: column;
  background-color: var(--table-backgroundDarker1Color);
  padding: 0 1rem;
  height: 100%;
}

.input_modal__input {
  overflow: auto;
}
</style>
