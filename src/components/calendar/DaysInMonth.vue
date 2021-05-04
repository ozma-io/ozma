<template>
  <main class="cal-day">
    <div
      v-for="(weekName, weekNameI) in weekdays"
      :key="weekNameI"
    >
      {{ weekName }}
    </div>
    <div
      v-for="day in days"
      :key="day.valueOf()"
      :class="['date-cell',
               {'diff-month': !day.isSame(startValue, 'month')},
               {'curr-day': day.isSame(selectedValue, 'day')},
               {'today': day.isSame(today, 'day')}]"
      :style="{ gridColumn: day.weekday() + 1 }"
      @click="$emit('update:selectedValue', day)"
    >
      {{ day.date() }}
    </div>
  </main>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import moment, { Moment } from "moment";

import * as Utils from "@/utils";

@Component
export default class DaysInMonth extends Vue {
  @Prop({ type: moment }) startValue!: Moment;
  @Prop({ type: moment }) selectedValue!: Moment;

  get days() {
    const startDate = this.startValue.clone().local().startOf("month");
    const daysCount = startDate.daysInMonth() + startDate.weekday();
    const totalDaysCount = Utils.roundUp(daysCount, 7);
    return [...Array(totalDaysCount)].map((_, i) => startDate.clone().add(i - startDate.weekday(), "day"));
  }

  get weekdays() {
    return moment.weekdaysMin(true);
  }

  get today() {
    return moment();
  }
}
</script>

<style scoped>
  .cal-day {
    display: grid;
    grid-template-columns: repeat(7, 30px);
  }

  .cal-day > div {
    align-items: center;
    display: flex;
    justify-content: center;
    margin: 1px;
  }

  .date-cell {
    cursor: pointer;
    color: var(--MainTextColorLight);
    margin: 1px;
  }

  .diff-month {
    color: var(--MainBorderColor);
  }

  .curr-day {
    background-color: var(--MainBorderColor);
    border-radius: 3px;
    color: var(--MainTextColor);
  }

  .today {
    border: 1px solid var(--MainBorderColor);
    border-radius: 3px;
  }
</style>
