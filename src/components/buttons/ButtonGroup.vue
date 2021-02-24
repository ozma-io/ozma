<template>
  <b-dropdown 
    right 
    size="sm"
    menu-class="shadow border rounded p-0 "
    toggle-class="d-flex align-items-center p-1"
    variant="light" 
    :no-caret="!button.title"
  >
    <template #button-content>
      <ButtonContent 
        :button="button" 
        :is-button="true" 
      />
    </template>
    
    <template 
      v-for="(button, index) in button.buttons"
    >
      <ButtonItem 
        class="d-flex text-decoration-none"
        :key="index"
        :button="button"
        :is-button="false"
        @goto="$emit('goto', $event)"
      />
    </template>
  </b-dropdown>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import type { Button } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import ButtonContent from "@/components/buttons/ButtonContent.vue";

@Component({ 
  components: {
    ButtonItem,
    ButtonContent,
  } 
})
export default class ButtonsPanel extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
}
</script>