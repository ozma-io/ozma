<i18n>
    {
        "en": {
            "delete": "Delete",
            "delete_confirmation": "Are you sure want to delete this record?",
            "ok": "OK",
            "cancel": "Cancel"
        },
        "ru": {
            "delete": "Удалить",
            "delete_confirmation": "Вы действительно хотите удалить эту запись?",
            "ok": "ОК",
            "cancel": "Отмена"
        }
    }
</i18n>

<template>
    <div>
        <form class="form-entry">
            <div v-for="(block, blockI) in blocks" :key="blockI" class="form-block" :style="{ width: `${block.width * 100}%` }">
                <template v-for="fieldInfo in block.fields" class="form_data">
                    <div class="form-data" v-if="fieldInfo.visible" :key="fieldInfo.columnInfo.name" :label-for="fieldInfo.columnInfo.name">
                        <FormControl
                                :caption="fieldInfo.caption"
                                :value="row.values[fieldInfo.index]"
                                :attributes="localRow.values[fieldInfo.index].attributes"
                                :type="fieldInfo.columnInfo.valueType"
                                :locked="locked"
                                :uv="uv"
                                @update="$emit('update', fieldInfo.index, $event)" />
                    </div>
                </template>
            </div>

            <!-- FIXME FIXME FIXME look at permissions! -->
            <div class="delete-block">
                <input  type="button"
                        :value="$t('delete')"
                        class="delete-block_delete-button"
                        v-if="row.mainId !== undefined"
                        v-b-modal="'deleteConfirm'" >
            </div>
            <b-modal lazy
                        id="deleteConfirm"
                        ok-variant="danger"
                        :ok-title="$t('ok')"
                        @ok="$emit('delete', $event)"
                        :cancel-title="$t('cancel')" >
                {{ $t('delete_confirmation') }}
            </b-modal>
        </form>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

@Component
export default class FormEntry extends Vue {
    // We don't bother to set types here properly, they matter no more than for TableRow.
    // The reason this is not a functional component is because of i18n.

    @Prop({ type: Object, required: true }) uv!: any;
    @Prop({ type: Array, required: true }) blocks!: any;
    @Prop({ type: Object, required: true  }) row!: any;
    @Prop({ type: Object, required: true  }) localRow!: any;
    @Prop({ type: Boolean, default: false }) locked!: boolean;
}
</script>

<style scoped>
   .form-entry {
        border-bottom: 0;
        border-top: 0;

    }
    .form-block {
        display:inline-block;
        vertical-align: top;
        margin: 0 1px;
    }
    .form-data {
        margin-top: 7px;
        color: var(--NavigationTextColor);
    }
    .delete-block{
        background: var(--MenuColor);
        width: max-content;
    }
    .delete-block_delete-button {
        background: hsla(0,0%,100%,.3) !important;
        padding: 0px;
        padding-left: 7px;
        padding-right: 7px;
        line-height: normal;
        height: calc(1.5em + 4px);
        border: 0px;
        box-shadow: none;
        outline: none;
        color: var(--ButtonTextColor);
        border-radius: 0;
    }

    @media screen and (max-aspect-ratio: 13/9) {
        @media screen and (max-device-width: 480px) {
            .form-block {
                width: 100% !important;
                display: block;
            }
            .delete-block {
                position: sticky;
                left: 0;
                margin-top: 10px;
            }
            .form-entry {
                display: grid;
            }
        }
    }
    @media screen and (orientation: portrait) {
        @media screen and (max-device-width: 480px) {
            .form-entry {
                padding-left: 15px;
                width: 100%;
                padding-right: 15px;
            }
            .form-data {
                margin-top: 0 !important;
                margin-bottom: 15px;
            }
            .form-block {
                display: grid;
            }
        }
    }

    @media print {
        .delete-block_delete-button {
            display: none !important;
        }
    }
</style>
