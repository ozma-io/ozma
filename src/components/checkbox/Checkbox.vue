<template>
  <div class="checkbox" @click="$emit('change', !checked)">
    <div class="checkbox__input">
      <svg v-if="checked" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9
        2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      <svg v-else="" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
        <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
        <path d="M0 0h24v24H0z" fill="none"/>
      </svg>
    </div>
    <div class="checkbox__label" v-if="label">{{label}}</div>
  </div>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from "vue-property-decorator";

    @Component(
        {
            model: {
                prop: "checked",
                event: "change",
            },
        },
    )
    export default class Checkbox extends Vue {
        @Prop({default: false, type: Boolean}) checked!: boolean;
        @Prop({type: String}) label!: string;
    }
</script>

<style scoped>
  .checkbox {
    display: inline-flex;
    align-items: center;
  }

  .checkbox__label {
    margin: 0;
    padding-left: 10px;
    cursor: pointer;
    color: var(--MainTextColorLight);
  }
</style>
