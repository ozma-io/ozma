<template>
    <div class="main_cal">
        <div class="days">
            <DaysInMonth
                :shownDate="shownDate"
                @update:shown="updateShownDate($event)"
                @update:value="updateValueDate($event)"
            />
        </div>
        <div class="time">
            <Time v-if="showTime"
                @update:mins="updateMins($event)"
                @update:hours="updateHours($event)"
            />
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import moment, { Moment, months, Duration } from "moment";
import {dateFormat, dateTimeFormat} from "@/values";

Vue.prototype.moment = moment;

@Component({
    components: {
        DaysInMonth: () => import("@/components/calendar/DaysInMonth.vue"),
        Time: () => import("@/components/calendar/Time.vue"),
    },
})
export default class Calendar extends Vue {
    @Prop({ default: "" }) value!: string;
    @Prop({ default: true }) showTime!: boolean;

    private contentDate: Moment = moment(this.value, dateFormat);
    private shownDate: Moment = (this.contentDate.isValid()) ? this.contentDate.local() : moment().local();

    private updateValueDate(date: Moment) {
        this.$emit("update:value", date.format(this.showTime ? dateTimeFormat : dateFormat));
    }

    private updateShownDate(date: Moment) {
        this.shownDate = date.minute(this.shownDate.minute())
                             .hour(this.shownDate.hour());
    }

    private updateMins(val: number) {
        this.shownDate.minute(val);
        this.updateValueDate(this.shownDate);
    }

    private updateHours(val: number) {
        this.shownDate.hour(val);
        this.updateValueDate(this.shownDate);
    }
}
</script>

<style scoped>
    .days {
        display: inline-flex;
        margin-right: 10px;
    }
    .time {
        display: inline-flex;
    }
</style>