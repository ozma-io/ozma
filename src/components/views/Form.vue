<i18n>
    {
        "en": {
            "item_not_found": "Record not found",
            "save": "Сохранить",
            "revert_changes": "Revert changes"
        },
        "ru-RU": {
            "item_not_found": "Запись не найдена",
            "save": "Сохранить",
            "revert_changes": "Откатить изменения"
        }
    }
</i18n>

<template>
    <b-container>
        <h5 v-if="fields === null">
            {{ $t('item_not_found') }}
        </h5>
        <b-form v-else @submit.prevent="submitChanges" @reset="updatedFields = {}">
            <template v-for="field in fields">
                <b-form-group :label="field.caption" :label-for="field.column.name">
                    <b-form-input :id="field.column.name" :value="field.value.value" v-on:input="updatedFields[field.column.name] = $event" :disabled="field.column.updateField === null"></b-form-input>
                </b-form-group>
            </template>

            <b-button v-if="this.uv.updateEntity !== null" type="submit" variant="primary">{{ $t('save') }}</b-button>
            <b-button v-if="this.uv.updateEntity !== null" type="reset" variant="secondary">{{ $t('revert_changes') }}</b-button>
        </b-form>
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from 'vue-property-decorator'
    import { ViewExprResult } from '../../api'

    @Component
    export default class UserViewForm extends Vue {
        @Prop() private uv!: ViewExprResult

        updatedFields: Record<string, any> = {}

        @Watch('uv')
        onUserViewChanged(to: ViewExprResult, from: ViewExprResult) {
            this.updatedFields = {}
        }

        submitChanges() {
            console.log(this.updatedFields)
        }

        get fields() {
            if (this.uv.result.rows.length === 0) {
                return null
            } else {
                const row = this.uv.result.rows[0]
                return this.uv.info.columns.map((columnInfo, i) => {
                    const value = row.values[i]
                    const columnAttrs = this.uv.result.columnAttributes[i]
                    const captionAttr = columnAttrs['Caption']
                    const caption = captionAttr !== undefined ? this.$t(captionAttr) : columnInfo.name

                    return {
                        column: columnInfo,
                        value: value,
                        caption: caption
                    }
                })
            }
        }
    }
</script>

<style scoped lang="scss">
</style>