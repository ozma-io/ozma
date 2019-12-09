<template>
    <div class="all-days">
        <div class="select-panel">
            <span class="select_panel_year">{{ startValue.format("YYYY") }}</span>
            <span class="select_panel_month" v-if="mode === 'days'" @click="mode = 'months'">{{ startValue.format("MMM") }}</span>
            <div class="actions">
                <span class="arrows" @click="changeDate(-1)">◀</span>
                <span class="arrows" @click="changeDate(1)">▶</span>
            </div>
        </div>
        <MonthsInYear v-if="mode === 'months'" @click="setMonth" />
        <DaysInMonth v-else-if="mode === 'days'"
                :selectedValue="value"
                :startValue="startValue"
                @update:selectedValue="$emit('update:value', $event)" />
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import moment, { Moment } from "moment";

import DaysInMonth from "@/components/calendar/DaysInMonth.vue";
import MonthsInYear from "@/components/calendar/MonthsInYear.vue";

type Mode = "days" | "months";

@Component({
    components: { DaysInMonth, MonthsInYear },
})
export default class DatePicker extends Vue {
    @Prop({ type: moment }) value!: Moment;

    private startValue: Moment = this.value.isValid()
                                  ? this.value
                                  : moment.utc();
    private mode: Mode = "days";

    get shownValue() {
        return this.value.isValid() ? this.value : moment.utc();
    }

    @Watch("shownValue")
    private changeValue() {
        this.startValue = this.shownValue;
    }

    private setMonth(month: number) {
        this.startValue = this.startValue.clone().month(month);
        this.mode = "days";
    }

    private changeDate(increment: number) {
        if (this.mode === "days") {
            this.startValue = this.startValue.clone().add(increment, "months");
        } else if (this.mode === "months") {
            this.startValue = this.startValue.clone().add(increment, "years");
        }
    }
}
</script>

<style scoped>
    .actions {
        float: right;
    }
    .actions > span {
        margin-left: 5px;
        cursor: pointer;
    }
    .select_panel_year {
        margin-right: 5px;
        padding-right: 5px;
        border-right: 1px solid var(--MainBorderColor);
    }
</style>
