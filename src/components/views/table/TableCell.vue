<template>
    <!-- When you change anything here, also make corresponding changes in TableFixedCell! -->
    <td @click="$emit('cellClick', columnPosition, $event)"
            :style="localValue.style"
            :class="['table-td', {'fixed-column': column.fixed,
                'select_fixed': localValue.selected && column.fixed,
                'select': localValue.selected && !column.fixed,
                'error_style': value.erroredOnce,
                'required_cell_style': from === 'added' && value.rawValue === '' && value.info !== undefined && !value.info.field.isNullable,
                'editing_style': localValue.editing !== undefined,
                'disable_cell': value.info === undefined && from !== 'existing'}]">
        <p>
            <UserViewLink v-if="localValue.link !== undefined" :uv="localValue.link">
                <b-checkbox v-if="typeof value.value === 'boolean'"
                        :checked="value.value"
                        class="div_checkbox"
                        disabled />
                <template v-else>
                    {{ localValue.valueText }}
                </template>
            </UserViewLink>
            <template v-else>
                <b-checkbox v-if="typeof value.value === 'boolean'"
                        :checked="value.value"
                        class="div_checkbox"
                        disabled />
                <template v-else>
                    {{ localValue.valueText }}
                </template>
            </template>
        </p>
    </td>
</template>

<script lang="ts">
    import { Component, Vue, Prop, Watch } from "vue-property-decorator"

    @Component
    export default class TableCell extends Vue {
        // We don't bother to set types here properly, they matter no more than for TableRow.
        // The reason this is not a functional component is because of performance.
        // See https://forum.vuejs.org/t/performance-for-large-numbers-of-components/13545/10
        @Prop({ type: Object, required: true }) value!: any
        @Prop({ type: Object, required: true }) localValue!: any
        @Prop({ type: Object, required: true }) column!: any
        @Prop({ type: Number, required: true }) columnPosition!: number
        @Prop({ type: String, default: "existing" }) from!: string
    }
</script>