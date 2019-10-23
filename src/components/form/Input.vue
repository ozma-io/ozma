<template>
    <div :class="[
                 'input_container',
                 {'input_container__row': inline}
                 ]">
        <input class="input_field"
            :id="inputName"
            :type="type"
            :value="value"
            @input="$emit('update:value', $event.target.value)"
        >
        <label :class="['input_label', { 'input_label__no_content': !hasContent}]"
            :for="inputName"
            v-if="label"
        >
            {{ label }}
        </label>
        <div class="input_label__spacer"></div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component
export default class Input extends Vue {
    @Prop({ type: String }) label!: string;
    @Prop({ type: String }) value!: string;
    @Prop({ type: String }) error!: string;
    @Prop({ type: String }) warning!: string;
    @Prop({ type: Number }) height!: number;
    @Prop({ type: Boolean }) disabled!: boolean;
    @Prop({ type: Boolean, default: true }) inline!: boolean;
    @Prop({ type: String, default: "text" }) type!: string;

    private get inputName(): string {
        return `${this.uid}-input`;
    }

    private get hasContent(): boolean {
        if (typeof this.value === "string") {
            return this.value.length > 0;
        }
        else return !!this.value;
    }


}

</script>

<style lang="scss" scoped>
 .input_container {
     position: relative;
     display: inline-flex;
     flex-direction: column;
 }
 .input_container__row {
     flex-direction: row;
 }
 .input_label {
     position: absolute;
     align-self: flex-start;
     transition: all 0.5s linear;
     left: -50%;
     order: 1;
 }
 .input_label__no_content {
     z-index: 1;
     left: 0;
 }
 .input_label__spacer {
     display: inline-block;
     flex: 1;
     order: 0;
 }
 .input_label__spacer::after {
     content: '';
 }
 .input_field {
     padding: 5px 2px 5px 0;
     background-color: rgba(0, 0, 0, 0);
     border: 0px;
     z-index: 2;
     border-bottom: 1px solid black;
     order: 2;
     flex: 2;
     cursor: pointer;
 }
</style>
