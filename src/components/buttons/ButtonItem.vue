<template>
  <hr
    v-if="button.type === 'empty'"
  >
  <!-- Passing v-on:click to v-bind doesn't seem to work, hence this ugly solution -->
  <router-link
    v-else-if="button.type === 'location'"
    :to="button.location"
  >
    <ButtonView 
      :button="button"
      :show-caption="showCaption"
    />
  </router-link>

  <FunLink
    v-else-if="button.type === 'link'"
    :link="button.link"
    @goto="$emit('goto', $event)"
  >
    <ButtonView 
      :button="button"
      :show-caption="showCaption"
    />
  </FunLink>

  <span
    v-else-if="button.type === 'callback'"
    @click="button.callback()"
  >
    <ButtonView 
      :button="button"
      :show-caption="showCaption"
    />
  </span>

  <label
    v-else-if="button.type === 'upload-file'"
  >
    <ButtonView 
      :button="button"
      :show-caption="showCaption"
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
  } 
})
export default class ButtonItem extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) showCaption!: Button;

  private uploadFile(input: HTMLInputElement, next: (file: File) => void) {
    const files = input.files as FileList;
    next(files[0]);
  }
}
</script>