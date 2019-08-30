<template>
    <div class="all-days">
        <div class="select-panel">
            <span> {{currShownDate.format("YYYY")}} </span>
            <span> {{currShownDate.format("MMM")}} </span>
            <div class="actions">
                <span class="arrows" @click="changeMonth(-1)">◀</span>
                <span class="arrows" @click="changeMonth(1)">▶</span>
            </div>
        </div> 
        <main id="cal">
            <div v-for="(weekName, IweekName) in moment.weekdaysMin()" :key="IweekName">
                {{ weekName }}
                </div>
            <div v-for="(day, Iday) in allDays"
                :key="7 + Iday"
                :class="['day',
                        {'diff-month' : !day.isSame(currShownDate, 'month')},
                        {'curr-day' : day.isSame(currShownDate, 'day')}]"
                @click="setValue(day)"
                :style="{ gridColumn: day.day() + 1 }">
                {{ day.format('D') }}
            </div>
        </main>
    </div>
</template>

<script lang="ts">
    import { Component, Prop, Vue, Watch } from "vue-property-decorator"
    import moment, { Moment, months, Duration } from "moment"
    Vue.prototype.moment = moment
    
    @Component
    export default class DaysInMonth extends Vue {
        @Prop({ default: moment() }) shownDate!: Moment

        private currShownDate: Moment = (this.shownDate !== null && this.shownDate.isValid()) ? moment(this.shownDate) : moment()
        private allDays: Moment[] | null = null

        private mounted() {
            this.buildDayInMonth(this.currShownDate)
        }

        private buildDayInMonth(data: Moment) {
            const startDate = moment(data).startOf("month")
            let lenArr = startDate.daysInMonth() + startDate.day()
            if (lenArr > 28 && lenArr < 35) {
                lenArr = 35
            } else if (lenArr > 35 && lenArr < 42) {
                lenArr = 42
            }
            this.allDays = [...Array(lenArr)].map((_, i) => startDate.clone().add(i - startDate.day(), "day"))
        }

        private setValue(date: Moment) {
            if (date.month() !== this.currShownDate.month()) {
                this.buildDayInMonth(date)
            }
            this.currShownDate = date
            this.updateShown()
            this.updateValue(date)
        }

        private changeMonth(val: number) {
            this.buildDayInMonth(this.currShownDate.add(val, "month"))
            this.updateShown()
        }

        private updateShown() {
            this.$emit("update:shown", this.currShownDate)
        }

        private updateValue(date: Moment) {
            this.$emit("update:value", date)
        }
    }
</script>

<style scoped>
    #cal {
      display: grid;
      grid-template-columns: repeat(7, 30px);
    }
    #cal > div {
      align-items: center;
      display: flex;
      justify-content: center;
      margin: 1px;
    }
    .actions {
        float: right;
    }
    .actions > span {
        margin-left: 5px;
        cursor: pointer;
    }
    .day {
        cursor: pointer;
        background-color: white;
        opacity: 0.5;
        color: black;
    }
    .diff-month {
        color: darkgrey;
    }
    .curr-day {
        color: darkred;
    }
</style>