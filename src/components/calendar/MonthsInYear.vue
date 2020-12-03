<template>
  <main class="cal-month">
    <div
      v-for="(month, monthI) in months"
      :key="monthI"
      class="date-cell"
      @click="$emit('click', monthI)"
    >
      {{ month }}
    </div>
  </main>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import moment from "moment";

@Component
export default class MonthsInYear extends Vue {
  get months() {
    return moment.monthsShort();
  }
}
</script>

<style scoped>
  .cal-month {
    display: grid;
    grid-template-columns: repeat(4, 40px);
  }

  .cal-month > div {
    text-align: center;
  }

  .date-cell {
    cursor: pointer;
    color: var(--MainTextColor);
    margin: 1px;
  }
</style>
