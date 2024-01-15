<template>
  <div
    class="buttons-panel"
  >
    <!-- TODO: Make better keys for buttons -->
    <template v-for="(button, i) in buttons">
      <ButtonGroup
        v-if="button.type === 'button-group' && button.buttons.length > 0"
        :key="button.icon + button.caption + button.tooltip + i"
        class="button-element"
        :button="button"
        @goto="$emit('goto', $event)"
      />
      <ButtonItem
        v-else
        :key="button.icon + button.caption + button.tooltip + i"
        :class="[
          'button-element text-decoration-none',
          {
            'flex-grow': button.caption,
          },
        ]"
        :button="button"
        @goto="$emit('goto', $event)"
      />
    </template>
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
}
</script>

<style lang="scss" scoped>
  .buttons-panel {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .flex-grow {
    flex-grow: 1;
  }
</style>
