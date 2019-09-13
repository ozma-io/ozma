<template>
    <div class="calendar_container" v-click-outside="onClickOutside">
      <div class="main_input">
          <input type="text"
            :value="getInputString()"
            @blur="onBlur($event)"
            @focus="setCalendarOpen(true)"
          />
      </div>
      <div :class="['main_cal', {'main_cal__open': isCalendarOpen }]">
          <div class="days">
              <DatePicker
                  :value="contentValue"
                  @update:value="updateValueDate($event)"
              />
          </div>
          <div class="time">
              <TimePicker v-if="showTime"
                  @update:mins="updateMins($event)"
                  @update:hours="updateHours($event)"
              />
          </div>
      </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import moment, { Moment, months, Duration } from "moment";
import {dateFormat, dateTimeFormat} from "@/values";
import vClickOutside from "v-click-outside";

import DatePicker from "@/components/calendar/DatePicker.vue";
import TimePicker from "@/components/calendar/TimePicker.vue";

@Component({
    directives: {
        clickOutside: vClickOutside.directive,
    },
    components: {
        DatePicker, TimePicker,
    },
})
export default class Calendar extends Vue {
    @Prop({ default: "" }) value!: string;
    @Prop({ default: "MM.DD.YYYY" }) DateFormat!: string;
    @Prop({ default: "HH:mm" }) TimeFormat!: string;
    @Prop({ default: true }) showTime!: boolean;

    private isCalendarOpen: boolean = false;
    private contentValue: Moment = moment(this.value, this.getInputFormat());

    @Watch("value")
    private watchValue(v: string) {
      console.log("value", v);
      this.contentValue = moment(v, this.getInputFormat());
      console.log("lol", this.contentValue.toString());
    }

    private getOutputFormat() {
      return this.showTime ? `${this.DateFormat} ${this.TimeFormat}` : this.DateFormat;
    }

    private getInputFormat() {
      return this.showTime ? dateTimeFormat : dateFormat;
    }

    private getInputString() {
      if (!this.contentValue.isValid()) {
        return "-";
      }
      return this.contentValue.format(this.getOutputFormat());
    }

    private setCalendarOpen(val: boolean) {
      this.isCalendarOpen = val;
    }

    private onClickOutside() {
      this.setCalendarOpen(false);
    }

    private toggleCalendarOpen() {
      this.setCalendarOpen(!this.isCalendarOpen);
    }

    private onBlur(event: Event) {
        const eValue = (event.target as HTMLInputElement).value;
        const momentValue = moment.utc(eValue, this.getOutputFormat());
        if (this.contentValue && !this.contentValue.isSame(momentValue)) {
          this.updateValueDate(momentValue);
          this.updateShownDate(momentValue);
        }
    }

    private convertDateForUpdate(date: Moment) {
        if (!this.showTime) return date.clone().startOf('day');
        return date;
    }

    private updateValueDate(date: Moment) {
        console.log("update", date.toString());
        this.$emit("update:value", date.format(this.showTime ? dateTimeFormat : dateFormat));
    }

    private updateMins(val: number) {
        const newValue = this.contentValue.clone().minute(val);
        this.updateValueDate(newValue);
    }

    private updateHours(val: number) {
        const newValue = this.contentValue.clone().hour(val);
        this.updateValueDate(newValue);
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
