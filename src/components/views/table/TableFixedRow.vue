<template functional>
    <!-- When you change anything here, also make corresponding changes in TableRow! -->
    <tr :style="props.entry.style" class="fixed-place-tr">
        <td class="fixed-place-td">
            <div class="fix">
                <div @click="selectRow(rowI, $event)" class="fixed-column">
                    <input type="checkbox" :checked="props.entry.selected" @click.self.prevent>
                </div>
                <div v-if="props.entry.linkForRow !== null" class="fixed-column">
                    <router-link :to="props.entry.linkForRow">
                        ⤢
                    </router-link>
                </div>
                <div v-for="i in columnIndexes"
                        :key="i"
                        @click="listeners.cellClicked(props.entry.cells[i], $event)"
                        :style="props.entry.cells[i].style">
                    <FormControl v-if="props.entry.cells[i].isEditing"
                            :valueText="props.entry.cells[i].valueText"
                            :locked="false"
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
        },
    }
</script>