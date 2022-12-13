<i18n>
  {
    "en": {
      "hours": "hours",
      "mins": "minutes"
    },
    "ru": {
      "hours": "часы",
      "mins": "минуты"
    },
    "es": {
      "hours": "Las horas",
      "mins": "Los minutos"
    }
  }
</i18n>

<template>
  <div class="time">
    <span
      class="hours"
    >
      <div>{{ $t('hours') }}</div>
      <div
        ref="wrapperHours"
        :class="['wrapper', {'with-margin': hours.length > 5}]"
      >
        <div
          v-for="hourItem in hours"
          ref="hours"
          :key="hourItem.value"
          :class="['time-cell', {'select-cell': hour === hourItem.value}]"
          @click.prevent="$emit('update:hour', hourItem.value)"
        >
          {{ hourItem.text }}
        </div>
      </div>
    </span>
    <span
      class="mins"
    >
      <div>{{ $t('mins') }}</div>
      <div
        ref="wrapperMins"
        :class="['wrapper', {'with-margin': mins.length > 5}]"
      >
        <div
          v-for="minItem in mins"
          ref="mins"
          :key="minItem.value"
          :class="['time-cell', {'select-cell': min === minItem.value}]"
          @click.prevent="$emit('update:min', minItem.value)"
        >
          {{ minItem.text }}
        </div>
      </div>
    </span>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

interface ITimeValue {
  value: number;
  text: string;
}

const getTimeRange = (min: number, max: number, step: number): ITimeValue[] => {
  const range: ITimeValue[] = [];
  for (let i = min; i < max; i += step) {
    const text = String(i).padStart(2, "0");
    range.push({ value: i, text });
  }
  return range;
};

const scrollTo = (wrapper: HTMLElement, target: HTMLElement) => {
  wrapper.scroll(0, target.offsetTop - target.clientHeight / 2 - wrapper.clientHeight / 2);
};

@Component
export default class TimePicker extends Vue {
  @Prop({ type: Number }) hour!: number | undefined;
  @Prop({ type: Number }) min!: number | undefined;
  @Prop({ type: Number, default: 15 }) minsStep!: number;

  private hours = getTimeRange(0, 24, 1);

  get mins() {
    return getTimeRange(0, 60, this.minsStep);
  }

  scrollToValue() {
    const hourIndex = this.hours.findIndex(hour => this.hour === hour.value);
    if (hourIndex !== -1) {
      const hours = this.$refs["hours"] as HTMLElement[];
      scrollTo(this.$refs["wrapperHours"] as HTMLElement, hours[hourIndex]);
    }

    const minIndex = this.mins.findIndex(min => this.min === min.value);
    if (minIndex !== -1) {
      const mins = this.$refs["mins"] as HTMLElement[];
      scrollTo(this.$refs["wrapperMins"] as HTMLElement, mins[minIndex]);
    }
  }

  mounted() {
    this.scrollToValue();
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

  .select-cell {
    background-color: var(--MainBorderColor);
    border-radius: 3px;
    color: var(--MainTextColor);
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
