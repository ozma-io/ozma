<template>
    <div class="calendar_container" v-click-outside="onClickOutside">
      <div class="main_input">
          <input type="text"
            :value="this.getInputString()"
            @blur="onBlur($event)"
          />
          <div class="main_input__trigger">
            <input type="button"
              @click="toggleCalendarOpen()"
              value="calendar_today"
              class="main_input__trigger_button material-icons" />
          </div>
      </div>
      <div :class="['main_cal', {'main_cal__open': isCalendarOpen }]">
          <div class="days">
              <DaysInMonth
                  :shownDate="shownDate"
                  @update:shown="updateShownDate($event)"
                  @update:value="updateValueDate($event)"
              />
          </div>
          <div class="time">
              <Time v-if="showTime"
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

Vue.prototype.moment = moment;

@Component({
    directives: {
        clickOutside: vClickOutside.directive,
    },
    components: {
        DaysInMonth: () => import("@/components/calendar/DaysInMonth.vue"),
        Time: () => import("@/components/calendar/Time.vue"),
    },
})
export default class Calendar extends Vue {
    @Prop({ default: "" }) value!: string;
    @Prop({ default: "MM.DD.YYYY"}) DateFormat!: string;
    @Prop({ default: "HH:mm:ss"}) TimeFormat!: string;
    @Prop({ default: true }) showTime!: boolean;

    private isCalendarOpen: boolean = false;
    private contentDate: Moment = moment(this.value, dateFormat);
    private shownDate: Moment = (this.contentDate.isValid()) ? this.contentDate.local() : moment().local();

    private getInputFormat() {
      return this.showTime ? `${this.DateFormat} ${this.TimeFormat}` : this.DateFormat;
    }

    private getInputString() {
      console.log(this.value);
      if (!moment(this.value, dateFormat).isValid()) {
        return "-";
      }
      return this.shownDate.format(this.getInputFormat());

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
      const momentValue = moment.utc(eValue, this.getInputFormat());
      this.updateValueDate(momentValue);
      this.updateShownDate(momentValue);
    }

    private updateValueDate(date: Moment) {
        this.$emit("update:value", date.format(this.showTime ? dateTimeFormat : dateFormat));
    }

    private updateShownDate(date: Moment) {
        this.shownDate = date;
    }

    private updateMins(val: number) {
        this.shownDate.minute(val);
        this.updateValueDate(this.shownDate);
    }

    private updateHours(val: number) {
        this.shownDate.hour(val);
        this.updateValueDate(this.shownDate);
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
</style>
