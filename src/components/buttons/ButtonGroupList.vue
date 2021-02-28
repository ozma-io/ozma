<template>
  <popper
    trigger="clickToToggle"
    :options="{
      placement: 'right',
      modifiers: { 
        offset: { offset: '0,10px' },
        preventOverflow: { boundariesElement: 'window'}
      }
    }"
  >
    <div class="popper">
      <template 
        v-for="(button, index) in button.buttons"
      >
        <ButtonGroupList
          v-if="button.type === 'button-group'" 
          :key="index"
          :button="button" 
          @goto="$emit('goto', $event)"
        />
        <ButtonItem
          v-else 
          :key="index"
          class="d-flex text-decoration-none"
          :button="button"
          show-caption
          @goto="$emit('goto', $event)"
        /> 
      </template>
    </div>
 
    <b-button
      slot="reference"
      block
      squared
      class="d-flex p-0-5"
      variant="light" 
    >
      <ButtonContent 
        :button="button"
        show-caption
      />
    </b-button>
  </popper>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import type { Button } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import ButtonView from "@/components/buttons/ButtonContent.vue";

import Popper from "vue-popperjs";

@Component({ 
  components: {
    Popper,
    ButtonItem,
    ButtonView,
  } 
})
export default class ButtonsPanel extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
}
</script>