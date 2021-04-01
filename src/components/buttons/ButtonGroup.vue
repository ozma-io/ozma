<template>
  <popper
    ref="popup"
    trigger="clickToToggle"
    :visible-arrow="false"
    :options="{
      placement: (listItem && !$isMobile) ? 'left-start' : 'bottom-end',
      modifiers: {
        offset: { offset: '0, 0' },
        // Nested poppers cannot appear outside the parent element if overflow is enabled.
        preventOverflow: { enabled: !listItem },
        hide: { enabled: !listItem },
      }
    }"
  >
    <div class="popper shadow">
      <b-list-group>
        <template
          v-for="(button, index) in button.buttons"
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
    </div>
    <!-- eslint-disable vue/no-deprecated-slot-attribute -->
    <ButtonView
      slot="reference"
      :list-item="listItem"
      :button="button"
    />
  </popper>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import type { IButtonGroup } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import ButtonView from "@/components/buttons/ButtonView.vue";

import Popper from "vue-popperjs";

@Component({
  components: {
    ButtonItem,
    ButtonView,
    Popper,
  },
})
export default class ButtonsPanel extends Vue {
  @Prop({ type: Object, required: true }) button!: IButtonGroup;
  @Prop({ type: Boolean, default: false }) listItem!: boolean;

  private async closeGroup() {
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    await popupRef.doClose();
  }

  private onClick() {
    this.$emit("button-click");

    void this.closeGroup();
  }

  private get someButtonHasIcon() {
    return this.button.buttons.some(button => button.icon);
  }
}
</script>

<style lang="scss" scoped>
  .popper {
    border: none;
  }

  .list-group {
    max-height: 60vh;
    overflow-y: auto;
  }

</style>
