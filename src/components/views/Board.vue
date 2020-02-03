<template>
    <div fluid class="view_kanban">
        <div v-if="rowPositions.length === 0 && firstRow === null">
            {{ $t('item_not_found') }}
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { mixins } from "vue-class-component";

import { UserView } from "@/components";
import BaseUserView from "@/components/BaseUserView";
import LocalEmptyUserView from "@/LocalEmptyUserView";


@UserView({
    localConstructor: LocalEmptyUserView,
})
@Component
export class UserViewBoard extends mixins<BaseUserView<LocalEmptyUserView, null, null, null>>(BaseUserView) {

    private mounted() {
        console.log(this);
    }
}

</script>
