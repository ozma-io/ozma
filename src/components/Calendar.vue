<i18n>
{
    "en": {
        "input_placeholder": "Empty"
    },
    "ru": {
        "input_placeholder": "Пусто"
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
            <b-input-group-prepend>
              <b-input-group-text
                class="with-material-icon prepend-icon"
                :style="{ backgroundColor }"
              >
                <i class="material-icons">event</i>
              </b-input-group-text>
            </b-input-group-prepend>
            <b-input
              ref="control"
              type="text"
              :class="['calendar-input', 'with-clear-content-button']"
              :style="{ backgroundColor }"
              :placeholder="$t('input_placeholder')"
              :value="textValue"
              @input="$emit('update:value', $event)"
              @keypress.enter.prevent.stop="onPressEnter"
              @focus="onInputFocus"
              @blur.prevent
              @keydown.esc.prevent.stop="$emit('blur', $event)"
            />
            <b-input-group-append>
              <b-button
                :disabled="!value"
                class="button with-material-icon clear-content-button"
                variant="outline-secondary"
                @click.prevent="updateValue(null)"
              >
                <i
                  class="material-icons"
                >clear</i>
              </b-button>
            </b-input-group-append>
          </b-input-group>
        </div>
      </div>

      <div class="popper border rounded overflow-hidden shadow">
        <div class="calendar-container">
          <div
            :class="['days', {'mr-2': showTime}]"
          >
            <DatePicker
              :value="dateValue"
              @update:value="updateDate"
            />
            <button class="today" @click="setDateToday($event)">
              Today
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
              class="now"
              @click="setTimeNow($event)"
            >
              Now
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
import TimePicker from "@/components/calendar/TimePicker.vue";
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
  @Prop({ default: true, type: Boolean }) showTime!: boolean;
  @Prop({ type: String }) format!: string | undefined;
  @Prop({ type: Number }) timeStep!: number | undefined;
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

  private mounted() {
    if (this.autofocus) {
      void this.onAutofocus(true);
    }
  }

  @Watch("autofocus")
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
    void this.closePopup();
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
    const newValue = this.dateValue.isValid() ? this.dateValue.clone() : moment.utc().millisecond(0);
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

    &.is-open {
      z-index: 31; /* To be above other components with popups */
    }
  }

  .prepend-icon {
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColorLight);
    border-right-width: 0;
    cursor: pointer;
  }

  .calendar-input {
    border-left-width: 0;
  }

  .calendar-container {
    display: flex;
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
    border: 1px solid var(--MainBorderColor);
  }

  .main-input {
    display: flex;
    flex-direction: row;
  }

  .main-input__trigger {
    display: inline-block;
  }

  .main-input__trigger_button {
    color: var(--ButtonTextColor) !important;
    background: hsla(0, 0%, 100%, 0.3);
    line-height: 100%;
    border: none;
    border-left: 0;
    text-decoration: none;
    padding-left: 5px;
    padding-right: 5px;
    z-index: 1000; /* панель наверху */
    padding-bottom: 4px;
    padding-top: 1px !important;
    border-radius: 0 !important;
    font-size: 1.4em !important;
    height: 100%;
  }

  .days {
    display: inline-flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .mr-1 {
    margin-right: 10px;
  }

  .time {
    display: inline-flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .today,
  .now {
    margin-top: 10px;
  }

  @media screen and (max-device-width: 480px) {
    .calendar-container__open {
      flex-direction: column;
    }
  }
</style>
