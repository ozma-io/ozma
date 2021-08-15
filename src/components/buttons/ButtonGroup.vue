<template>
  <popper
    ref="popup"
    trigger="clickToOpen"
    :visible-arrow="false"
    :options="{
      placement: (listItem && !$isMobile) ? 'left-start' : 'bottom-end',
      positionFixed: true,
      modifiers: {
        offset: { offset: '0, 0' },
        // Nested poppers cannot appear outside the parent element if overflow is enabled.
        preventOverflow: { enabled: !listItem, boundariesElement: 'viewport' },
        hide: { enabled: !listItem },
      }
    }"
  >
    <div class="popper shadow">
      <ButtonList :buttons="button.buttons" />
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
import ButtonList from "@/components/buttons/ButtonList.vue";

import Popper from "vue-popperjs";

@Component({
  components: {
    ButtonItem,
    ButtonView,
    ButtonList,
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
