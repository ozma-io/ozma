<template>
  <div
    :class="[
      'd-flex align-items-center',
      {
        'flex-wrap': wrapButtons,
      },
    ]"
  >
    <template v-for="(button, i) in buttons">
      <ButtonGroup
        v-if="button.type === 'button-group' && button.buttons.length > 0"
        :key="i"
        class="button-group"
        :button="button"
        @goto="$emit('goto', $event)"
      />
      <ButtonItem
        v-else
        :key="i"
        :class="[
          'button-item text-decoration-none',
          {
            'flex-grow-1': button.name,
          },
        ]"
        :button="button"
        @goto="$emit('goto', $event)"
      />
    </template>
    <slot name="search-panel" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import type { Button } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import ButtonGroup from "@/components/buttons/ButtonGroup.vue";

@Component({
  components: {
    ButtonItem,
    ButtonGroup,
  },
})
export default class ButtonsPanel extends Vue {
  @Prop({ type: Array, required: true }) buttons!: Button[];

  // Is true in TableCells and probably somewhere else.
  private get wrapButtons() {
    return this.buttons?.[this.buttons.length - 1]?.icon !== "more_vert";
  }
}
</script>

<style lang="scss" scoped>
  .button-group,
  .button-item {
    margin: 0.1rem;
  }
</style>
