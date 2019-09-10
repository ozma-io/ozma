<template>
    <div class="all-days">
        <div class="select-panel">
            <span> {{currShownDate.format("YYYY")}} </span>
            <span v-if="currMode.name === 'days'" @click="changeMode({name: 'months'})"> {{currShownDate.format("MMM")}} </span>
            <div class="actions">
                <span class="arrows" @click="changeDate(-1)">◀</span>
                <span class="arrows" @click="changeDate(1)">▶</span>
            </div>
        </div>
        <main v-if="currMode.name === 'days'" id="cal-day">
            <div v-for="(weekName, IweekName) in moment.weekdaysMin()" :key="IweekName">
                {{ weekName }}
                </div>
            <div v-for="(day, Iday) in allDays"
                :key="7 + Iday"
                :class="['date-cell',
                        {'diff-month' : !day.isSame(currShownDate, 'month')},
                        {'curr-day' : day.isSame(currShownDate, 'day')}]"
                @click="setValue(day)"
                :style="{ gridColumn: day.day() + 1 }">
                {{ day.format('D') }}
            </div>
        </main>
        <main v-else-if="currMode.name === 'months'" id="cal-month">
            <div v-for="(month, Imonth) in allMonths"
                  class="date-cell"
                 :key="Imonth"
                 @click="setMonth(Imonth)">
                 {{month}}
                 </div>
        </main>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import moment, { Moment, months, Duration } from "moment";
Vue.prototype.moment = moment;

interface IModeDays {
    name: "days";
}

interface IModeMonths {
    name: "months";
}

type IMode = IModeDays | IModeMonths;

@Component
export default class DaysInMonth extends Vue {
    @Prop({ default: moment() }) shownDate!: Moment;

    private currShownDate: Moment = (this.shownDate !== null && this.shownDate.isValid()) ? moment(this.shownDate) : moment();
    private allDays: Moment[] = [];
    private allMonths: string[] = [];
    private currMode: IMode = {name: "days"};

    private mounted() {
        this.buildCal();
    }

    private buildCal() {
        if (this.currMode.name === "days") {
            this.buildDaysInMonth();
        } else if (this.currMode.name === "months") {
            this.buildMonths();
        }
    }

    private buildDaysInMonth() {
        const startDate = this.currShownDate.startOf("month");
        let lenArr = startDate.daysInMonth() + startDate.day();
        if (lenArr > 28 && lenArr < 35) {
            lenArr = 35;
        } else if (lenArr > 35 && lenArr < 42) {
            lenArr = 42;
        }
        this.allDays = [...Array(lenArr)].map((_, i) => startDate.clone().add(i - startDate.day(), "day"));
    }

    private buildMonths() {
        this.allMonths = moment.monthsShort();
    }

    private setValue(date: Moment) {
        if (date.month() !== this.currShownDate.month()) {
            this.buildDaysInMonth();
        }
        this.currShownDate = date;
        this.updateShown();
        this.updateValue(date);
    }

    private changeDate(val: number) {
        if (this.currMode.name === "days") {
            this.currShownDate.add(val, "month");
        } else if (this.currMode.name === "months") {
            this.currShownDate.add(val, "year");
        }
        this.buildCal();
        this.updateShown();
    }

    private updateShown() {
        this.$emit("update:shown", this.currShownDate);
    }

    private updateValue(date: Moment) {
        this.$emit("update:value", date);
    }

    private changeMode(newMode: IMode) {
        this.currMode = newMode;
        this.buildCal();

    }

    private setMonth(val: number) {
        this.currShownDate.month(val);
        this.changeMode({name: "days"});
        this.buildCal();
    }
}
</script>

<style scoped>
    #cal-day {
      display: grid;
      grid-template-columns: repeat(7, 30px);
    }
    #cal-day > div {
      align-items: center;
      display: flex;
      justify-content: center;
      margin: 1px;
    }
    #cal-month {
        display: grid;
        grid-template-columns: repeat(4, 40px);
    }
    #cal-month > div {
        text-align: center;
    }
    .actions {
        float: right;
    }
    .actions > span {
        margin-left: 5px;
        cursor: pointer;
    }
    .date-cell {
        cursor: pointer;
        background-color: white;
        opacity: 0.5;
        color: black;
        margin: 1px;
    }
    .diff-month {
        color: darkgrey;
    }
    .curr-day {
        background-color: #FA0000;
        color: #FFFFFF;
    }
</style>
