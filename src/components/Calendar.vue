<i18n>
{
    "en": {
        "input_placeholder": "Empty",
        "today": "Today",
        "now": "Now"
    },
    "ru": {
        "input_placeholder": "Пусто",
        "today": "Сегодня",
        "now": "Сейчас"
    }
}
</i18n>
<template>
  <div
    :class="[
      'popup-container',
      {
        'is-open': isPopupOpen,

      }
    ]"
  >
    <popper
      ref="popup"
      trigger="clickToToggle"
      transition="fade"
      enter-active-class="fade-enter fade-enter-active"
      leave-active-class="fade-leave fade-leave-active"
      :visible-arrow="false"
      :options="{
        placement: 'bottom-start',
      }"
      @show="onOpenPopup"
      @hide="onClosePopup"
    >
      <!-- eslint-disable vue/no-deprecated-slot-attribute -->
      <!-- TODO: Find or make not deprecated popper.js wrapper -->
      <div
        slot="reference"
        class="calendar_container"
      >
        <!-- eslint-enable vue/no-deprecated-slot-attribute -->
        <div class="main-input">
          <b-input-group
            class="focus-entire"
            size="sm"
          >
            <b-input
              ref="control"
              type="text"
              :class="['calendar-input', 'with-clear-content-button']"
              :style="{ backgroundColor }"
              :placeholder="$t('input_placeholder')"
              :value="textValue"
              :disabled="disabled"
              @input="$emit('update:value', $event)"
              @keypress.enter.prevent.stop="onPressEnter"
              @focus="onInputFocus"
              @blur.prevent
              @keydown.esc.prevent.stop="$emit('blur', $event)"
            />
            <b-input-group-append>
              <b-button
                v-if="!disabled"
                :disabled="!value"
                class="button with-material-icon clear-content-button"
                variant="outline-secondary"
                @click.prevent="updateValue(null)"
              >
                <i
                  class="material-icons"
                >clear</i>
              </b-button>

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
          <div
            :class="['days']"
          >
            <DatePicker
              :value="dateValue"
              @update:value="updateDate"
            />
            <button class="today material-button" @click="setDateToday($event)">
              {{ $t("today").toString() }}
            </button>
          </div>

          <div class="time">
            <TimePicker
              v-if="showTime"
              :time="timeForPicker"
              :is-open="true"
              :time-step="timeStep"
              @update:mins="updateMins"
              @update:hours="updateHours"
            />
            <button
              v-if="showTime"
              class="now material-button"
              @click="setTimeNow($event)"
            >
              {{ $t("now").toString() }}
            </button>
          </div>
        </div>
      </div>
    </popper>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import moment, { Moment } from "moment";

import DatePicker from "@/components/calendar/DatePicker.vue";
import TimePicker, { ITime } from "@/components/calendar/TimePicker.vue";
import Popper from "vue-popperjs";

