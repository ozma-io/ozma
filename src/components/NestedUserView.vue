<template>
  <UserView
    :args="args"
    :default-values="defaultValues"
    :scope="scope"
    :level="level"
    :filter="filterWords"
    @update:buttons="$emit('update:buttons', $event)"
    @goto="$emit('goto', $event)"
    @update:enableFilter="$emit('update:enableFilter', $event)"
    @update:title="updateTitle"
    @update:isLoading="$emit('update:isLoading', $event)"
  />
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { convertToWords } from "@/utils";

@Component
export default class NestedUserView extends Vue {
  @Prop({ type: Object, required: true }) args!: Record<string, unknown>;
  @Prop({ type: String, required: true }) scope!: string;
  @Prop({ type: Number, required: true }) level!: number;
  @Prop({ type: String, required: true }) filterString!: string;
  @Prop({ type: Object, required: true }) defaultValues!: Record<string, unknown>;

  private isLoading = true;

  get filterWords() {
    const value = this.filterString;
    if (value !== "") {
      return Array.from(new Set(convertToWords(value.toString())));
    }
    return [];
  }

  updateTitle(title: string | null) {
    this.$emit("update:title", title);
  }
}

</script>
