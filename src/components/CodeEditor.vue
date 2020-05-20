<template>
  <MonacoEditor
    :class="{'monaco-editor_modal': isModal}"
    :value="content"
    :options="options"
    @change="onChange"
    @focus="$emit('focus', $event)"
    @editorDidMount="onEditorMounted"
  />
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
  @Prop({ default: "sql", type: String }) mode!: string;
  @Prop({ default: "" }) theme!: string;
  @Prop({ default: false }) readOnly!: boolean;
  @Prop({ default: false }) autofocus!: boolean;
  @Prop({ default: false }) isModal!: boolean;

  get options() {
    return {
      language: this.mode,
      readOnly: this.readOnly,
    };
  }

  private onEditorMounted(editor: any) {
    if (this.autofocus) {
      editor.focus();
    }
  }

  private onChange(value: string) {
    this.$emit("update:content", value);
  }
}
</script>

<style>
  .monaco-editor_modal {
    height: 350px;
  }

  /* https://stackoverflow.com/questions/58271107/offset-between-text-and-cursor-with-the-monaco-editor-angular-under-chrome-m */
  .monaco-editor {
    font-size: unset;
  }
</style>
