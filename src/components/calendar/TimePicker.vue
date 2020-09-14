<template>
  <div class="time">
    <span
      v-show="hours !== null"
      class="hours"
    >
      <div>hours</div>
      <div :class="['wrapper', {'with-margin': hours.range.length > 5}]">
        <div
          v-for="(el, Iel) in hours.range"
          :key="Iel"
          class="time-cell"
          @click="nextValH(Iel, $event)"
        >
          {{ el.text }}
        </div>
      </div>
    </span>
    <span
      v-show="mins !== null"

      class="mins"
    >
      <div>minutes</div>
      <div :class="['wrapper', {'with-margin': mins.range.length > 5}]">
        <div
          v-for="(el, Iel) in mins.range"
          :key="Iel"
          class="time-cell"
          @click="nextValM(Iel, $event)"
        >
          {{ el.text }}
        </div>
      </div>
    </span>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

interface ITimeRange {
  min: number;
  max: number;
  value: number | null;
  text: string;
}

interface ITimeRangeAll {
  range: ITimeRange[];
  history: { min: number; max: number }[];
  steps: number[];
  currStep: number;
}

const numToText2 = (num: number) => {
  return  (num < 10) ? `0${num}` : `${num}`;
};

const getRange = (min: number, max: number, step: number) => {
  const range: ITimeRange[] = [];
  for (let i = min; i < max; i += step ) {
    const el: ITimeRange = {min: -1, max: -1, value: i, text: `${numToText2(i)}`};
    range.push(el);
  }
  return range;
};

const DateRange = (min: number, max: number, steps: number[]): ITimeRangeAll => {
  const stepsTmp = steps.length > 0 ? steps : [1];
  return {
    steps: stepsTmp,
    range: getRange(min, max, stepsTmp[0]),
    history: [],
    currStep: 0,
  };
};

@Component
export default class TimePicker extends Vue {
  @Prop({ type: Number, default: null }) timeStep!: number | null;

  private hours: ITimeRangeAll = DateRange(0, 24, [1]);
  private mins: ITimeRangeAll = DateRange(0, 60, [this.step]);

  get step() {
    return (!!this.timeStep)
      ? this.timeStep
      : 15
  }

  private nextValM(rng: number, event: Event) {
    event.preventDefault();
    if (this.mins !== null) {
      this.$emit("update:mins", this.mins.range[rng].value);
    }
  }

  private nextValH(rng: number, event: Event) {
    event.preventDefault();
    if (this.hours !== null) {
      this.$emit("update:hours", this.hours.range[rng].value);
    }
  }
}
</script>

<style scoped>
  .time {
    flex-direction: row !important;
  }

  .hours {
    display: inline;
    min-width: 70px;
    margin-right: 10px;
    text-align: center;
  }

  .mins {
    min-width: 70px;
    display: inline;
    text-align: center;
  }

  .time-cell {
    background-color: white;
    opacity: 0.5;
    margin: 3px;
    color: black;
    border-radius: 3px;
    cursor: pointer;
  }

  .wrapper {
    max-height: 148px;
    overflow-y: auto;
  }

  .with-margin .time-cell {
    margin-left: 8px;
  }

  .wrapper::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    background-color: var(--MainBorderColor);
  }

  .wrapper::-webkit-scrollbar {
    width: 8px;
    background-color: var(--MainBorderColor);
  }

  .wrapper::-webkit-scrollbar-thumb {
    width: 10px;
    border-radius: 10px;
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.1);
    background-color: var(--MainTextColorLight);
  }
</style>
