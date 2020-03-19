<template>
  <div class="checkbox" @click="$emit('change', !checked)">
    <div class="checkbox__input">
      <i v-if="checked" class="material-icons md-24">check_box</i>
      <i v-else class="material-icons md-24">check_box_outline_blank</i>
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

  .checkbox__input {
    display: flex;
    align-items: center;
  }

  .checkbox__label {
    margin: 0;
    padding-left: 10px;
    cursor: pointer;
    color: var(--MainTextColorLight);
  }
</style>
