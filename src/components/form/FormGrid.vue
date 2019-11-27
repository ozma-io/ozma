<template>
    <b-container>
        <b-row>
            <FormGridBlock
                v-for="block in gridContent" :blockContent="block" />
        </b-row>
    </b-container>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import FormGridBlock from "@/components/form/FormGridBlock.vue";
import { IGridInputInfoTopLevel } from "@/components/form/types";

@Component({ components: { FormGridBlock } })
export default class FormGrid extends Vue {

    private mounted() {
        console.log(this.gridContent);
    }
}

</script>
