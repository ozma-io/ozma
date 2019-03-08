<template>
    <span>
        <ActionsMenu v-if="type.name === 'userview'"
                        title="*"
                        :actions="actions" />

        <b-form-checkbox v-if="type.name === 'check'"
                            :id="column.name"
                            :value="value"
                            @input="$emit('update:value', $event)"
                            :disabled="column.updateField === null || locked" />
        <b-form-textarea v-else-if="type.name === 'textarea'"
                            :id="column.name"
                            :value="valueText"
                            @input="$emit('update:value', $event)"
                            :disabled="column.updateField === null || locked"
                            :rows="3"
                            :max-rows="6"
                            :required="type.required" />
        <CodeEditor v-else-if="type.name === 'codeeditor'"
                    :content="valueText"
                    @update:content="$emit('update:value', $event)"
                    :readOnly="column.updateField === null || locked" />
        <UserView v-else-if="type.name === 'userview'"
                    :uv="value"
                    @update:actions="actions = $event" />
        <b-form-select v-else-if="type.name === 'select'"
                        :id="column.name"
                        :value="valueText"
                        @input="$emit('update:value', $event)"
                        :disabled="column.updateField === null || locked"
                        :options="type.options" />
        <!-- We don't use bootstrap-vue's b-form-input type=text because of problems with Safari
                https://github.com/bootstrap-vue/bootstrap-vue/issues/1951
        -->
        <input v-else-if="type.type === 'text'"
                class="form-control"
                :id="column.name"
                :value="valueText"
                @input="$emit('update:value', $event.target.value)"
                type="text"
                :disabled="column.updateField === null || locked"
                :required="type.required" />
        <b-form-input v-else
                        :id="column.name"
                        :value="valueText"
                        @input="$emit('update:value', $event)"
                        :type="type.type"
                        :disabled="column.updateField === null || locked"
                        :required="type.required" />
    </span>
</template>

<script lang="ts">
    import { Component, Vue, Prop } from "vue-property-decorator"
    import { IResultColumnInfo } from "@/api"
    import { IAction } from "@/components/ActionsMenu.vue"

    export interface ITextType {
        name: "text"
        type: "text" | "number"
        required: boolean
    }

    export interface ITextAreaType {
        name: "textarea"
        required: boolean
    }

    export interface ICodeEditorType {
        name: "codeeditor"
    }

    export interface ISelectOption {
        text: string
        value: string
    }

    export interface ISelectType {
        name: "select"
        options: ISelectOption[]
    }

    export interface ICheckType {
        name: "check"
    }

    export interface IUserViewType {
        name: "userview"
    }

    export type IType = ITextType | ITextAreaType | ICodeEditorType | ISelectType | ICheckType | IUserViewType

    @Component({
        components: {
            CodeEditor: () => import("@/components/CodeEditor.vue"),
        },
    })
    export default class FormControl extends Vue {
        @Prop({ type: Object }) column!: IResultColumnInfo
        @Prop({ type: Object }) type!: IType
        // Can be undefined which means failed validation.
        @Prop() value!: any
        @Prop({ type: String }) valueText!: string
        @Prop({ type: Boolean }) locked!: boolean

        private actions: IAction[] = []
    }
</script>
