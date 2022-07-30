<template>
  <!-- Passing v-on:click to v-bind doesn't seem to work, hence this ugly solution -->
  <router-link
    v-if="button.type === 'location'"
    class="text-decoration-none"
    :to="button.location"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
      :phantom-icon="listItemHasRightMargin"
      :align-right="alignRight"
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
      :align-right="alignRight"
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
      :align-right="alignRight"
      :tabindex="-1"
    />
  </FunLink>

  <ButtonView
    v-else-if="button.type === 'callback'"
    :button="button"
    :list-item="listItem"
    :phantom-icon="listItemHasRightMargin"
    :align-right="alignRight"
    @click="onClickCallback"
  />

  <label
    v-else-if="button.type === 'upload-file'"
    class="m-0"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
      :phantom-icon="listItemHasRightMargin"
      :align-right="alignRight"
    />
    <input
      v-visible="false"
      class="position-fixed"
      type="file"
      @change="uploadFile($event.target, button.uploadFile)"
    >
  </label>

  <ButtonView
    v-else
    :button="button"
    :list-item="listItem"
    :phantom-icon="listItemHasRightMargin"
    :align-right="alignRight"
  />
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { namespace } from "vuex-class";

import ButtonView from "@/components/buttons/ButtonView.vue";
import type { Button } from "@/components/buttons/buttons";
import { eventBus } from "@/main";
import { CurrentSettings } from "@/state/settings";
import { CurrentAuth, INoAuth } from "@/state/auth";

const settings = namespace("settings");
const auth = namespace("auth");

@Component({
  components: {
    ButtonView,
  },
})
export default class ButtonItem extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) listItem!: boolean;
  @Prop({ type: Boolean, default: false }) listItemHasRightMargin!: boolean;
  @Prop({ type: Boolean, default: false }) alignRight!: boolean;
  @settings.State("current") settings!: CurrentSettings;
  @auth.State("current") auth!: CurrentAuth | INoAuth | null;

  private uploadFile(input: HTMLInputElement, next: (file: File) => void) {
    const files = input.files as FileList;
    next(files[0]);
  }

  private get isReadonlyDemoInstance() {
    return this.settings.getEntry("is_read_only_demo_instance", Boolean, false) && !this.auth?.token;
  }

  private onClickLinkReadonlyDemoInstance() {
    eventBus.emit("show-readonly-demo-modal");
  }

  private onClickLink() {
    this.$emit("button-click", this.button);
  }

  private onClickCallback() {
    this.$emit("button-click", this.button);

    if (this.button.type === "callback") {
      this.button.callback();
    }
  }
}
</script>
