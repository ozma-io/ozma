<template>
    <b-container class="form_container">
        <b-row>
            <FormGridBlock
                v-for="block in gridContent" :blockContent="block" :gridProps="gridProps" />
        </b-row>
    </b-container>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import FormGridBlock from "@/components/form/FormGridBlock.vue";
import { IGridInputInfoTopLevel } from "@/components/form/types";

@Component({ components: { FormGridBlock } })
export default class FormGrid extends Vue {
    @Prop({ type: Array }) gridContent!: any;
    @Prop({ type: Object }) gridProps!: any;
}
</script>

<style scoped>
.form_container {
    margin-top: 25px;
}
</style>
