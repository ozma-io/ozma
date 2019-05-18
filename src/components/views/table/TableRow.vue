<template functional>
    <!-- When you change anything here, also make corresponding changes in TableFixedRow! -->
    <tr :style="props.entry.style" :class="props.selected ? 'selected' : 'none_selected'">
        <td @click="'select' in listeners && listeners.select($event)" class="fixed-column checkbox-cells">
            <input type="checkbox" :checked="props.selected">
        </td>
        <td v-if="props.hasRowLinks" class="fixed-column opemform-cells">
            <UserViewLink v-if="props.entry.linkForRow !== null" :uv="props.entry.linkForRow">
                ⤢
            </UserViewLink>
        </td>
        <td v-for="i in props.columnIndexes"
                :key="i"
                @click="'cellClick' in listeners && listeners.cellClick(props.entry.cells[i], $event)"
                :style="props.entry.cells[i].style"
                :class="{'fixed-column' : props.columns[i].fixed,
                        'select_fixed' : props.entry.cells[i].selected && props.columns[i].fixed,
                        'select' : props.entry.cells[i].selected && !props.columns[i].fixed,
                        'error_style' : (props.entry.cells[i].isAwaited || props.entry.cells[i].isInvalid),
                        'editing_style' : props.entry.cells[i].isEditing !== null}">
            <FormControl v-if="props.entry.cells[i].isEditing !== null"
                    :valueText="props.entry.cells[i].valueText"
                    :attributes="Object.assign({}, props.entry.cells[i].attrs, props.entry.attrs, props.columns[i].attrs, props.uv.attributes)"
                    :added="props.added"
                    :update="props.entry.cells[i].update"
                    :type="props.columns[i].columnInfo.valueType"
                    :uv="props.uv"
                    @update="'update' in listeners && listeners.update(props.entry.cells[i], $event)"
                    autofocus />
            <template>
                <p>
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
                </p>
            </template>
        </td>
    </tr>
</template>

<script lang="ts">
    import { Location } from "vue-router"

    import { UserViewResult, IUpdatableField } from "@/state/user_view"
    import { AutoSaveLock } from "@/state/staging_changes"
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
        isEditing: AutoSaveLock | null
        selected: boolean /* one click on the cell */
        isInvalid: boolean /* for error style in the table */
        isAwaited: boolean
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
        visible: boolean
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
            selected: { type: Boolean, default: false },
        },
    }
</script>
