<template functional>
    <!-- When you change anything here, also make corresponding changes in TableFixedRow! -->
    <tr :style="props.entry.style" :class="props.entry.selected ? 'selected' : 'none_selected'">
        <td @click="'rowSelected' in listeners && listeners.rowSelected" class="fixed-column checkbox-cells">
            <input type="checkbox" :checked="props.entry.selected" @click.self.prevent>
        </td>
        <td v-if="props.hasRowLinks" class="fixed-column opemform-cells">
            <router-link v-if="props.entry.linkForRow !== null" :to="props.entry.linkForRow">
                ⤢
            </router-link>
        </td>
        <td v-for="i in props.columnIndexes"
                :key="i"
                @click="'cellClicked' in listeners && listeners.cellClicked(props.entry.cells[i], $event)"
                :style="props.entry.cells[i].style"
                :class="[props.columns[i].fixed ? 'fixed-column' : 'none', props.entry.cells[i].selected ? 'select' : 'none']">
            <FormControl v-if="props.entry.cells[i].isEditing"
                    :valueText="props.entry.cells[i].valueText"
                    :attributes="Object.assign({}, props.entry.cells[i].attrs, props.entry.attrs, props.columns[i].attrs, props.uv.attributes)"
                    :added="props.added"
                    :update="props.entry.cells[i].update"
                    :type="props.columns[i].columnInfo.valueType"
                    autofocus />
            <template v-else>
                <router-link v-if="props.entry.cells[i].link !== null" :to="props.entry.cells[i].link">
                    <b-checkbox v-if="typeof props.entry.cells[i].value === 'boolean'"
                            :checked="props.entry.cells[i].value"
                            class="div_checkbox"
                            disabled />
                    <template v-else>
                        {{ props.entry.cells[i].valueText }}
                    </template>
                </router-link>
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

    export interface ICell {
        value: any
        valueText: string
        valueLowerText: string
        link: Location | null
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
        selected: boolean
        style: Record<string, any>
        linkForRow: Location | null
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
            added: { type: Boolean, required: true },
            hasRowLinks: { type: Boolean, required: true },
        },
    }
</script>