<template>
    <pre ref="pre"></pre>
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
        @Prop({ default: "" }) content!: string
        @Prop({ default: "" }) mode!: string
        @Prop({ default: "" }) theme!: string
        @Prop({ default: false }) readOnly!: boolean

        editor: Ace.Ace.Editor | null = null
        // Workaround for Ace editor's bug: it calls on(change) with an empty string during an update.
        isUpdating = false

        private mounted() {
            const editor = Ace.edit(this.$refs.pre)
            this.editor = editor
            editor.session.setMode(this.mode)
            editor.setTheme(this.theme)
            editor.setValue(this.content, 1)

            editor.on("change", () => {
                if (!this.isUpdating) {
                    const newValue = this.editor.getValue()
                    this.$emit("update:content", newValue)
                }
            })
        }

        @Watch("content")
        private onUpdateContent(val: string, oldVal: string) {
            if (this.editor !== null) {
                if (val !== this.editor.getValue()) {
                    this.isUpdating = true
                    this.editor.setValue(val, 1)
                    this.isUpdating = false
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

<style lang="sass">
    .ace_editor
        position: relative
        width: 100%
        height: 500px
</style>
