<i18n>
    {
        "en": {
            "schema_name": "Schema name:",
            "save": "Save",
            "restore": "Restore",
            "success": "Success"
        },
        "ru": {
            "schema_name": "Название схемы",
            "save": "Сохранить",
            "restore": "Восстановить",
            "success": "Успех"
        }
    }
</i18n>

<template>
    <div>
        <p>
            <label>
                {{ $t('schema_name') }}
                <input v-model="schema" :placeholder="$t('schema_name')">
            </label>
        </p>
        <p>
            <button @click="saveSchema">{{ $t('save') }}</button>
        </p>
        <p>
            <label>
                {{ $t('restore') }}
                <input ref="restoreData" type="file" @change="restoreSchema">
            </label>
        </p>
        <p>
            {{ lastError }}
        </p>
    </div>
</template>

<script lang="ts">
    import { Component, Vue, Prop } from "vue-property-decorator"
    import { Action, namespace } from "vuex-class"

    import * as Api from "@/api"

    @Component
    export default class SaveRestoreSchema extends Vue {
        @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>), args?: any[] }) => Promise<any>

        schema = ""
        lastError = ""

        async saveSchema() {
            try {
                const res: object = await this.callProtectedApi({
                    func: Api.saveSchema,
                    args: [this.schema],
                })

                const element = document.createElement("a")
                element.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res)))
                element.setAttribute("download", `${this.schema}.json`)
                element.style.display = "none"

                document.body.appendChild(element)
                element.click()
                document.body.removeChild(element)

                this.lastError = this.$tc("success")
            } catch (e) {
                this.lastError = e.message
                throw e
            }
        }

        restoreSchema() {
            const reader = new FileReader()
            reader.onload = async (ev: ProgressEvent) => {
                try {
                    const content = JSON.parse(reader.result as string)

                    await this.callProtectedApi({
                        func: Api.restoreSchema,
                        args: [this.schema, content],
                    })

                    this.lastError = this.$tc("success")
                } catch (e) {
                    this.lastError = e.message
                    throw e
                }
            }
            const files = (this.$refs.restoreData as HTMLInputElement).files as FileList
            reader.readAsText(files[0])
        }
    }
</script>
