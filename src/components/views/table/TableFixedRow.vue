<template functional>
    <!-- When you change anything here, also make corresponding changes in TableRow! -->
    <tr :style="props.entry.style" class="fixed-place-tr none_selected">
        <td class="fixed-place-td">
            <div class="fix">
                <div @click="'select' in listeners && listeners.select($event)" class="fixed-column">
                    <input type="checkbox" :checked="props.selected">
                </div>
                <div v-if="props.hasRowLinks" class="fixed-column">
                    <UserViewLink v-if="props.entry.linkForRow !== null" :uv="props.entry.linkForRow">
                        ⤢
                    </UserViewLink>
                </div>
                <div v-for="i in props.columnIndexes"
                        :key="i"
                        @click="'cellClick' in listeners && listeners.cellClick(props.entry.cells[i], $event)"
                        :style="Object.assign({}, props.entry.cells[i].style, props.columns[i].style)">
                    <FormControl v-if="props.entry.cells[i].isEditing !== null"
                            :valueText="props.entry.cells[i].valueText"
                            :attributes="Object.assign({}, props.entry.cells[i].attrs, props.entry.attrs, props.columns[i].attrs, props.uv.attributes)"
                            :added="props.added"
                            :update="props.entry.cells[i].update"
                            :type="props.columns[i].columnInfo.valueType"
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
                </div>
            </div>
        </td>
    </tr>
</template>

<script lang="ts">
    export default {
        name: "TableFixedRow",
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