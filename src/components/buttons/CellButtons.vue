<template>
  <div class="buttons d-flex flex-wrap">
    <ButtonItem 
      v-for="(button, i) in buttons"
      :key="i"
      class="text-decoration-none mr-1"
      :button="button"
      @goto="$emit('goto', $event)"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import type { ICombinedValue } from "@/user_views/combined";

import type { Button } from "@/components/buttons/buttons";
import { attrToButtons } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";

import { currentValue } from "@/user_views/combined";

@Component({ 
  components: {
    ButtonItem,
  } 
})
export default class CellButtons extends Vue {
  @Prop({ type: Object, required: true }) value!: ICombinedValue;

  get buttons(): Button[] {
    return attrToButtons(currentValue(this.value));
  }
}
</script>
