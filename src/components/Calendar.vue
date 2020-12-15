<i18n>
{
    "en": {
        "input_placeholder": "Fill this value here"
    },
    "ru": {
        "input_placeholder": "Заполните здесь"
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
      <input
        type="button"
        :class="['material-icons',
                 'calendar_input__icon',
                 {
                   'required': required && isEmpty,
                   'error': error,
                 }
        ]"
        style="margin-right: 10px;"
        value="event"
      >
      <input
        ref="control"
        type="text"
        :class="['calendar_input', {'calendar-input_cell-edit': isCellEdit}]"
        :placeholder="$t('input_placeholder')"
        :value="textValue"
        @input="$emit('update:value', $event.target.value)"
        @keypress.enter="onPressEnter"
        @focus="onInputFocus"
      >
      <input
        v-if="!!value"
        type="button"
        class="material-icons close_input__icon"
        value="close"
        @click="clearValue"
      >
    </div>
    <div
      ref="popup"
      :class="['main_cal', {
        'main_cal__open': isCalendarOpen,
        'main_cal_cell-edit': isCellEdit,
        'main_cal__open-top': position
      }]"
    >
      <div
        :class="['days', {'mr-2': showTime}]"
      >
        <DatePicker
          :value="dateValue"
          _in
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
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import moment, { Moment, months, Duration } from "moment";

import { dateFormat, dateTimeFormat, valueToText } from "@/values";
import DatePicker from "@/components/calendar/DatePicker.vue";
import TimePicker from "@/components/calendar/TimePicker.vue";
import { nextRender } from "@/utils";

@Component({
  components: {
    DatePicker, TimePicker,
  },
})
export default class Calendar extends Vue {
  @Prop() value!: Moment | undefined | null;
  @Prop({ type: String }) textValue!: string;
  @Prop({ type: Boolean }) error!: boolean;
  @Prop({ type: Boolean }) required!: boolean;
  @Prop({ default: true, type: Boolean }) showTime!: boolean;
  @Prop({ type: Number, default: null }) timeStep!: number | null;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Boolean, default: false }) noOpenOnFocus!: boolean;
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;

  private isCalendarOpen = false;
  private position = false;

  private get isEmpty(): boolean {
    return this.value === undefined || this.value === null;
  }

  private mounted() {
    const controlElement = this.$refs.control as HTMLInputElement;
    if (this.autofocus) {
      void Vue.nextTick().then(() => {
        controlElement.focus();
      });
    }
  }

  private onPressEnter(event: any) {
    event.preventDefault();
    this.$emit("update:value", moment(event.target.value, "L LT"));
    event.target.blur();
    this.isCalendarOpen = false;
  }

  private onInputFocus() {
    this.$emit("focus");
    if (!this.noOpenOnFocus) {
      this.isCalendarOpen = true;
      void nextRender().then(() => {
        const bodyRect = document.body.getBoundingClientRect();
        const popup = this.$refs.popup as HTMLInputElement;
        const popupRect = popup.getBoundingClientRect();
        this.position = !((bodyRect.bottom - popupRect.bottom) > 0);
      });
    }
  }

  get dateValue() {
    return this.value ? this.value : moment.invalid();
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

  private clearValue() {
    this.$emit("update:value", null);
  }

  private updatePart(mutate: (m: Moment) => void) {
    const newValue = this.dateValue.isValid() ? this.dateValue.clone() : moment.utc().millisecond(0);
    mutate(newValue.local());
    this.$emit("update:value", newValue);
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
  .calendar_container {
    position: relative;
    display: block;
    background-color: inherit;

    &:hover {
      background-color: var(--CellSelectColor);
    }

    &.required {
      background-color: var(--WarningColor) !important;

      &::placeholder {
        color: var(--WarningPlaceholderColor) !important;
      }
    }

    &.error {
      background-color: var(--FailColor) !important;

      &::placeholder {
        color: var(--FailPlaceholderColor) !important;
      }
    }
  }

  .calendar_input {
    padding: 5px 2px 5px 0;
    background: none;
    border: 0;
    z-index: 2;
    order: 2;
    flex: 2;
    height: 2em;
    color: var(--MainTextColor);
    cursor: pointer;
    border-bottom: none;
    width: 100%;
    text-overflow: ellipsis;
    border-radius: 0;
    -webkit-border-radius: 0;
    -webkit-appearance: none;
  }

  .calendar_input:focus {
    outline: none;
    color: var(--MainTextColor);
    border-bottom: 1px solid var(--MainBorderColor) !important;
    cursor: text;
  }

  .close_input__icon,
  .calendar_input__icon {
    background: none;
    border: none;
    padding: 0;
    color: var(--MainBorderColor);

    &.required {
      color: var(--WarningPlaceholderColor) !important;
    }

    &.error {
      color: var(--FailPlaceholderColor) !important;
    }
  }

  .close_input__icon {
    color: var(--MainBorderColor);
    order: 3;
    padding: 0;
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
    top: calc(100% + 10px);
    z-index: 1001;
  }

  .main_cal__open-top {
    top: auto;
    bottom: calc(100% + 10px);
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
