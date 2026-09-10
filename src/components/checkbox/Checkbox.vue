<template>
  <div
    class="checkbox"
    :style="color ? { '--checkbox-color': color } : {}"
    @click="$emit('change', !checked)"
  >
    <svg v-if="indeterminate" class="checkbox-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <rect class="checkbox-rect checked" x="1" y="1" width="16" height="16" rx="4" ry="4"/>
      <line x1="4" y1="9" x2="14" y2="9" class="checkbox-mark" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <svg v-else-if="checked" class="checkbox-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <rect class="checkbox-rect checked" x="1" y="1" width="16" height="16" rx="4" ry="4"/>
      <polyline points="4,9 7.5,13 14,5" fill="none" class="checkbox-mark" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <svg v-else class="checkbox-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <rect class="checkbox-rect" x="1" y="1" width="16" height="16" rx="4" ry="4"/>
    </svg>
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
  @Prop({ type: String }) color!: string
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

  --checkbox-fill: var(--checkbox-background, var(--default-foregroundColor, #2c3038));
  --checkbox-check: var(--checkbox-foreground, var(--default-backgroundColor, white));

  &:active,
  &:hover {
    background-color: var(--default-backgroundDarker2Color, #efefef);
  }
}
.checkbox-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.checkbox-rect {
  fill: none;
  stroke: var(--default-borderColor, #b0b5bf);
  stroke-width: 1.5;

  &.checked {
    fill: var(--checkbox-fill);
    stroke: var(--checkbox-fill);
  }
}
.checkbox-mark {
  stroke: var(--checkbox-check);
}
.label {
  color: var(--MainTextColorLight);
}
</style>
