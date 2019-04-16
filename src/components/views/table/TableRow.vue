<template functional>
    <!-- When you change anything here, also make corresponding changes in TableFixedRow! -->
    <tr :style="props.entry.style" :class="props.selectedRow ? 'selected' : 'none_selected'">
        <td @click="'rowSelected' in listeners && listeners.rowSelected($event)" class="fixed-column checkbox-cells">
            <input type="checkbox" :checked="props.selectedRow" @click.self.prevent>
        </td>
        <td v-if="props.hasRowLinks" class="fixed-column opemform-cells">
            <UserViewLink v-if="props.entry.linkForRow !== null" :uv="props.entry.linkForRow">
                ⤢
            </UserViewLink>
        </td>
        <td v-for="i in props.columnIndexes"
                :key="i"
                @click="'cellClicked' in listeners && listeners.cellClicked(props.entry.cells[i], $event)"
                :style="props.entry.cells[i].style"
                :class="[props.columns[i].fixed ? 'fixed-column' : 'none',
                         props.entry.cells[i].selected && props.columns[i].fixed ? 'select_fixed' : 'none',
                         props.entry.cells[i].selected && !props.columns[i].fixed ? 'select' : 'none']">
            <FormControl v-if="props.entry.cells[i].isEditing"
                    :valueText="props.entry.cells[i].valueText"
                    :attributes="Object.assign({}, props.entry.cells[i].attrs, props.entry.attrs, props.columns[i].attrs, props.uv.attributes)"
                    :added="props.added"
                    :update="props.entry.cells[i].update"
                    :type="props.columns[i].columnInfo.valueType"
                    autofocus />
            <template v-else>
                <UserViewLink v-if="props.entry.cells[i].link !== null" :uv="props.entry.cells[i].link">
                    <b-checkbox v-if="typeof props.entry.cells[i].value === 'boolean'"
                            :checked="props.entry.cells[i].value"
                            class="div_checkbox"
                            disabled />
                    <template v-else>
                        {{ props.entry.cells[i].valueText }}
                    </template>
                </UserViewLink>
                <template v-else>
                    <b-checkbox v-if="typeof props.entry.cells[i].value === 'boolean'"
                            :checked="props.entry.cells[i].value"
                            class="div_checkbox"
                            disabled />
                    <template v-else>
                        {{ props.entry.cells[i].valueText }}
                    </template>
                </template>
            </template>
        </td>
    </tr>
</template>

<script lang="ts">
    import { Location } from "vue-router"

    import { UserViewResult, IUpdatableField } from "@/state/user_view"
    import { IResultColumnInfo } from "@/api"
    import { IQuery } from "@/state/query"

    export interface ICell {
        value: any
        valueText: string
        valueLowerText: string
        link: IQuery | null
        style: Record<string, any>
        update: IUpdatableField | null
        attrs: Record<string, any>
        isEditing: boolean
        selected: boolean /* one click on the cell */
    }

    export interface IRow {
        index: number
        cells: ICell[]
        deleted: boolean
        style: Record<string, any>
        linkForRow: IQuery | null
        attrs: Record<string, any>
    }

    export interface IColumn {
        caption: string
        style: Record<string, any>
        fixed: boolean
        mobileFixed: boolean
        columnInfo: IResultColumnInfo
        attrs: Record<string, any>
        width: number // in px
    }

    export default {
        name: "TableRow",
        props: {
            entry: { type: Object, required: true },
            columnIndexes: { type: Array, required: true },
            columns: { type: Array, required: true },
            uv: { type: Object, required: true },
            added: { type: Boolean, default: false },
            hasRowLinks: { type: Boolean, required: true },
            selectedRow: { type: Boolean, required: true },
        },
    }
</script>