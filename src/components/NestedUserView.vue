<template>
  <UserView
    ref="ref"
    :args="args"
    :default-values="defaultValues"
    :scope="scope"
    :level="level"
    :filter="filterWords"
    :in-container="inContainer"
    :argument-editor-props="argumentEditorProps"
    @update:buttons="$emit('update:buttons', $event)"
    @goto="$emit('goto', $event)"
    @update:enable-filter="$emit('update:enable-filter', $event)"
    @update:title="$emit('update:title', $event)"
    @update:is-loading="$emit('update:is-loading', $event)"
    @update:argument-editor-props="$emit('update:argument-editor-props', $event)"
  />
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { convertToWords } from "@/utils";
import { IArgumentEditorProps } from "./ArgumentEditor.vue";

@Component
export default class NestedUserView extends Vue {
  @Prop({ type: Object, required: true }) args!: Record<string, unknown>;
  @Prop({ type: String, default: "no_scope" }) scope!: string;
  @Prop({ type: Number, required: true }) level!: number;
  @Prop({ type: String, required: true }) filterString!: string;
  @Prop({ type: Object, required: true }) defaultValues!: Record<string, unknown>;
  @Prop({ type: Boolean, default: false }) inContainer!: boolean;
  @Prop() argumentEditorProps!: IArgumentEditorProps | null;

  get filterWords() {
    const value = this.filterString;
    if (value !== "") {
      return Array.from(new Set(convertToWords(value.toString())));
    }
    return [];
  }
}

</script>
