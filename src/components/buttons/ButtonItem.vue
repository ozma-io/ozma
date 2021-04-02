<template>
  <hr
    v-if="button.type === 'empty'"
  >
  <!-- Passing v-on:click to v-bind doesn't seem to work, hence this ugly solution -->
  <router-link
    v-else-if="button.type === 'location'"
    class="text-decoration-none"
    :to="button.location"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
      :phantom-icon="listItemHasRightMargin"
    />
  </router-link>

  <span
    v-else-if="button.type === 'link' && button.link.type === 'action' && isReadonlyDemoInstance"
    @click="onClickLinkReadonlyDemoInstance"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
      :phantom-icon="listItemHasRightMargin"
    />
  </span>
  <FunLink
    v-else-if="button.type === 'link'"
    :link="button.link"
    @goto="$emit('goto', $event)"
    @click="onClickLink"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
      :phantom-icon="listItemHasRightMargin"
    />
  </FunLink>

  <span
    v-else-if="button.type === 'callback'"
    @click="onClickCallback"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
      :phantom-icon="listItemHasRightMargin"
    />
  </span>

  <label
    v-else-if="button.type === 'upload-file'"
    class="m-0"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
      :phantom-icon="listItemHasRightMargin"
    />
    <input
      v-visible="false"
      class="position-fixed"
      type="file"
      @change="uploadFile($event.target, button.uploadFile)"
    >
  </label>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import ButtonView from "@/components/buttons/ButtonView.vue";
import type { Button } from "@/components/buttons/buttons";
import { isReadonlyDemoInstance } from "@/api";
import { eventBus } from "@/main";

@Component({
  components: {
    ButtonView,
  },
})
export default class ButtonItem extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) listItem!: boolean;
  @Prop({ type: Boolean, default: false }) listItemHasRightMargin!: boolean;

  private uploadFile(input: HTMLInputElement, next: (file: File) => void) {
    const files = input.files as FileList;
    next(files[0]);
  }

  private get isReadonlyDemoInstance() {
    return isReadonlyDemoInstance;
  }

  private onClickLinkReadonlyDemoInstance() {
    eventBus.emit("showReadonlyDemoModal");
  }

  private onClickLink() {
    this.$emit("button-click");
  }

  private onClickCallback() {
    this.$emit("button-click");

    if (this.button.type === "callback") {
      this.button.callback();
    }
  }
}
</script>
