<i18n>
  {
    "en": {
        "input_placeholder": "Empty"
    },
    "ru": {
        "input_placeholder": "Пусто"
    }
  }
</i18n>
<template>
  <div>
    <viewer
      v-if="readOnly"
      :initial-value="content"
      :height="`${height}px`"
    />
    <editor
      v-else
      :key="key"
      ref="editor"
      :initial-value="content"
      :initial-edit-type="editType"
      :options="editorOptions"
      :height="`${height}px`"
      preview-style="tab"
      @change="onChange"
      @focus="onFocus"
      @blur="onBlur"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import "codemirror/lib/codemirror.css";
import "@toast-ui/editor/dist/toastui-editor.css";
import "@toast-ui/editor/dist/toastui-editor-viewer.css";

import { Editor, Viewer } from "@toast-ui/vue-editor";
import "@toast-ui/editor/dist/i18n/ru-ru";

type EditorType = Vue & { invoke: (name: string, ...args: any) => any };

export type MarkdownEditType = "markdown" | "wysiwyg";

@Component({ components: { Editor, Viewer } })
export default class MarkdownEditor extends Vue {
  @Prop({ type: String }) content!: string;
  @Prop({ type: Number }) height!: number;
  @Prop({ type: String, default: "markdown" }) editType!: MarkdownEditType;
  @Prop({ default: false }) readOnly!: boolean;
  // TODO: implement.
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;

  private suppressOnChange = false;
  private key = 0;
  private editorOptions: Record<string, unknown> = {};

  created() {
    this.editorOptions = {
      minHeight: "205px",
      useCommandShortcut: true,
      useDefaultHTMLSanitizer: true,
      usageStatistics: false,
      hideModeSwitch: false,
      language: this.$root.$i18n.locale,
      placeholder: this.$t("input_placeholder"),
      autofocus: false,
    };
  }

  private onFocus(evt: Event) {
    this.$root.$emit("form-input-focused"); // FIXME: figure it out why we need it
    this.$emit("focus", evt);
  }

  private onBlur(evt: Event) {
    this.$emit("blur", evt);
  }

  private onChange() {
    if (this.suppressOnChange) return;

    const editor = this.$refs.editor as EditorType;
    const newValue = (editor.invoke("getMarkdown") as string).trim();
    this.$emit("update:content", newValue);
  }

  @Watch("editType")
  private reloadComponent() {
    this.key++;
  }

  @Watch("content")
  private updateContent(content: string) {
    const editor = this.$refs.editor as EditorType | undefined;
    if (!editor) return;

    const oldContent = (editor.invoke("getMarkdown") as string).trim();
    if (oldContent === content) return;

    this.suppressOnChange = true;
    editor.invoke("setMarkdown", content, false);
    this.suppressOnChange = false;
  }
}
</script>

<style lang="scss" scoped>
  ::v-deep {
    .tui-editor-defaultUI {
      border-color: var(--MainBorderColor);
      border-radius: 4px;
      overflow: hidden;
    }

    .te-mode-switch-section {
      height: 25px;
    }

    .te-preview {
      background-color: var(--default-backgroundDarker1Color);
    }
  }
</style>
