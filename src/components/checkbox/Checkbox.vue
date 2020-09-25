<template>
  <span
    class="checkbox"
    @click="$emit('change', !checked)"
  >
    <span class="checkbox__input">
      <i
        v-if="checked"
        style="font-size: 20px;"
        class="material-icons md-20"
      >check_box</i>
      <i
        v-else
        style="font-size: 20px;"
        class="material-icons md-20"
      >check_box_outline_blank</i>
    </span>
    <span
      v-if="label"
      class="checkbox__label"
    >
      {{ label }}
    </span>
  </span>
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
  .checkbox__label {
    cursor: pointer;
    color: var(--MainTextColorLight);
  }

  .checkbox-cells > span > span > i {
    position: absolute;
    top: 6px;
    left: 9px;
  }
</style>
