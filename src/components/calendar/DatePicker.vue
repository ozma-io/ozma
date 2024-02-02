<template>
  <div class="all-days">
    <div class="select-panel">
      <div class="year-control">
        <span
          :class="[
            'select_panel_year',
            { 'material-button': mode === 'days' },
            { 'current-year': startValue.isSame(today, 'year') },
          ]"
          @click="mode = 'months'"
          >{{ startValue.format('YYYY') }}</span
        >
      </div>

      <span class="delimiter" />

      <div class="month-control">
        <span
          class="material-button material-icons md-18 month-arrow"
          @click="changeDate(-1)"
          >arrow_left</span
        >

        <span
          v-if="mode === 'days'"
          :class="[
            'select_panel_month material-button',
            { 'current-month': startValue.isSame(today, 'month') },
          ]"
          @click="mode = 'months'"
          >{{ startValue.format('MMM') }}</span
        >

        <span
          class="material-button material-icons md-18 month-arrow"
          @click="changeDate(1)"
          >arrow_right</span
        >
      </div>
    </div>
    <MonthsInYear
      v-if="mode === 'months'"
      :is-current-year="startValue.isSame(today, 'year')"
      @click="setMonth"
    />
    <DaysInMonth
      v-else-if="mode === 'days'"
      :selected-value="value"
      :start-value="startValue"
      @update:selected-value="$emit('update:value', $event)"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import moment, { Moment } from 'moment'

import DaysInMonth from '@/components/calendar/DaysInMonth.vue'
import MonthsInYear from '@/components/calendar/MonthsInYear.vue'

type Mode = 'days' | 'months'

@Component({
  components: { DaysInMonth, MonthsInYear },
})
export default class DatePicker extends Vue {
  @Prop({ type: moment, required: true }) value!: Moment

  private startValue: Moment = moment.invalid()
  private mode: Mode = 'days'

  created() {
    this.startValue = this.value.isValid() ? this.value : moment.utc()
  }

  get shownValue() {
    return this.value.isValid() ? this.value : moment.utc()
  }

  get today() {
    return moment()
  }

  @Watch('shownValue')
  private changeValue() {
    this.startValue = this.shownValue
  }

  private setMonth(month: number) {
    this.startValue = this.startValue.clone().month(month)
    this.mode = 'days'
  }

  private changeDate(increment: number) {
    if (this.mode === 'days') {
      this.startValue = this.startValue.clone().add(increment, 'months')
    } else if (this.mode === 'months') {
      this.startValue = this.startValue.clone().add(increment, 'years')
    }
  }
}
</script>

<style lang="scss" scoped>
.select-panel {
  display: flex;
  padding: 0 0.5rem;
}

.year-control {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 50%;
}

.month-control {
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 50%;
}

.month-arrow {
  border: none;
  border-radius: 3px;
}

.select_panel_year {
  margin-right: 10px;
  padding-right: 5px;
  padding-left: 5px;

  &.current-year {
    border: solid silver;
    border-width: 0.5px;
    border-radius: 3px;
  }
}

.delimiter {
  border-right: 1px solid var(--default-foregroundDarkerColor);
  width: 1px;
}

.select_panel_month {
  border: none;
  border-radius: 3px;
  padding-right: 5px;
  padding-left: 5px;

  &.current-month {
    border: solid silver;
    border-width: 0.5px;
  }
}
</style>
