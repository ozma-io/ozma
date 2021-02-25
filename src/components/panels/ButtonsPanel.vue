<template>
  <div class="d-flex align-items-center">
    <template v-for="(button, i) in buttons">
      
      <ButtonGroup
        v-if="button.type === 'button-group'" 
        :key="i"
          class="mr-1"
        :button = "button" 
        @goto="$emit('goto', $event)"
      />
      <ButtonItem
        v-else 
        :key="i"
        class="text-decoration-none mr-1"
        :button="button"
        :is-button="true"
        @goto="$emit('goto', $event)"
      /> 

    </template>
    <slot 
      class="mr-1"
      name="search-panel"
    />
    <ButtonGroup
      :button = "extraButton" 
      @goto="$emit('goto', $event)"
    />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import type { Button } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import ButtonGroup from "@/components/buttons/ButtonGroup.vue";

@Component({ 
  components: {
    ButtonItem,
    ButtonGroup,
  } 
})
export default class ButtonsPanel extends Vue {
  @Prop({ type: Array, required: true }) buttons!: Button[];
  @Prop({ type: Object, required: true }) extraButton!: Button;
}
</script>