<template>
  <span
    class="checkbox"
    @click="$emit('change', !checked)"
  >
    <span class="checkbox__input">
      <i
        class="material-icons"
      >{{ indeterminate ? "indeterminate_check_box" : checked ? "check_box" : "check_box_outline_blank" }}</i>
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
import { Component, Prop, Vue } from "vue-property-decorator";

@Component(
  {
    model: {
      prop: "checked",
      event: "change",
    },
  },
)
export default class Checkbox extends Vue {
  @Prop({ default: false, type: Boolean }) checked!: boolean;
  @Prop({ default: false, type: Boolean }) indeterminate!: boolean;
  @Prop({ type: String }) label!: string;
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
