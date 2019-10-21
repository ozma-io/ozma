<template>
    <div
        :class="['modal__tab_header', {'selected': isActive}]"
        @click="$emit('tab:click')">
        {{title}}
        <input type="button"
            value="close"
            class="material-icons modal__tab_close_button"
            @click.stop="$emit('tab:close')">
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";

@Component
export default class ModalTabHeader extends Vue {
    @Prop({ type: String, required: true }) title!: string;
    @Prop({ type: Boolean, default: false }) isActive!: boolean;
}
</script>

<style scoped>
 .modal__tab_header {
     padding: 0 10px 0 10px;
     flex: 1 1 auto;
     text-align: center;
 }
 .modal__tab_header.selected,
 .modal__tab_header:hover {
     color: var(--NavigationBackColor);
     background-color: var(--NavigationTextColor);
     cursor: pointer;
 }
 .modal__tab_close_button {
     background: none;
     border: none;
     height: 100%;
     cursor: pointer;
     float: right;
 }
</style>
