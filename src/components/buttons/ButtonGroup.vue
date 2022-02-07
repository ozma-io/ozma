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
    @show="onShow"
  >
    <div class="popper shadow">
      <ButtonList
        :buttons="button.buttons"
        @button-click="onInnerButtonClick"
        @goto="$emit('goto', $event)"
      />
    </div>
    <!-- eslint-disable vue/no-deprecated-slot-attribute -->
    <ButtonView
      slot="reference"
      :list-item="listItem"
      :button="button"
      @click.capture="onReferenceClick"
    />
  </popper>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import Popper from "vue-popperjs";

import type { IButtonGroup } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import ButtonView from "@/components/buttons/ButtonView.vue";
import ButtonList from "@/components/buttons/ButtonList.vue";
import { eventBus } from "@/main";
import { waitTimeout } from "@/utils";

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

  private mounted() {
    /* eslint-disable @typescript-eslint/unbound-method */
    eventBus.on("close-all-button-groups", this.syncCloseGroup);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private beforeDestroy() {
    /* eslint-disable @typescript-eslint/unbound-method */
    eventBus.off("close-all-button-groups", this.syncCloseGroup);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private async onReferenceClick() {
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    if (!this.listItem && popupRef.showPopper) {
      // vue-popper doesn't have trigger for behavior "toggle on click, close on click outside",
      // so I use little hacks there and with "close-all-button-groups" instead.
      await waitTimeout(10);
      popupRef.doClose();
    }
  }

  private syncCloseGroup(uid?: string) {
    if (this.uid !== uid) {
      void this.closeGroup();
    }
  }

  private async closeGroup() {
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    await popupRef.doClose();
  }

  private onShow() {
    if (!this.listItem) {
      eventBus.emit("close-all-button-groups", this.uid);
    }
  }

  private onInnerButtonClick() {
    this.$emit("button-click");

    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    if (!this.listItem && popupRef.showPopper) {
      popupRef.doClose();
    }
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
