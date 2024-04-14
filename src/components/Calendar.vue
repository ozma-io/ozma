<i18n>
{
    "en": {
        "clear": "Clear",
        "today": "Today",
        "now": "Now"
    },
    "ru": {
        "clear": "Очистить",
        "today": "Сегодня",
        "now": "Сейчас"
    },
    "es": {
        "clear": "Eliminar",
        "today": "Hoy",
        "now": " Ahora"
    }
}
</i18n>
<template>
  <div
    :class="[
      'popup-container',
      {
        'is-open': isPopupOpen,
        disabled: disabled,
      },
    ]"
    :style="{ minWidth: isCellEdit ? '10rem' : undefined }"
  >
    <popper
      ref="popup"
      v-click-outside="closePopup"
      :trigger="null"
      transition="fade"
      enter-active-class="fade-enter fade-enter-active"
      leave-active-class="fade-leave fade-leave-active"
      :visible-arrow="false"
      :options="{
        placement: 'bottom-start',
        positionFixed: true,
        modifiers: {
          preventOverflow: {
            escapeWithReference: true,
            boundariesElement: 'viewport',
          },
        },
      }"
      @show="onOpenPopup"
      @hide="onClosePopup"
    >
      <!-- eslint-disable vue/no-deprecated-slot-attribute -->
      <!-- TODO: Find or make not deprecated popper.js wrapper -->
      <div slot="reference" class="calendar_container" @click="openPopup">
        <!-- eslint-enable vue/no-deprecated-slot-attribute -->
        <div class="main-input">
          <b-input-group class="focus-entire">
            <b-input
              ref="control"
              type="text"
              class="calendar-input"
              :style="{ backgroundColor }"
              :value="textValue"
              :disabled="disabled"
              @input="$emit('update:value', $event)"
              @keypress.enter.prevent.stop="onPressEnter"
              @keydown.esc.prevent.stop="closePopup"
              @focus="onInputFocus"
              @blur.prevent
            />
            <b-input-group-append>
              <b-input-group-text
                class="with-material-icon calendar-icon"
                :style="{ backgroundColor }"
              >
                <i class="material-icons">event</i>
              </b-input-group-text>
            </b-input-group-append>
          </b-input-group>
        </div>
      </div>

      <div class="popper border rounded overflow-hidden shadow">
        <div class="popper-inner">
          <div class="days">
            <div v-if="!required" class="clear-button-wrapper">
              <button
                type="button"
                :disabled="value === null"
                :class="[
                  'material-button clear-button',
                  { disabled: value === null },
                ]"
                @click="selectValue(null)"
              >
                <span class="material-icons md-18 mr-1">clear</span>
                {{ $t('clear') }}
              </button>
            </div>

            <DatePicker :value="dateValue" @update:value="updateDate" />
            <button class="today material-button" @click="setDateToday($event)">
              <span class="material-icons md-18 mr-1">today</span>
              {{ $t('today').toString() }}
            </button>
          </div>

          <div class="time">
            <TimePicker
              v-if="showTime"
              ref="timePicker"
              :hour="timeForPicker.hour"
              :min="timeForPicker.min"
              :time-step="timeStep"
              @update:min="updateMins"
              @update:hour="updateHours"
            />
            <button
              v-if="showTime"
              class="now material-button"
              @click="setTimeNow($event)"
            >
              {{ $t('now').toString() }}
            </button>
          </div>
        </div>
      </div>
    </popper>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import moment, { Moment } from 'moment'

import Popper from 'vue-popperjs'
import DatePicker from '@/components/calendar/DatePicker.vue'
import TimePicker from '@/components/calendar/TimePicker.vue'

export interface ITime {
  hour: number
  min: number
}

@Component({
  components: {
    DatePicker,
    TimePicker,
    Popper,
  },
})
export default class Calendar extends Vue {
  @Prop() value!: Moment | string | undefined | null
  @Prop({ type: Boolean }) error!: boolean
  @Prop({ type: Boolean }) required!: boolean
  @Prop({ type: Boolean, default: false }) disabled!: boolean
  @Prop({ default: true, type: Boolean }) showTime!: boolean
  @Prop({ type: String }) format!: string | undefined
  @Prop({ type: Number }) timeStep!: number | undefined
  @Prop({ type: Object }) timeDefault!: ITime | undefined
  @Prop({ type: Boolean, default: false }) autofocus!: boolean
  @Prop({ type: String }) backgroundColor!: string
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean

  private isPopupOpen = false

  get usedFormat() {
    if (this.format) {
      return this.format
    } else if (this.showTime) {
      return 'L LT'
    } else {
      return 'L'
    }
  }

  get dateValue() {
    return moment(this.value, this.usedFormat)
  }

  get textValue() {
    if (typeof this.value === 'string') {
      return this.value
    } else if (this.dateValue.isValid()) {
      return this.dateValue.local().format(this.usedFormat)
    } else {
      return ''
    }
  }

  get isEmpty(): boolean {
    return !this.value
  }

  private async togglePopup() {
    if (this.isPopupOpen) {
      await this.closePopup()
    } else {
      await this.openPopup()
    }
  }

