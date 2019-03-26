<template functional>
    <tr :style="props.entry.style" :class="props.entry.selected ? 'selected' : 'none_selected'">
        <td @click="listeners.selectRow" class="fixed-column checkbox-cells">
            <input type="checkbox" :checked="props.entry.selected" @click.self.prevent>
        </td>
        <td v-if="props.entry.linkForRow !== null" class="fixed-column opemform-cells">
            <a :href="entry.linkForRow">
                ⤢
            </a>
        </td>
        <td v-for="i in props.columnIndexes"
                :key="i"
                @dblclick="listeners.changeValue(props.entry.cells[i], $event)"
                :style="props.entry.cells[i].style"
                :class="props.entry.cells[i].fixed ? 'fixed-column' : 'none'">
            <FormControl v-if="props.entry.cells[i].change"
                    :valueText="props.entry.cells[i].valueText"
                    :locked="false"
                    :attributes="Object.assign({}, props.entry.cells[i].attrs, props.entry.attrs, props.columns[i].attrs, props.uv.attributes)"
                    :added="props.added"
                    :update="props.entry.cells[i].update"
                    :type="props.columns[i].columnInfo.valueType"/>
            <template v-else>
                <a v-if="props.entry.cells[i].link !== null" :href="props.entry.cells[i].link">
                    <b-checkbox v-if="typeof props.entry.cells[i].value === 'boolean'"
                            :checked="props.entry.cells[i].value"
                            class="div_checkbox"
                            disabled />
                    <template v-else>
                        {{ props.entry.cells[i].valueText }}
                    </template>
                </a>
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
    import Vue, { FunctionalComponentOptions } from "vue"
    import { UserViewResult, IUpdatableField } from "@/state/user_view"
    import { IResultColumnInfo } from "@/api"

    export interface ICell {
        value: any
        valueText: string
        link: string | null
        style: Record<string, any>
        fixed: boolean
        update: IUpdatableField | undefined | null
        attrs: Record<string, any>
        change: boolean
    }

    export interface IRow {
        index: number
        cells: ICell[]
        deleted: boolean
        selected: boolean
        style: Record<string, any>
        linkForRow: string | null
        attrs: Record<string, any>
    }

    export interface IColumn {
        columnIndex: number
        caption: string
        style: Record<string, any>
        fixed: boolean
        mobileFixed: boolean
        columnInfo: IResultColumnInfo
        attrs: Record<string, any>
    }
    
    export default {
        name: "TableRow",
        props: {
            entry: { type: Object, required: true },
            columnIndexes: { type: Array, required: true },
            columns: { type: Array, required: true },
            uv: { type: Object, required: true },
        },
    }
</script>