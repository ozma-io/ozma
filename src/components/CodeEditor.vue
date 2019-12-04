<template>
    <MonacoEditor :language="language" :value="content" @change="onChange" />
</template>

<script lang="ts">
// Breaks often with new TypeScript versions
// import * as Ace from "ace-builds"
// @ts-ignore
import * as Ace from "ace-builds/src-noconflict/ace.js";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import MonacoEditor from "vue-monaco";
// outputs a lot of crap into /dist
// import "ace-builds/webpack-resolver"
import "ace-builds/src-noconflict/mode-pgsql";

@Component({ components: { MonacoEditor } })
export default class CodeEditor extends Vue {
    @Prop({ default: "" }) content!: string;
    @Prop({ default: "" }) mode!: string;
    @Prop({ default: "" }) theme!: string;
    @Prop({ default: false }) readOnly!: boolean;
    @Prop({ default: false }) autofocus!: boolean;
    @Prop({ default: "MySQL", type: String }) language!: string;

    editor: Ace.Ace.Editor | null = null;
    // Workaround for Ace editor's bug: it calls on(change) with an empty string during an update.
    isUpdating = false;

    private mounted() {
        const editor = Ace.edit(this.$refs.pre as Element);
        this.editor = editor;
        editor.session.setMode(this.mode);
        editor.setTheme(this.theme);
        editor.setValue(this.content, 1);
        editor.getSession().setUndoManager(new Ace.UndoManager());

        if (this.autofocus) {
            editor.focus();
        }

        editor.on("change", () => {
            if (!this.isUpdating) {
                const newValue = editor.getValue();
                this.$emit("update:content", newValue);
            }
        });
    }

    private onChange(value: string) {
        if (!this.isUpdating) {
            this.$emit("update:content", value);
        }
    }

    @Watch("content")
    private onUpdateContent(val: string, oldVal: string) {
        if (this.editor !== null) {
            if (val !== this.editor.getValue()) {
                this.isUpdating = true;
                this.editor.setValue(val, 1);
                this.isUpdating = false;
            }
        }
    }

    @Watch("mode")
    private onUpdateMode() {
        if (this.editor !== null) {
            this.editor.session.setMode(this.mode);
        }
    }

    @Watch("theme")
    private onUpdateTheme() {
        if (this.editor !== null) {
            this.editor.setTheme(this.theme);
        }
    }
}
</script>

<style scoped>
    .ace_editor {
        width: 100%;
        height: 100%;
    }
</style>
