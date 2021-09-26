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
        @goto="$emit('goto', $event)"
      />
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
import Popper from "vue-popperjs";

import type { IButtonGroup } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import ButtonView from "@/components/buttons/ButtonView.vue";
import ButtonList from "@/components/buttons/ButtonList.vue";
import { eventBus } from "@/main";

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
    eventBus.emit("close-all-button-groups", this.uid);
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
