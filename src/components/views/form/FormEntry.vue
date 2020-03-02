<i18n>
    {
        "en": {
            "delete": "Delete",
            "delete_confirmation": "Are you sure want to delete this record?",
            "ok": "OK",
            "cancel": "Cancel",
            "select": "Select"
        },
        "ru": {
            "delete": "Удалить",
            "delete_confirmation": "Вы действительно хотите удалить эту запись?",
            "ok": "ОК",
            "cancel": "Отмена",
            "select": "Выбрать"
        }
    }
</i18n>

<template>
    <b-container fluid>
        <b-row>
            <b-col size="12">
                <form class="form-entry">
                    <FormGrid :gridContent="blocks" :gridProps="gridProps"   />
                    <!-- FIXME FIXME FIXME look at permissions! -->
                    <div class="delete-block" v-if="row.mainId !== undefined">
                        <input  type="button"
                                :value="$t('delete')"
                                class="delete-block_delete-button"
                                v-b-modal="$id('deleteConfirm')" >

                        <b-modal lazy
                                    :id="$id('deleteConfirm')"
                                    ok-variant="danger"
                                    :ok-title="$t('ok')"
                                    @ok="$emit('delete', $event)"
                                    :cancel-title="$t('cancel')" >
                            {{ $t('delete_confirmation') }}
                        </b-modal>
                    </div>

                    <div class="delete-block" v-if="selectionMode && localRow.extra.selectionEntry !== undefined">
                        <input  type="button"
                                :value="$t('select')"
                                class="delete-block_delete-button"
                                @click="$emit('select', localRow.extra.selectionEntry)" >
                    </div>
                </form>
            </b-col>
        </b-row>
    </b-container>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import FormGrid from "@/components/form/FormGrid.vue";
import { IGridProps } from "@/components/form/types";

@Component({ components: { FormGrid } })
export default class FormEntry extends Vue {
    // We don't bother to set types here properly, they matter no more than for TableRow.
    // The reason this is not a functional component is because of i18n.

    @Prop({ type: Object, required: true }) uv!: any;
    @Prop({ type: Array, required: true }) blocks!: any;
    @Prop({ type: Object, required: true }) row!: any;
    @Prop({ type: Object, required: true }) localRow!: any;
    @Prop({ type: Boolean, default: false }) locked!: boolean;
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
    @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
    @Prop({ type: String, required: true }) scope!: string;
    @Prop({ type: Number, required: true }) level!: number;

    public onGoto(event: any) {
        this.$emit("goto", event);
    }

    public onUpdate(event: any, fieldIndex: number) {
        this.$emit("update", fieldIndex, event);
    }

    get gridProps(): IGridProps {
        return {
            uv: this.uv,
            row: this.row,
            localRow: this.localRow,
            locked: this.locked,
            indirectLinks: this.indirectLinks,
            selectionMode: this.selectionMode,
            scope: this.scope,
            level: this.level,
            onUpdate: this.onUpdate,
            onGoto: this.onGoto,
        };
    }
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
        background: var(--MainBorderColor);
        width: max-content;
        display: inline-block;
        margin-right: 15px;
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
        color: var(--MainTextColor);
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
                width: 100%;
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
