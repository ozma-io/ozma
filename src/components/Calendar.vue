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
    <div class="calendar_container" v-click-outside="onClickOutside">
        <div class="main_input">
            <input type="button" class="material-icons calendar_input__icon" value="event">
            <input type="text"
                    class="calendar_input"
                    :placeholder="$t('input_placeholder')"
                    :value="textValue"
                    @input="$emit('update:value', $event.target.value)"
                    @focus="isCalendarOpen = true"
            />
        </div>
      <div :class="['main_cal', {'main_cal__open': isCalendarOpen }]">
            <div class="days">
                <DatePicker
                    :value="dateValue"
                    @update:value="updateDate"
                />
            </div>
            <div class="time">
                <TimePicker v-if="showTime"
                    @update:mins="updateMins"
                    @update:hours="updateHours"
                />
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

@Component({
    components: {
        DatePicker, TimePicker,
    },
})
export default class Calendar extends Vue {
    @Prop() value!: Moment | undefined | null;
    @Prop({ type: String }) textValue!: string;
    @Prop({ default: true, type: Boolean }) showTime!: boolean;

    private isCalendarOpen: boolean = false;

    get dateValue() {
        return this.value ? this.value : moment.invalid();
    }

    private onClickOutside() {
        this.isCalendarOpen = false;
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
}
</script>

<style scoped>
    .calendar_container {
      position: relative;
      display: inline-block;
    }
    .calendar_input {
        padding: 5px 2px 5px 0;
        background-color: rgba(0, 0, 0, 0);
        border: 0px;
        z-index: 2;
        order: 2;
        flex: 2;
        height: 2em;
        color: var(--MainTextColor);
        cursor: pointer;
        border-bottom: none;
        width: 100%;
        text-overflow: ellipsis;
    }
    .calendar_input:focus {
        outline: none;
        color: var(--MainTextColor);
        border-bottom: 1px solid var(--MainBorderColor) !important;
        cursor: text;
        background-color: var(--MainBackgroundColor);
    }
    .calendar_input__icon {
        background: none;
        border: none;
        color: var(--MainBorderColor);
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
      z-index: 250;
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
      background: hsla(0,0%,100%,.3);
      line-height: 100%;
      border: none;
      border-left: 0px;
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
        margin-right: 10px;
    }
    .time {
        display: inline-flex;
    }
    @media screen and (max-device-width: 480px) {
      .main_cal__open {
        flex-direction: column;
      }
    }
</style>
