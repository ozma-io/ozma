<template>
  <b-list-group>
    <template
      v-for="(button, index) in buttons"
    >
      <ButtonGroup
        v-if="button.type === 'button-group'"
        :key="index"
        :button="button"
        list-item
        @goto="$emit('goto', $event)"
        @button-click="onClick"
      />
      <ButtonItem
        v-else
        :key="index"
        class="d-flex text-decoration-none"
        :button="button"
        list-item
        :list-item-has-right-margin="someButtonHasIcon"
        @goto="$emit('goto', $event)"
        @button-click="onClick"
      />
    </template>
  </b-list-group>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import type { IButton } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";

@Component({
  components: {
    ButtonItem,
  },
})
export default class ButtonList extends Vue {
  @Prop({ type: Array, required: true }) buttons!: IButton[];
  @Prop({ type: Boolean, default: false }) listItem!: boolean;

  private onClick() {
    this.$emit("button-click");
  }

  private get someButtonHasIcon() {
    return this.buttons.some(button => button.icon);
  }
}
</script>

<style lang="scss" scoped>
  .list-group {
    max-height: 60vh;
    overflow-y: auto;
  }
</style>