  private async openPopup() {
    if (this.disabled) return
    const popupRef: any = this.$refs.popup
    if (!popupRef) return

    await popupRef.doShow()
  }

  private async closePopup() {
    const popupRef: any = this.$refs.popup
    if (!popupRef) return

    await popupRef.doClose()
  }

  private async onOpenPopup() {
    this.$emit('focus')
    this.isPopupOpen = true

    await Vue.nextTick()
    this.focusInput()
    ;(this.$refs.timePicker as TimePicker | undefined)?.scrollToValue()
  }

  private onClosePopup() {
    this.$emit('blur')
    this.isPopupOpen = false
  }

  private focusInput() {
    ;(this.$refs.control as HTMLInputElement | undefined)?.focus()
  }

  @Watch('autofocus', { immediate: true })
  private async onAutofocus(autofocus: boolean) {
    if (autofocus) {
      await this.$nextTick()
      void this.openPopup()
    }
  }

  private selectValue(newValue: Moment | null) {
    if (moment.isMoment(newValue) && newValue.isSame(this.value)) return
    this.$emit('update:value', newValue)
    if (!this.showTime) {
      void this.closePopup()
    }
  }

  private onPressEnter(event: KeyboardEvent) {
    const target = event.target! as HTMLInputElement
    this.$emit('update:value', target.value)
    target.blur()
    this.$emit('blur')
    this.$emit('enter-pressed', event)
  }

  private onInputFocus() {
    // FIXME: this `blur()` fixes not good behavior on mobiles,
    // but it can broke some cases on smartphones with keyboard and it's just a little ugly fix.
    if (this.$isMobile && !this.isPopupOpen) {
      ;(this.$refs.control as HTMLInputElement).blur()
    }
  }

  get timeForPicker(): ITime {
    return this.dateValue.isUTC()
      ? {
          hour: this.dateValue.utcOffset(moment().utcOffset()).hour(),
          min: this.dateValue.utcOffset(moment().utcOffset()).minute(),
        }
      : {
          hour: this.dateValue.hour(),
          min: this.dateValue.minute(),
        }
  }

  private updatePart(mutate: (m: Moment) => void) {
    const defaultHours = this.timeDefault?.hour ?? 9
    const defaultMinutes = this.timeDefault?.min ?? 0
    const newValue = this.dateValue.isValid()
      ? this.dateValue.clone().local()
      : moment()
          .hours(defaultHours)
          .minutes(defaultMinutes)
          .seconds(0)
          .milliseconds(0)
    mutate(newValue.local())
    this.selectValue(newValue)
  }

  private updateDate(val: Moment) {
    this.updatePart((newValue) => {
      newValue.year(val.year())
      newValue.month(val.month())
      newValue.date(val.date())
    })
  }

  private updateMins(val: number) {
    this.updatePart((newValue) => {
      newValue.minute(val)
      newValue.second(0)
    })
  }

  private updateHours(val: number) {
    this.updatePart((newValue) => {
      newValue.hour(val)
    })
  }

  private setTimeNow(event: Event) {
    event.preventDefault()
    const time = moment()
    this.updatePart((newValue) => {
      newValue.hour(time.hour())
      newValue.minute(time.minute())
      newValue.second(time.second())
    })
  }

  private setDateToday(event: Event) {
    event.preventDefault()
    const time = moment()
    this.updateDate(time)
  }
}
</script>

<style lang="scss" scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 1s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave {
  opacity: 1;
}

.popup-container {
  position: relative;
  z-index: 30;
  border-radius: 0.5rem;
  width: 100%;

  &.is-open {
    z-index: 41; /* To be above other components with popups */
  }
}

.calendar-icon {
  cursor: pointer;
  border: 1px solid var(--cell-borderColor);
  border-left-width: 0;
  background-color: var(--cell-backgroundColor);
  color: var(--cell-foregroundDarkerColor);
}

.calendar-input {
  border-right-width: 0;
  font-size: 1rem !important;
}

.disabled {
  .calendar-input,
  .calendar-icon {
    cursor: not-allowed;
  }
}

.popper-inner {
  display: flex;
}

.main-input {
  display: flex;
  flex-direction: row;
  border-radius: 0.5rem;
  background-color: var(--cell-backgroundColor);
  color: var(--cell-foregroundColor);

  ::v-deep .form-control {
    border-radius: 0.5rem 0 0 0.5rem;
    background-color: var(--cell-backgroundColor);
  }
  ::v-deep .input-group-text {
    border-radius: 0 0.5rem 0.5rem 0;
    background-color: var(--cell-backgroundColor);
  }
}

.main-input__trigger {
  display: inline-block;
}

.clear-button {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 0;
  background: var(--default-backgroundColor);
  padding: 0.5rem 0.75rem;
  width: 100%;
}

.days {
  display: inline-flex;
  flex-direction: column;
  justify-content: space-between;
}

.time {
  display: inline-flex;
  flex-direction: column;
  justify-content: space-between;
}

.today {
  display: flex;
  justify-content: center;
}

.today,
.now {
  border-radius: 0;
  background: var(--default-backgroundColor);
  padding: 0.5rem 0.75rem;
}
</style>
