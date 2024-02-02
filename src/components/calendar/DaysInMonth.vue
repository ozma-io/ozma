<template>
  <main class="cal-day">
    <div
      v-for="(weekName, weekNameI) in weekdays"
      :key="weekNameI"
      class="week-day"
    >
      {{ weekName }}
    </div>
    <div
      v-for="day in days"
      :key="day.valueOf()"
      :class="[
        'date-cell',
        { 'diff-month': !day.isSame(startValue, 'month') },
        { 'curr-day': day.isSame(selectedValue, 'day') },
        { today: day.isSame(today, 'day') },
      ]"
      :style="{ gridColumn: day.weekday() + 1 }"
      @click="$emit('update:selected-value', day)"
    >
      {{ day.date() }}
    </div>
  </main>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import moment, { Moment } from 'moment'

import * as Utils from '@/utils'

@Component
export default class DaysInMonth extends Vue {
  @Prop({ type: moment }) startValue!: Moment
  @Prop({ type: moment }) selectedValue!: Moment

  get days() {
    const startDate = this.startValue.clone().local().startOf('month')
    const daysCount = startDate.daysInMonth() + startDate.weekday()
    const totalDaysCount = Utils.roundUp(daysCount, 7)
    return [...Array(totalDaysCount)].map((_, i) =>
      startDate.clone().add(i - startDate.weekday(), 'day'),
    )
  }

  get weekdays() {
    return moment.weekdaysMin(true)
  }

  get today() {
    return moment()
  }
}
</script>

<style lang="scss" scoped>
.cal-day {
  display: grid;
  grid-template-columns: repeat(7, 30px);
}

.cal-day > div {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1px;
}

.week-day {
  color: var(--default-foregroundDarkerColor);
}

.date-cell {
  cursor: pointer;
  margin: 1px;
  border-radius: 3px;
  color: var(--default-foregroundColor);

  &:hover {
    background-color: var(--default-backgroundDarker1Color);
  }
}

.diff-month {
  color: var(--default-foregroundDarkerColor);

  &.curr-day {
    color: var(--default-foregroundColor);
  }
}

.curr-day {
  background-color: var(--default-backgroundDarker2Color);
}

.today {
  border: solid silver;
  border-width: 0.5px;
}
</style>
