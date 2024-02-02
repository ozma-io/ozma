<template>
  <div class="checkbox" @click="$emit('change', !checked)">
    <i class="material-icons">{{
      indeterminate
        ? 'indeterminate_check_box'
        : checked
        ? 'check_box'
        : 'check_box_outline_blank'
    }}</i>
    <span v-if="label" class="label">{{ label }}</span>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component({
  model: {
    prop: 'checked',
    event: 'change',
  },
})
export default class Checkbox extends Vue {
  @Prop({ default: false, type: Boolean }) checked!: boolean
  @Prop({ default: false, type: Boolean }) indeterminate!: boolean
  @Prop({ type: String }) label!: string
}
</script>

<style lang="scss" scoped>
.checkbox {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  cursor: pointer;
  padding-top: 1.25rem;
  width: 100%;
  height: 100%;
  color: #777c87;

  &:active,
  &:hover {
    background-color: #efefef;
  }
}
.label {
  color: var(--MainTextColorLight);
}
</style>
