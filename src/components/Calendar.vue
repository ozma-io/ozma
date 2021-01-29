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
    v-click-outside="onClickOutside"
    :class="['calendar_container',
             {
               'required': required && isEmpty,
               'error': error,
             }
    ]"
  >
    <div class="main_input">
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
          :class="['calendar-input', 'with-clear-content-button', {'calendar-input_cell-edit': isCellEdit}]"
          :style="{ backgroundColor }"
          :placeholder="$t('input_placeholder')"
          :value="textValue"
          @input="$emit('update:value', $event)"
          @keypress.enter="onPressEnter"
          @focus="onInputFocus"
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
      <transition name="fade">
        <div
          v-if="isCalendarOpen"
          ref="popup"
          :class="[
            'main_cal',
            'rounded',
            'border',
            {
              'main_cal__open': isCalendarOpen,
              'main_cal_cell-edit': isCellEdit,
              'main_cal__open-top': position
            }
          ]"
        >
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
              :is-open="isCalendarOpen"
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
      </transition>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import moment, { Moment } from "moment";

import DatePicker from "@/components/calendar/DatePicker.vue";
import TimePicker from "@/components/calendar/TimePicker.vue";
import { nextRender } from "@/utils";

@Component({
  components: {
    DatePicker, TimePicker,
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

  private isCalendarOpen = false;
  private position = false;

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

  private mounted() {
    const controlElement = this.$refs.control as HTMLInputElement;
    if (this.autofocus) {
      void Vue.nextTick().then(() => {
        controlElement.focus();
      });
    }
  }

  private updateValue(newValue: Moment | undefined | null) {
    if (moment.isMoment(newValue) && newValue.isSame(this.value)) {
      return;
    }

    if (this.value === newValue) {
      return;
    }

    this.$emit("update:value", newValue);
  }

  private onPressEnter(event: KeyboardEvent) {
    event.preventDefault();
    const target = event.target! as HTMLInputElement;
    this.updateValue(moment(target.value, this.usedFormat));
    target.blur();
    this.isCalendarOpen = false;
  }

  private onInputFocus() {
    // FIXME: this `blur()` fixes not good behavior on mobiles,
    // but it can broke some cases on smartphones with keyboard and it's just a little ugly fix.
    if (this.$isMobile && !this.isCalendarOpen) {
      (this.$refs.control as HTMLInputElement).blur();
    } else {
      this.$emit("focus");
    }
    void this.openPopup();
  }

  private async openPopup() {
    // FIXME: Awful hotfix for Android phones for cases when viewport resizes slowly after keyboard closing.
    if (this.$isMobile) {
      await new Promise(r => setTimeout(r, 400));
    }

    // TODO: after showing on top calendar will show on bottom even if it should show on top.

    this.isCalendarOpen = true;
    await nextRender();
    const bodyRect = document.body.getBoundingClientRect();
    const popup = this.$refs.popup as HTMLInputElement;
    const popupRect = popup.getBoundingClientRect();
    this.position = !((bodyRect.bottom - popupRect.bottom) > 0);
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

  private onClickOutside() {
    this.isCalendarOpen = false;
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
  .prepend-icon {
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColorLight);
    border-right-width: 0;
  }

  .calendar-input {
    border-left-width: 0;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: all 0.1s;
  }

  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }

  .main_cal {
    display: none;
  }

  .main_cal__open {
    display: flex;
    position: absolute;
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
    padding: 10px;
    border: 1px solid var(--MainBorderColor);
    top: calc(100% + 2px);
    z-index: 1001;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  }

  .main_cal__open-top {
    top: auto;
    bottom: calc(100% + 2px);
  }

  .main_input {
    display: flex;
    flex-direction: row;
  }

  .main_input__trigger {
    display: inline-block;
  }

  .main_input__trigger_button {
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
    .main_cal__open {
      flex-direction: column;
    }
  }
</style>