@Component({
  components: {
    DatePicker, TimePicker, Popper,
  },
})
export default class Calendar extends Vue {
  @Prop() value!: Moment | string | undefined | null;
  @Prop({ type: Boolean }) error!: boolean;
  @Prop({ type: Boolean }) required!: boolean;
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ default: true, type: Boolean }) showTime!: boolean;
  @Prop({ type: String }) format!: string | undefined;
  @Prop({ type: Number }) timeStep!: number | undefined;
  @Prop({ type: Object }) timeDefault!: ITime | undefined;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  // FIXME: remove this and style parent nodes instead.
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;
  @Prop({ type: String }) backgroundColor!: string;

  private position = false;
  private isPopupOpen = false;

  get usedFormat() {
    if (this.format) {
      return this.format;
    } else if (this.showTime) {
      return "L LT";
    } else {
      return "L";
    }
  }

  get dateValue() {
    return moment.isMoment(this.value) ? this.value : moment.invalid();
  }

  get textValue() {
    if (this.dateValue.isValid()) {
      return this.dateValue.format(this.usedFormat);
    } else if (typeof this.value === "string") {
      return this.value;
    } else {
      return "";
    }
  }

  get isEmpty(): boolean {
    return !this.value;
  }

  private async openPopup() {
    if (this.disabled) return;
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    await popupRef.doShow();
  }

  private async closePopup() {
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    await popupRef.doClose();
  }

  private async onOpenPopup() {
    this.isPopupOpen = true;

    if (this.$isMobile) return;
    await Vue.nextTick();
    this.focusInput();
  }

  private onClosePopup() {
    this.isPopupOpen = false;
  }

  private focusInput() {
    (this.$refs.control as HTMLInputElement)?.focus();
  }

  @Watch("autofocus", { immediate: true })
  private async onAutofocus(autofocus: boolean) {
    if (autofocus) {
      await this.$nextTick();
      void this.openPopup();
    }
  }

  private updateValue(newValue: Moment | undefined | null) {
    if (moment.isMoment(newValue) && newValue.isSame(this.value)) return;
    if (this.value === newValue) return;

    this.$emit("update:value", newValue);
    if (!this.showTime) {
      void this.closePopup();
    }
  }

  private onPressEnter(event: KeyboardEvent) {
    const target = event.target! as HTMLInputElement;
    this.updateValue(moment(target.value, this.usedFormat));
    target.blur();
    this.$emit("blur");
    this.$emit("move-selection-next-row", event);
  }

  private onInputFocus() {
    // FIXME: this `blur()` fixes not good behavior on mobiles,
    // but it can broke some cases on smartphones with keyboard and it's just a little ugly fix.
    if (this.$isMobile && !this.isPopupOpen) {
      (this.$refs.control as HTMLInputElement).blur();
    } else {
      this.$emit("focus");
    }
  }

  get timeForPicker() {
    return (this.dateValue.isUTC())
      ? {
        hour: this.dateValue.utcOffset(moment().utcOffset()).hour(),
        min: this.dateValue.utcOffset(moment().utcOffset()).minute(),
      }
      : {
        hour: this.dateValue.hour(),
        min: this.dateValue.minute(),
      };
  }

  private updatePart(mutate: (m: Moment) => void) {
    const defaultHours = this.timeDefault?.hour ?? 9;
    const defaultMinutes = this.timeDefault?.min ?? 0;
    const newValue = this.dateValue.isValid()
      ? this.dateValue.clone().local()
      : moment()
        .hours(defaultHours)
        .minutes(defaultMinutes)
        .seconds(0)
        .milliseconds(0);
    mutate(newValue.local());
    this.updateValue(newValue);
  }

  private updateDate(val: Moment) {
    this.updatePart(newValue => {
      newValue.year(val.year());
      newValue.month(val.month());
      newValue.date(val.date());
    });
  }

  private updateMins(val: number) {
    this.updatePart(newValue => {
      newValue.minute(val);
      newValue.second(0);
    });
  }

  private updateHours(val: number) {
    this.updatePart(newValue => {
      newValue.hour(val);
    });
  }

  private setTimeNow(event: Event) {
    event.preventDefault();
    const time = moment();
    this.updatePart(newValue => {
      newValue.hour(time.hour());
      newValue.minute(time.minute());
      newValue.second(time.second());
    });
  }

  private setDateToday(event: Event) {
    event.preventDefault();
    const time = moment();
    this.updateDate(time);
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
    width: 100%;
    position: relative;
    z-index: 30;
    border-radius: 0.2rem;

    &.is-open {
      z-index: 31; /* To be above other components with popups */
    }
  }

  .calendar-icon {
    background-color: var(--input-backgroundColor);
    color: var(--input-foregroundDarkerColor);
    border: 1px solid var(--input-borderColor);
    cursor: pointer;
    border-left-width: 0;
  }

  .calendar-input {
    border-right-width: 0;
    font-size: var(--FontSize) !important;
  }

  .popper-inner {
    display: flex;
  }

  .main-input {
    display: flex;
    flex-direction: row;
    border-radius: 0.25rem;
    background-color: var(--input-backgroundColor);
    color: var(--input-foregroundColor);

    ::v-deep .form-control {
      background-color: var(--input-backgroundColor);
    }
  }

  .main-input__trigger {
    display: inline-block;
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

  .today,
  .now {
    background: var(--default-backgroundColor);
    border-radius: 0;
  }
</style>
