<template>
  <li
    v-if="listItem"
    variant="light"
    class="d-flex list-group-item list-group-item-action p-2"
  >
    <ButtonContent
      :button="button"
      list-item
    />
  </li>

  <b-button
    v-else
    v-b-tooltip.hover.noninteractive
    class="d-flex p-0-5 btn-sm mr-1"
    variant="light"
    :title="button.tooltip"
  >
    <ButtonContent
      :button="button"
    />
  </b-button>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import type { Button } from "@/components/buttons/buttons";
import ButtonContent from "@/components/buttons/ButtonContent.vue";

@Component({
  components: {
    ButtonContent,
  },
})
export default class ButtonView extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) listItem!: boolean;
}
</script>

<style lang="scss" scoped>
 .list-group-item {
   cursor: pointer;
   text-align: left;
 }
</style>
