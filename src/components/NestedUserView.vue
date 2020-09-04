<template>
  <UserView
    :args="args"
    :default-values="defaultValues"
    :indirect-links="indirectLinks"
    :scope="scope"
    :level="level"
    :filter="filterWords"
    @update:actions="$emit('update:actions', $event)"
    @goto="$emit('goto', $event)"
    @update:enableFilter="$emit('update:enableFilter', $event)"
  />
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { convertToWords } from "@/utils";

@Component
export default class FormControl extends Vue {
  
  @Prop({ type: Object, required: true }) args!: Record<string, any>;
  @Prop({ type: String, required: true }) scope!: string;
  @Prop({ type: Number, required: true }) level!: number;
  @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
  @Prop({ type: String, required: true }) filterString!: string;
  @Prop({ type: Object, required: true }) defaultValues!: Record<string, any>;

  get filterWords(){
    const value = this.filterString;
    if (value !== "") {
      return Array.from(new Set(convertToWords(value.toString())));
    }
    return [];
  }

}
  
</script>