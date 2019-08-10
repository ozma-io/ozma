<template functional>
    <!-- When you change anything here, also make corresponding changes in TableFixedCell! -->
    <td @click="listeners.cellClick !== undefined && listeners.cellClick(props.columnPosition, $event)"
            :style="props.localValue.style"
            :class="['table-td', {'fixed-column': props.column.fixed,
                'select_fixed': props.localValue.selected && props.column.fixed,
                'select': props.localValue.selected && !props.column.fixed,
                'error_style': props.value.erroredOnce,
                'required_cell_style': props.from === 'added' && props.value.rawValue === '' && props.value.info !== undefined && !props.value.info.field.isNullable,
                'editing_style': props.localValue.editing !== undefined,
                'disable_cell': props.value.update === undefined && props.from !== 'existing'}]">
        <p>
            <UserViewLink v-if="props.localValue.link !== undefined" :uv="props.localValue.link">
                <b-checkbox v-if="typeof props.value.value === 'boolean'"
                        :checked="props.value.value"
                        class="div_checkbox"
                        disabled />
                <template v-else>
                    {{ props.localValue.valueText }}
                </template>
            </UserViewLink>
            <template v-else>
                <b-checkbox v-if="typeof props.value.value === 'boolean'"
                        :checked="props.value.value"
                        class="div_checkbox"
                        disabled />
                <template v-else>
                    {{ props.localValue.valueText }}
                </template>
            </template>
        </p>
    </td>
</template>

<script lang="ts">
    export default {
        name: "TableCell",
        props: {
            value: { type: Object, required: true },
            localValue: { type: Object, required: true },
            column: { type: Object, required: true },
            columnPosition: { type: Number, required: true },
            from: { type: String, default: "existing" },
        },
    }
</script>