<template>
  <div :class="['code-editor', { 'monaco-editor_modal': isModal }]" />
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import * as monaco from "monaco-editor";

import { CurrentSettings } from "@/state/settings";

const settings = namespace("settings");

@Component
export default class CodeEditor extends Vue {
  @settings.State("current") settings!: CurrentSettings;

  @Prop({ default: "" }) content!: string;
  @Prop({ default: "sql", type: String }) language!: string;
  @Prop({ default: "" }) theme!: string;
  @Prop({ default: false }) readOnly!: boolean;
  @Prop({ default: false }) autofocus!: boolean;
  @Prop({ default: false }) isModal!: boolean;

  editor: monaco.editor.IStandaloneCodeEditor | null = null;

  get options(): monaco.editor.IStandaloneEditorConstructionOptions {
    const fontSize = this.settings.getEntry("font_size", Number, 12);

    const options: monaco.editor.IStandaloneEditorConstructionOptions = {
      language: this.language,
      readOnly: this.readOnly,
      automaticLayout: true,
      lineNumbersMinChars: 3,
      scrollbar: { useShadows: false },
      fontSize,
    };

    const mobileOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
      minimap: { enabled: false },
      lineNumbers: "off",
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
    };

    return this.$isMobile ? { ...options, ...mobileOptions } : options;
  }

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
    editor.onDidFocusEditorWidget(() => {
      this.$root.$emit("form-input-focused");
      this.$emit("focus");
    });
    editor.onDidBlurEditorWidget(() => {
      this.$emit("blur");
    });
    editor.onDidChangeModelContent(event => {
      const content = editor.getValue();
      if (content !== this.content) {
        this.$emit("update:content", content);
      }
    });
    this.editor = editor;
    if (this.autofocus) {
      // FIXME: With the next line autofocus work for the first table cell open
      //        with codeeditor. But close the edit cell for a second time.
      // editor.focus();
    }
  }

  @Watch("autofocus")
  private onAutofocus(autofocus: boolean) {
    if (autofocus && this.editor) {
      this.editor.focus();
    }
  }

  private beforeDestroy() {
    this.editor!.dispose();
  }
}
</script>

<style lang="scss" scoped>
  .code-editor {
    border: 1px solid var(--MainBorderColor);
    border-radius: 4px;
    overflow: hidden;
  }

  .monaco-editor_modal {
    height: 350px;
  }
</style>
