<template>
    <div class="time">
        <span class="hours" v-show="hours !== null">
            <div @click="prevVal(hours)">hours</div>
            <div v-for="(el, Iel) in hours.range"
                    :key="Iel"
                    @click="nextValH(Iel, $event)"
                    class="time-cell">
                {{el.text}}
            </div>
        </span>
        <span class="mins" v-show="mins !== null">
            <div @click="prevVal(mins)">minutes</div>
            <div v-for="(el, Iel) in mins.range"
                    :key="Iel"
                    @click="nextValM(Iel, $event)"
                    class="time-cell">
                {{el.text}}
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
    history: Array<{ min: number, max: number }>;
    steps: number[];
    currStep: number;
}

const nextRange = (el: ITimeRangeAll, rng: number) => {
    const step = el.steps[el.currStep + 1];
    if (step === undefined) {
        return null;
    }
    const currEl = el.range[rng];
    if (currEl.value !== null) {
        return null;
    }
    const range = getRange(currEl.min, currEl.max + 1, step);
    const firstEl = el.range[0];
    const lastEl = el.range[el.range.length - 1];
    el.history.push({min: firstEl.value === null ? firstEl.min : firstEl.value,
                     max: lastEl.value === null ? lastEl.max + 1 : lastEl.value + 1});
    el.range = range;
    el.currStep++;
    return el;
};

const prevRange = (el: ITimeRangeAll) => {
    if (el.currStep === 0) {
        return null;
    }
    const hist = el.history.pop();
    if (hist !== undefined) {
        el.range = getRange(hist.min, hist.max, el.steps[--el.currStep]);
    } else {
        return null;
    }
};

const numToText2 = (num: number) => {
    return  (num < 10) ? `0${num}` : `${num}`;
};

const getRange = (min: number, max: number, step: number) => {
    const range: ITimeRange[] = [];
    for (let i = min; i < max; i += step ) {
        let el: ITimeRange;
        if (max - i > 2 && step > 1) {
            el = {min: i, max: Math.min(i + step - 1, max - 1), value: null, text: ""};
        } else {
            el = {min: -1, max: -1, value: i, text: ""};
        }
        if (el.value === null) {
            el.text = `${numToText2(el.min)} - ${numToText2(el.max + 1)}`;
        } else {
            el.text = `${numToText2(el.value)}`;
        }
        range.push(el);
    }
    return range;
};

const DateRange = (min: number, max: number, steps: number[]) => {
    const stepsTmp = steps.length > 0 ? steps : [1];
    return {
        steps: stepsTmp,
        range: getRange(min, max, stepsTmp[0]),
        history: [],
        currStep: 0,
    } as ITimeRangeAll;
};

@Component
export default class TimePicker extends Vue {
    private hours: ITimeRangeAll | null = null;
    private mins: ITimeRangeAll | null = null;
    private hours = DateRange(0, 24, [6, 1]);
    private mins = DateRange(0, 60, [15, 5, 1]);

    private nextValM(rng: number, event) {
        event.preventDefault();
        if (this.mins !== null && nextRange(this.mins, rng) === null) {
            this.$emit("update:mins", this.mins.range[rng].value);
        }
    }

    private nextValH(rng: number, event) {
        event.preventDefault();
        if (this.hours !== null && nextRange(this.hours, rng) === null) {
            this.$emit("update:hours", this.hours.range[rng].value);
        }
    }

    private prevVal(el: ITimeRangeAll) {
        prevRange(el);
    }
}
</script>

<style scoped>
    .hours {
        display: inline;
        min-width: 70px;
        margin-right: 10px;
        cursor: pointer;
        text-align: center;
    }
    .mins {
        min-width: 70px;
        display: inline;
        cursor: pointer;
        text-align: center;
    }
    .time-cell {
        background-color: white;
        opacity: 0.5;
        margin: 1px;
        color: black;
    }
</style>
