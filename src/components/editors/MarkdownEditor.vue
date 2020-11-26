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
  />
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import 'codemirror/lib/codemirror.css';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/toastui-editor-viewer.css';

import { Editor, Viewer } from '@toast-ui/vue-editor';
import '@toast-ui/editor/dist/i18n/ru-ru';

type EditorType = Vue & { invoke: (name: string) => any };

@Component({ components: { Editor, Viewer } })
export default class CodeEditor extends Vue {
  @Prop({ type: String }) content!: string;
  @Prop({ type: Number }) height!: number;
  @Prop({ type: String, default: "markdown" }) editType!: string;
  @Prop({ default: false }) readOnly!: boolean;

  private key = 0;
  private editorOptions = {
    minHeight: '200px',
    useCommandShortcut: true,
    useDefaultHTMLSanitizer: true,
    usageStatistics: false,
    hideModeSwitch: false,
    language: this.$root.$i18n.locale,
    placeholder: this.$t('input_placeholder'),
    toolbarItems: [
      'heading',
      'bold',
      'italic',
      'strike',
      'divider',
      'hr',
      'quote',
      'divider',
      'ul',
      'ol',
      'task',
      'indent',
      'outdent',
      'divider',
      'table',
      'image',
      'link',
      'divider',
      'code',
      'codeblock'
    ]
  };

  private onChange() {
    const editor = this.$refs.editor as EditorType;
    this.$emit('update:content', editor.invoke('getMarkdown'));
  }

  @Watch('editType')
  private reloadComponent() {
    this.key++;
  }

}
</script>