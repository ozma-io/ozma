<template>
  <Input
    :id="id"
    :value="stringValue"
    :disabled="disabled"
    :autofocus="autofocus"
    :is-cell-edit="isCellEdit"
    @input="updateInput"
    @focus="$emit('focus')"
    @move-selection-next-row="$emit('move-selection-next-row')"
    @move-selection-next-column="$emit('move-selection-next-column')"
  />
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import Input from "@/components/form/Input.vue";

@Component({ components: { Input } })
export default class ArrayInput extends Vue {
  @Prop() value!: any;
  @Prop({ type: Boolean }) disabled!: boolean;
  @Prop({ type: String }) id!: string;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;

  private get stringValue() {
    return JSON.stringify(this.value);
  }

  private updateInput(value: string) {
    if (value === this.stringValue) return;

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        this.$emit("update:value", parsed);
      }
    } catch (e) {
      //
    }
  }
}
</script>
