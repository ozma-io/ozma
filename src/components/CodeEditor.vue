<template>
    <MonacoEditor :language="mode"
        :value="content"
        @change="onChange"
        @focus="$emit('focus', $event)" />
</template>

<script lang="ts">
// Breaks often with new TypeScript versions
// import * as Ace from "ace-builds"
// @ts-ignore
import * as Ace from "ace-builds/src-noconflict/ace.js";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import MonacoEditor from "vue-monaco";

@Component({ components: { MonacoEditor } })
export default class CodeEditor extends Vue {
    @Prop({ default: "" }) content!: string;
    @Prop({ default: "MySQL", type: String }) mode!: string;
    @Prop({ default: "" }) theme!: string;
    @Prop({ default: false }) readOnly!: boolean;
    @Prop({ default: false }) autofocus!: boolean;

    private onChange(value: string) {
        this.$emit("update:content", value);
    }
}
</script>
