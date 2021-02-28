<template>
  <popper
    trigger="clickToToggle"
    :options="{
      placement: showCaption ? 'left' : 'bottom',
      modifiers: { 
        offset: { offset: '10px,10px' },
        preventOverflow: { enabled: !showCaption }, 
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
            show-caption
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
      </b-list-group>
    </div>
     <ButtonView 
      slot="reference"
      :show-caption="showCaption"
      :button="button"
    />
  </popper>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

import type { Button } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import ButtonContent from "@/components/buttons/ButtonContent.vue";
import ButtonView from "@/components/buttons/ButtonView.vue";

import Popper from "vue-popperjs";

@Component({ 
  components: {
    ButtonItem,
    ButtonContent,
    ButtonView,
    Popper,
  } 
})
export default class ButtonsPanel extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) showCaption!: boolean;
}
</script>