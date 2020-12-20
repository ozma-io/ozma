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
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import Monaco from "monaco-editor";
import MonacoEditor from "vue-monaco";

import { CurrentSettings } from "@/state/settings";

const settings = namespace("settings");

@Component({ components: { MonacoEditor } })
export default class CodeEditor extends Vue {
  @settings.State("current") settings!: CurrentSettings;

  @Prop({ default: "" }) content!: string;
  @Prop({ default: "sql", type: String }) language!: string;
  @Prop({ default: "" }) theme!: string;
  @Prop({ default: false }) readOnly!: boolean;
  @Prop({ default: false }) autofocus!: boolean;
  @Prop({ default: false }) isModal!: boolean;

  get options(): Monaco.editor.IStandaloneEditorConstructionOptions {
    const fontSize = this.settings.getEntry("font_size", Number, 14);

    return {
      language: this.language,
      readOnly: this.readOnly,
      fontSize,
    };
  }

<<<<<<< HEAD
  @Watch("options")
  private updateOptions(newOptions: monaco.editor.IStandaloneEditorConstructionOptions) {
    if (this.editor !== null) {
      this.editor.updateOptions(newOptions);
    }
  }

  @Watch("content")
  private updateContent(content: string) {
    if (this.editor !== null && this.editor.getValue() !== content) {
      this.editor.setValue(content);
    }
  }

  private mounted() {
    const editor = monaco.editor.create(this.$el as HTMLElement, {
      ...this.options,
      value: this.content,
    });
    editor.onDidChangeModelContent(event => {
      const content = editor.getValue();
      if (content !== this.content) {
        this.$emit("update:content", content);
      }
    });
    this.editor = editor;
=======
  private onEditorMounted(editor: Monaco.editor.IStandaloneCodeEditor) {
>>>>>>> parent of 283a037c (Drop vue-monaco)
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
</style>
