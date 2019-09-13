<template>
    <div class="calendar_container" v-click-outside="onClickOutside">
        <div class="main_input">
            <input type="text"
                    :value="rawValue"
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

import { dateFormat, dateTimeFormat } from "@/values";
import DatePicker from "@/components/calendar/DatePicker.vue";
import TimePicker from "@/components/calendar/TimePicker.vue";

@Component({
    components: {
        DatePicker, TimePicker,
    },
})
export default class Calendar extends Vue {
    @Prop() value!: Moment | undefined;
    @Prop({ type: String }) rawValue!: string;
    @Prop({ default: true, type: Boolean }) showTime!: boolean;

    private isCalendarOpen: boolean = false;

    get dateValue() {
        return this.value === undefined ? moment.invalid() : this.value;
    }

    private onClickOutside() {
        this.isCalendarOpen = false;
    }

    private updateDate(date: Moment) {
        const dateStr = this.showTime ? date.format(dateTimeFormat) : date.format(dateFormat);
        this.$emit("update:value", dateStr);
    }

    private updateMins(val: number) {
        if (this.dateValue.isValid()) {
            const newValue = this.dateValue.clone().minute(val);
            this.updateDate(newValue);
        }
    }

    private updateHours(val: number) {
        if (this.dateValue.isValid()) {
            const newValue = this.dateValue.clone().hour(val);
            this.updateDate(newValue);
        }
    }
}
</script>

<style scoped>
    .calendar_container {
      position: relative;
      display: inline-block;
    }
    .main_cal {
      display: none;
    }
    .main_cal__open {
      display: flex;
      position: absolute;
      background-color: var(--NavigationBackColor);
      padding: 10px;
      border: 2px solid white;
      top: calc(100% + 10px);
      z-index: 1;
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
