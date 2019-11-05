<template>
    <b-col cols="12" :lg="blockContent.size" class="form_grid_block__column">
        <Input v-if="blockContent.type === 'text'"
            :label="blockContent.label"
            :value="blockContent.value"
            inline
        />
        <Textarea v-if="blockContent.type === 'textarea'"
            :label="blockContent.label"
            :value="blockContent.value"
        />
        <b-row v-if="blockContent.type === 'section'">
            <b-col v-for="subBlock in blockContent.content"
                cols="12" :lg="subBlock.size"
                class="form_grid_block__column form_grid_block__sub_column" >
                <FormGridBlock :blockContent="subBlock" />
            </b-col>
        </b-row>
    </b-col>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import Input from "@/components/form/Input.vue";
import Textarea from "@/components/form/Textarea.vue";
import { GridInputInfoTopLevel } from "@/components/form/types";

@Component({
    components: { Input, Textarea },
})
export default class FormGridBlock extends Vue {
    @Prop({ type: Object }) blockContent!: GridInputInfoTopLevel;

    private mounted() {
        console.log(this.blockContent);
    }
}
</script>

<style scoped>
 .form_grid_block__sub_column {
     margin-top: 0;
     padding-left: 0;
     padding-right: 0;
 }
</style>
