<template>
  <b-list-group>
    <template v-for="(button, index) in buttons">
      <div v-if="button.type === 'divider'" :key="index" class="button-divider">
        <div class="divider-top" />
        <div class="divider-bottom" />
      </div>
      <ButtonGroup
        v-else-if="button.type === 'button-group'"
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
import { Component, Vue, Prop } from 'vue-property-decorator'

import type { IButton } from '@/components/buttons/buttons'
import ButtonItem from '@/components/buttons/ButtonItem.vue'

@Component({
  components: {
    ButtonItem,
  },
})
export default class ButtonList extends Vue {
  @Prop({ type: Array, required: true }) buttons!: IButton[]
  @Prop({ type: Boolean, default: false }) listItem!: boolean

  private onClick(button: IButton) {
    this.$emit('button-click', button)
  }

  private get someButtonHasIcon() {
    return this.buttons.some((button) => button.icon)
  }
}
</script>

<style lang="scss" scoped>
.list-group {
  max-height: 60vh;
  overflow-y: auto;
}

.divider-top {
  opacity: 0.1;
  border-bottom: 1px solid #565656;
  height: 0.75rem;
}
.divider-bottom {
  height: 0.75rem;
}
</style>
