<i18n>
    {
        "en": {
            "item_not_found": "Record not found",
            "changes_saved": "Changes saved",
            "submit_error": "Error while submitting changes: {msg}",
            "save": "Save",
            "revert_changes": "Revert changes",
            "delete": "Delete",
            "delete_confirmation": "Are you sure want to delete this record?",
            "ok": "OK",
            "cancel": "Cancel"
        },
        "ru-RU": {
            "item_not_found": "Запись не найдена",
            "changes_saved": "Изменения сохранены",
            "submit_error": "Ошибка сохранения изменений: {msg}",
            "save": "Сохранить",
            "revert_changes": "Откатить изменения",
            "delete": "Удалить",
            "delete_confirmation": "Вы действительно хотите удалить эту запись?",
            "ok": "ОК",
            "cancel": "Отмена"
        }
    }
</i18n>

<template>
    <b-container fluid>
        <b-alert variant="success" dismissible :show="showSuccess" @dismissed="showSuccess = false">
            {{ $t('changes_saved') }}
        </b-alert>
        <b-alert variant="danger" dismissible :show="lastError !== null" @dismissed="lastError = null">
            {{ $t('submit_error', { msg: lastError }) }}
        </b-alert>

        <h5 v-if="fields === null">
            {{ $t('item_not_found') }}
        </h5>
        <b-form v-else @submit.prevent="updateRecord" @reset.prevent="resetRecord">
            <template v-for="field in fields">
                <b-form-group :key="field.column.name" :label-for="field.column.name">
                    <b-form-checkbox v-if="field.isNullable"
                                     slot="label"
                                     :id="field.column.name + '__notnull'"
                                     :disabled="field.column.updateField === null"
                                     v-model="field.updatedIsNotNull">
                        {{ field.caption }}
                    </b-form-checkbox>
                    <template v-else slot="label">
                        {{ field.caption }}
                    </template>

                    <b-form-checkbox v-if="field.type.name === 'check'"
                                    :id="field.column.name"
                                    v-model="field.updatedValue"
                                    :disabled="field.column.updateField === null || !field.updatedIsNotNull" />
                    <b-form-textarea v-else-if="field.type.name === 'textarea'"
                                    :id="field.column.name"
                                    v-model="field.updatedValue"
                                    :disabled="field.column.updateField === null"
                                    :rows="3"
                                    :max-rows="6" />
                    <b-form-select v-else-if="field.type.name === 'select'"
                                :id="field.column.name"
                                v-model="field.updatedValue"
                                :disabled="field.column.updateField === null || !field.updatedIsNotNull"
                                :options="field.type.options" />
                    <b-form-input v-else
                                :id="field.column.name"
                                v-model="field.updatedValue"
                                :type="field.type.type"
                                :disabled="field.column.updateField === null || !field.updatedIsNotNull"
                                :required="field.type.required" />
                </b-form-group>
            </template>

            <b-button v-if="uv.updateEntity !== null" type="submit" variant="primary">{{ $t('save') }}</b-button>
            <b-button v-if="uv.updateEntity !== null" type="reset" variant="secondary">{{ $t('revert_changes') }}</b-button>
            <!-- FIXME FIXME FIXME don't look at user! -->
            <b-button v-if="uv.updateEntity !== null && uv.rows !== null && currentAuth.header.sub === 'root'" variant="danger" v-b-modal.deleteConfirm>{{ $t('delete') }}</b-button>

            <b-modal id="deleteConfirm" ok-variant="danger" :ok-title="$t('ok')" @ok="deleteRecord" :cancel-title="$t('cancel')">
                {{ $t('delete_confirmation') }}
            </b-modal>
        </b-form>
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import * as Api from "@/api"
    import { IUserViewData } from "@/state/user_view"
    import { callSecretApi } from "@/state/store"
    import { CurrentAuth } from "@/state/auth"

    interface ITextType {
        name: "text"
        type: "text" | "number"
        required: boolean
    }

    interface ITextAreaType {
        name: "textarea"
    }

    interface ISelectOption {
        text: string
        value: string
    }

    interface ISelectType {
        name: "select"
        options: ISelectOption[]
    }

    interface ICheckType {
        name: "check"
    }

    type IType = ITextType | ITextAreaType | ISelectType | ICheckType

    interface IField {
        column: Api.IResultColumnInfo
        value: any
        updatedValue: string
        updatedIsNotNull: boolean
        caption: string
        required: boolean
        isNullable: boolean
        type: IType
    }

    const auth = namespace("auth")

    const getInputType = (columnInfo: Api.IResultColumnInfo, attributes: Record<string, any>): IType => {
        if (columnInfo.fieldType !== null) {
            switch (columnInfo.fieldType.type) {
                case "reference":
                    // FIXME
                    return { name: "text", type: "number", required: true }
                case "enum":
                    return {
                        name: "select",
                        options: columnInfo.fieldType.values.map(x => ({ text: x, value: x })),
                    }
                case "bool":
                    return { name: "check" }
                case "int":
                    return { name: "text", type: "number", required: true }
            }
        } else {
            switch (columnInfo.valueType.type) {
                case "bool":
                    return { name: "check" }
                case "int":
                    return { name: "text", type: "number", required: true }
            }
        }

        return attributes["TextArea"] ? { name: "textarea" } : { name: "text", type: "text", required: false }
    }

    @Component
    export default class UserViewForm extends Vue {
        // FIXME FIXME FIXME
        @auth.State("current") currentAuth!: CurrentAuth | null

        lastError: string | null = null
        showSuccess = false
        fields: IField[] | null = null

        @Prop() private uv!: IUserViewData

        updateRecord() {
            if (this.uv.info.updateEntity === null || this.fields === null) {
                throw Error()
            }

            const updatedFields = this.fields
                                      .filter(field => !field.updatedIsNotNull)
                                      .map(field => [ field.column.name, field.updatedValue ])

            if (this.uv.rows === null) {
                return (async () => {
                    try {
                        await callSecretApi(Api.insertEntity, this.uv.info.updateEntity, new URLSearchParams(updatedFields))
                        this.showSuccess = true
                        this.$router.back()
                    } catch (e) {
                        this.lastError = e.message
                    }
                })()
            } else {
                if (this.uv.rows.length === 0) {
                    throw Error()
                }
                const id = this.uv.rows[0].id

                return (async () => {
                    try {
                        await callSecretApi(Api.updateEntity, this.uv.info.updateEntity, id, new URLSearchParams(updatedFields))
                        this.showSuccess = true
                    } catch (e) {
                        this.lastError = e.message
                    }
                })()
            }
        }

        deleteRecord() {
            if (this.uv.info.updateEntity === null || this.uv.rows === null || this.uv.rows.length === 0 || this.fields === null) {
                throw Error()
            }
            const id = this.uv.rows[0].id

            return (async () => {
                try {
                    await callSecretApi(Api.deleteEntity, this.uv.info.updateEntity, id)
                    this.showSuccess = true
                    this.$router.back()
                } catch (e) {
                    this.lastError = e.message
                }
            })()
        }

        resetRecord() {
            if (this.fields === null) {
                throw Error()
            }

            this.fields.forEach(field => {
                field.updatedValue = field.value === null ? "" : field.value
                field.updatedIsNotNull = field.value !== null
            })
        }

        @Watch("uv")
        updateFields() {
            this.fields = this.computeFields()
        }

        created() {
            this.fields = this.computeFields()
        }

        private computeFields() {
            const makeField = (columnInfo: Api.IResultColumnInfo, i: number, value: any) => {
                const columnAttrs = this.uv.columnAttributes[i]
                const captionAttr = columnAttrs["Caption"]
                const caption = captionAttr !== undefined ? captionAttr : columnInfo.name
                const required = columnInfo.updateField === null ? false : (columnInfo.updateField.field.defaultValue === null)

                return {
                    column: columnInfo,
                    value,
                    updatedValue: value === null ? "" : value,
                    updatedIsNotNull: value !== null,
                    caption,
                    required,
                    isNullable: columnInfo.updateField === null ? value === null : columnInfo.updateField.field.isNullable,
                    type: getInputType(columnInfo, columnAttrs),
                }
            }
            if (this.uv.rows === null) {
                // Creation mode
                return this.uv.info.columns.map((columnInfo, i) => {
                    if (columnInfo.updateField === null) {
                        throw Error()
                    }
                    const defaultValue = columnInfo.updateField.field.defaultValue
                    const value = defaultValue === null ? "" : defaultValue
                    return makeField(columnInfo, i, value)
                })
            } else {
                if (this.uv.rows.length === 0) {
                    return null
                }
                const row = this.uv.rows[0]
                return this.uv.info.columns.map((columnInfo, i) => {
                    const value = row.values[i].value
                    return makeField(columnInfo, i, value)
                })
            }
        }
    }
</script>

<style scoped lang="scss">
</style>