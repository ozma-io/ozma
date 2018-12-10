<template>
    <pre :id="id"></pre>
</template>

<script lang="ts">
    // https://github.com/ajaxorg/ace/pull/3835
    // import * as Ace from "ace-builds"
    // @ts-ignore
    import * as Ace from "ace-builds/src-noconflict/ace.js"
    import { Component, Prop, Vue, Watch } from "vue-property-decorator"
    import { randomId } from "@/utils"

    @Component
    export default class CodeEditor extends Vue {
        private id = randomId()
        private editor: Ace.Ace.Editor | null = null

        @Prop({ default: "" }) private content!: string
        @Prop({ default: "" }) private mode!: string
        @Prop({ default: "" }) private theme!: string
        @Prop({ default: false }) private readOnly!: boolean

        private mounted() {
            const preId = document.getElementById(this.id)
            if (preId === null) {
                throw new Error("Editor id not found")
            }
            const editor = Ace.edit(preId)
            this.editor = editor
            editor.session.setMode(this.mode)
            editor.setTheme(this.theme)
            editor.setValue(this.content, 1)

            editor.on("change", () => {
                this.$emit("update:content", editor.getValue())
            })
        }

        @Watch("content")
        private onUpdateContent(val: string, oldVal: string) {
            if (this.editor !== null) {
                if (val !== this.editor.getValue()) {
                    this.editor.setValue(val, 1)
                }
            }
        }

        @Watch("mode")
        private onUpdateMode() {
            if (this.editor !== null) {
                this.editor.session.setMode(this.mode)
            }
        }

        @Watch("theme")
        private onUpdateTheme() {
            if (this.editor !== null) {
                this.editor.setTheme(this.theme)
            }
        }
    }
</script>

<style scoped lang="scss">
    .ace_editor {
        position: relative;
        width: 100%;
        height: 200px;
    }
</style>
