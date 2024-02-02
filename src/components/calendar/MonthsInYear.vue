<template>
  <main class="cal-month">
    <div
      v-for="(month, monthI) in months"
      :key="monthI"
      :class="[
        'material-button date-cell',
        { 'current-month': isCurrentYear && month === currentMonth },
      ]"
      @click="$emit('click', monthI)"
    >
      {{ month }}
    </div>
  </main>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import moment from 'moment'

@Component
export default class MonthsInYear extends Vue {
  @Prop({ type: Boolean }) isCurrentYear!: boolean

  private months = moment.monthsShort()
  private currentMonth = moment().format('MMM')
}
</script>

<style lang="scss" scoped>
.cal-month {
  display: grid;
  grid-template-columns: repeat(4, 40px);
  padding: 5px;
}

.cal-month > div {
  text-align: center;
}

.date-cell {
  cursor: pointer;
  margin: 3px;
  border: none;
  border-radius: 3px;
  color: var(--MainTextColor);

  &.current-month {
    border: solid silver;
    border-width: 0.5px;
  }
}
</style>
