<template functional>
    <!-- When you change anything here, also make corresponding changes in TableFixedCell! -->
    <div @click="listeners.cellClick !== undefined && listeners.cellClick(props.columnPosition, $event)"
            :style="Object.assign({}, props.localValue.style, props.column.style)">
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
    </div>
</template>

<script lang="ts">
    export default {
        name: "TableCell",
        props: {
            value: { type: Object, required: true },
            localValue: { type: Object, required: true },
            column: { type: Object, required: true },
            columnPosition: { type: Number, required: true },
        },
    }
</script>