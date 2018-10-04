<i18n>
    {
        "en": {
            "item_not_found": "Record not found"
        },
        "ru-RU": {
            "item_not_found": "Запись не найдена"
        }
    }
</i18n>

<template>
    <b-container>
        <h5 v-if="fields === null">
            {{ $t('item_not_found') }}
        </h5>
        <b-form v-else>
            <template v-for="field in fields">
                <b-form-group :label="field.caption" :label-for="field.column.name">
                    <b-form-input :id="field.column.name" :value="field.updatedValue" v-on:input="updatedFields[field.column.name] = $event" :disabled="field.column.updateField === null"></b-form-input>
                </b-form-group>
            </template>
        </b-form>
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from 'vue-property-decorator'
    import { ResultViewExpr } from '../../api'

    @Component
    export default class UserViewForm extends Vue {
        @Prop() private uv!: ResultViewExpr

        updatedFields: Record<string, any> = {}

        @Watch('uv')
        onUserViewChanged(to: ResultViewExpr, from: ResultViewExpr) {
            this.updatedFields = {}
        }

        get fields() {
            if (this.uv.rows.length === 0) {
                return null
            } else {
                const row = this.uv.rows[0]
                return this.uv.columns.map((column, i) => {
                    const value = row.values[i]
                    const captionAttr = column.attributes['Caption']
                    const caption = captionAttr !== undefined ? this.$t(captionAttr.value) : column.name
                    const maybeUpdatedValue = this.updatedFields[column.name]

                    return {
                        column: column,
                        value: value,
                        caption: caption,
                        updatedValue: maybeUpdatedValue === undefined ? value.value : maybeUpdatedValue
                    }
                })
            }
        }
    }
</script>

<style scoped lang="scss">
</style>