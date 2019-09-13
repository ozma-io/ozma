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
                :key="day.valueOf()"
                :class="['date-cell',
                        {'diff-month' : !day.isSame(currShownDate, 'month')},
                        {'curr-day' : day.isSame(valueDate, 'day')}]"
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
    @Prop({ default: (new Date()) }) value!: Date;

    @Watch('value')
    watchValue(v: Date) {
      this.valueDate = moment(this.value);
    }

    private currShownDate: Moment = moment(this.value).isValid() ? moment(this.value) : moment();
    private valueDate: Moment = moment(this.value);
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

    private getWeekDayForCalendar(isoWeekDay: number) {
      if (isoWeekDay === 7) return 1;
      return isoWeekDay + 1;
    }

    private buildDaysInMonth(currDate?: Moment) {
      const startDate = currDate ? currDate.clone().startOf("month") : this.currShownDate.clone().startOf("month");
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
            this.buildDaysInMonth(date);
        }
        const newDate = date.clone().hour(this.valueDate.hour()).minute(this.valueDate.minute());
        this.currShownDate = newDate;
        this.updateValue(newDate);
    }

    private changeDate(val: number) {
        if (this.currMode.name === "days") {
            this.currShownDate.add(val, "month");
        } else if (this.currMode.name === "months") {
            this.currShownDate.add(val, "year");
        }
        this.buildCal(this.currShownDate);
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
