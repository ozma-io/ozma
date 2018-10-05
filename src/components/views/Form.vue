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
    <b-container>
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
                <b-form-group :label="field.caption" :label-for="field.column.name">
                    <b-form-checkbox v-if="field.type.name === 'check'"
                                     :id="field.column.name"
                                     v-model="field.updatedValue"
                                     :disabled="field.column.updateField === null"
                                     :required="field.required" />
                    <b-form-textarea v-else-if="field.type.name === 'textarea'"
                                     :id="field.column.name"
                                     v-model="field.updatedValue"
                                     :disabled="field.column.updateField === null"
                                     :rows="3"
                                     :max-rows="6" />
                    <b-form-select v-else-if="field.type.name === 'select'"
                                   :id="field.column.name"
                                   v-model="field.updatedValue"
                                   :disabled="field.column.updateField === null"
                                   :options="field.type.options"
                                   />
                    <b-form-input v-else
                                  :id="field.column.name"
                                  v-model="field.updatedValue"
                                  :type="field.type.type"
                                  :disabled="field.column.updateField === null"
                                  :required="field.required && field.type.type != 'text'" />
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
    import { Component, Prop, Watch, Vue } from 'vue-property-decorator'
    import { namespace } from 'vuex-class'
    import * as Api from '../../api'
    import { UserViewData } from '../../state/user_view'
    import { callSecretApi } from '../../state/store'
import { CurrentAuth } from '@/state/auth';

    const auth = namespace('auth')

    const getInputType = (columnInfo: Api.ResultColumnInfo, attributes: Record<string, any>) => {
        if (columnInfo.fieldType !== null) {
            switch (columnInfo.fieldType[0]) {
                case "FTReference":
                    // FIXME
                    return { name: "text", type: "number" }
                case "FTEnum":
                    const vals: Array<string> = columnInfo.fieldType[1]
                    return {
                        name: "select",
                        options: vals.map(x => ({ text: x, value: x }))
                    }
                case "FTType":
                    switch (columnInfo.fieldType[1][0]) {
                        case "FETScalar":
                            switch (columnInfo.fieldType[1][1]) {
                                case "SFTBool":
                                    return { name: "check" }
                                case "SFTInt":
                                    return { name: "text", type: "number" }
                            }
                    }
            }
        } else {
            switch (columnInfo.valueType[0]) {
                case "VTScalar":
                    switch (columnInfo.valueType[1]) {
                        case "STBool":
                            return { name: "check" }
                        case "STInt":
                            return { name: "text", type: "number" }
                    }
            }
        }

        return attributes["TextArea"] ? { name: "textarea" } : { name: "text", type: "text" }
    }

    @Component
    export default class UserViewForm extends Vue {
        // FIXME FIXME FIXME
        @auth.State('current') currentAuth!: CurrentAuth | null

        @Prop() private uv!: UserViewData
        lastError: string | null = null
        showSuccess = false
        fields : Array<any> | null = null

        updateRecord() {
            if (this.uv.info.updateEntity === null || this.fields === null) {
                throw Error()
            }

            const updatedFields = this.fields.map(field => [ field.column.name, field.updatedValue ])

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

            this.fields.forEach((field) => {
                field.updatedValue = field.value
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
            const makeField = (columnInfo : Api.ResultColumnInfo, i : number, value : any) => {
                const columnAttrs = this.uv.columnAttributes[i]
                const captionAttr = columnAttrs['Caption']
                const caption = captionAttr !== undefined ? captionAttr : columnInfo.name
                const required = columnInfo.updateField === null ? false : (columnInfo.updateField.field.defaultValue === null)

                return {
                    column: columnInfo,
                    value: value,
                    updatedValue: value,
                    caption: caption,
                    required: required,
                    type: getInputType(columnInfo, columnAttrs)
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