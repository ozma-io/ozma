<template>
  <popper
    trigger="clickToToggle"
    :options="{
      placement: listItem ? 'left-start' : 'bottom-end',
      modifiers: { 
        offset: { offset: '10px,10px' },

        // Nested poppers cannot appear outside the parent element if overflow is enabled.
        preventOverflow: { enabled: !listItem },
        hide: { enabled: !listItem }, 
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
            list-item
            @goto="$emit('goto', $event)"
          />
          <ButtonItem
            v-else 
            :key="index"
            class="d-flex text-decoration-none"
            :button="button"
            list-item
            @goto="$emit('goto', $event)"
          /> 
        </template>
      </b-list-group>
    </div>
     <ButtonView 
      slot="reference"
      :list-item="listItem"
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
  @Prop({ type: Boolean, default: false }) listItem!: boolean;
}
</script>