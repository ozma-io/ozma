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
    />
  </router-link>

  <FunLink
    v-else-if="button.type === 'link'"
    :link="button.link"
    @goto="$emit('goto', $event)"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
    />
  </FunLink>

  <span
    v-else-if="button.type === 'callback'"
    @click="button.callback()"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
    />
  </span>

  <label
    v-else-if="button.type === 'upload-file'"
    class="m-0"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
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

@Component({
  components: {
    ButtonView,
  },
})
export default class ButtonItem extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) listItem!: Button;

  private uploadFile(input: HTMLInputElement, next: (file: File) => void) {
    const files = input.files as FileList;
    next(files[0]);
  }
}
</script>
