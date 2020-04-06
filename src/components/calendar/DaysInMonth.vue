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
               {'curr-day': day.isSame(selectedValue, 'day')}]"
      :style="{ gridColumn: day.day() + 1 }"
      @click="$emit('update:selectedValue', day)"
    >
      {{ day.date() }}
    </div>
  </main>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import moment, { Moment, months, Duration } from "moment";

import * as Utils from "@/utils";

@Component
export default class DaysInMonth extends Vue {
  @Prop({ type: moment }) startValue!: Moment;
  @Prop({ type: moment }) selectedValue!: Moment;

  get days() {
    const startDate = this.startValue.clone().local().startOf("month");
    const daysNumber = startDate.daysInMonth() + startDate.day();
    const daysCount = startDate.daysInMonth() + startDate.day();
    const totalDaysCount = Utils.roundUp(daysCount, 7);
    return [...Array(totalDaysCount)].map((_, i) => startDate.clone().add(i - startDate.day(), "day"));
  }

  get weekdays() {
    return moment.weekdaysMin();
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
</style>
