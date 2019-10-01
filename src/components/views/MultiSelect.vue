<i18n>
    {
        "en": {
            "item_not_found": "Record not found",
            "delete": "Delete",
            "delete_confirmation": "Are you sure want to delete this record?",
            "ok": "OK",
            "cancel": "Cancel",
            "no_value": "(No value)",
            "select_value": "(Select value)",
            "yes": "Yes",
            "no": "No"
        },
        "ru": {
            "item_not_found": "Запись не найдена",
            "delete": "Удалить",
            "delete_confirmation": "Вы действительно хотите удалить эту запись?",
            "ok": "ОК",
            "cancel": "Отмена",
            "no_value": "(Пусто)",
            "yes": "Да",
            "no": "Нет"
        }
    }
</i18n>

<template>
    <div fluid class="view-form">
        <MultiSelect
            :options="options"
            :value="selectValues"
            :emptyValue="[]"
            @update:value="onSelectChange"
        />
    </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import * as R from 'ramda';
import { mixins } from "vue-class-component";
import { Store } from "vuex";
import { namespace } from "vuex-class";

import { tryDicts, mapMaybe } from "@/utils";
import { AttributesMap, IResultColumnInfo } from "@/api";
import { CombinedUserView, ICombinedValue, IRowCommon, ICombinedRow, IAddedRow, homeSchema } from "@/state/user_view";
import { AddedRowId } from "@/state/staging_changes";
import { IQuery } from "@/state/query";
import { LocalUserView, SimpleLocalUserView, ILocalRowInfo, ILocalRow, ValueRef, RowRef } from "@/local_user_view";
import { UserView } from "@/components";
import { ISelectionRef } from "@/components/BaseUserView";
import BaseUserView from "@/components/BaseUserView";
import FormEntry from "@/components/views/form/FormEntry.vue";
import MultiSelect from "@/components/multiselect/MultiSelect.vue";
import { IAction } from "@/components/ActionsMenu.vue";

class LocalFormUserView extends LocalUserView<null, null, null> {
    createLocalUserView() {
        return null;
    }
    createLocalRow() {
        return null;
    }
    createLocalValue() {
        return null;
    }
    createAddedLocalValue() {
        return null;
    }
    createEmptyLocalRow() {
        return null;
    }
    createAddedLocalRow() {
        return null;
    }
    createEmptyLocalValue() {
        return null;
    }
}

const query = namespace("query");
const userView = namespace("userView");

const findSelectColumnIndex = (attrs: RecordSet<string, any>) =>
    Object.keys(attrs).filter(key => R.pathOr(false, [key, "Select"], attrs))[0]

interface IRowValue {
    value: any;
}
interface IValueDelta {
    deletedRows: RowRef[];
    rowsToAdd: ValueRef[];
}
const findValueDelta = (rows: ICombinedRow[], newRows: ICombinedRow[], value: any[], indexColumn: number) => {
    const onlyValuesOld = rows.map(row => row.values[indexColumn].value);
    const onlyValuesNew = Object.entries(newRows).map(([_, row]) => [
        row.values[indexColumn].info.id,
        row.values[indexColumn].value,
    ]);
    const onlyValues = R.uniq([...onlyValuesOld, ...onlyValuesNew]);
    const deletedOldIndexes = onlyValues.reduce((acc, rowValue, index) => {
        if (!value.includes(rowValue) && onlyValuesOld.includes(rowValue)) {
            return [...acc, { type: "existing", position: index }];
        }
        return acc;
    }, []);
    const deletedNewIndexes = onlyValuesNew.reduce((acc, row, index) => {
        const [rowId, rowValue] = row;
        if (!value.includes(rowValue) && R.includes(row, onlyValuesNew)) {
            return [...acc, { type: "added", id: rowId }];
        }
        return acc;
    }, []);
    const rowsToAdd = value.reduce((acc, newValue) => {
        if (!onlyValues.includes(newValue) && !onlyValuesNew.includes(newValue)) {
            return [
                ...acc,
                { ref: { column: Number(indexColumn), type: "new" }, value: newValue },
            ]
        }
        return [];
    }, []);
    return {
        rowsToAdd,
        deletedIndexes: [...deletedOldIndexes, ...deletedNewIndexes],
    }
}


@UserView({
    localConstructor: LocalFormUserView,
})
@Component({
    components: {
        MultiSelect,
    },
})
export default class UserViewForm extends mixins<BaseUserView<LocalFormUserView, null, null, null>>(BaseUserView) {
    @query.State("previous") previousQuery!: IQuery | null;

    @userView.State("entries") entriesMap!: CurrentEntries;
    @userView.Action("getEntries") getEntries!: (args: { reference: ReferenceName, ref: IEntityRef }) => Promise<Entries>;
    @Prop({ type: CombinedUserView, required: true }) uv!: CombinedUserView;
    @Prop({ type: Boolean, default: false }) isRoot!: boolean;
    @Prop({ type: Object, required: true }) local!: LocalFormUserView;

    private deletedValues = [];
    private selectedValueIndex = findSelectColumnIndex(this.uv.columnAttributes);


    private onSelectChange(value: any[]) {
        const delta = findValueDelta(this.uv.rows, this.uv.newRows, value, this.selectedValueIndex);
        delta.deletedIndexes.forEach((row) => {
            this.deleteRow(row);
        });
        delta.rowsToAdd.forEach((row) => {
            this.updateValue(row.ref, row.value);
        });
    }

    private get selectValues() {
        const existingValues = this.uv.rows.filter(row => !row.deleted)
                                   .map(row => row.values[this.selectedValueIndex].value);
        const addedValues = Object.entries(this.uv.newRows).filter(([_, row]) => !row.deleted)
                                  .map(([_, row]) => row.values[this.selectedValueIndex].value);
        return R.uniq([...existingValues, ...addedValues]).filter(value => !this.deletedValues.includes(value));
    }

    private get options() {
        const entries = this.entriesMap.getEntries(
            this.uv.info.columns[this.selectedValueIndex].mainField.field.fieldType.entity
        );
        if (entries) {
            return Object.entries(entries).map(([key, value]) => ({ value: Number(key), label: value }));
        }
        return [];
    }

    @Watch("uv", { deep: true })
    private onUserViewChange() {
        this.getEntries({ ref: this.uv.info.columns[this.selectedValueIndex].mainField.field.fieldType.entity, reference: this.uid });
    }

    private mounted() {
        this.getEntries({ ref: this.uv.info.columns[this.selectedValueIndex].mainField.field.fieldType.entity, reference: this.uid });
    }

}
</script>

<style scoped>
</style>
