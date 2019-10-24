<template>
    <VueModal :width="width" :height="height" :name="uid" @before-close="beforeClose">
        <div slot="top-right">
            <input type="button" value="close" class="material-icons modal__close_button" @click="$emit('close')">
        </div>
        <div class="modal__tab_headers" v-if="hasTabs">
            <ModalTabHeader v-for="(tab, index) in modalTabs"
                :key="index"
                :isActive="index === selectedTab"
                :title="tab.title"
                @tab:click="switchTab(index)"
                @tab:close="$emit('tab:close', index)"
            />
        </div>
        <div v-if="hasTabs" class="modal__content">
            <div v-for="(tab, index) in modalTabs" :key="index" v-show="index === selectedTab">
                <ModalContent :nodes="tab.content" />
            </div>
        </div>
        <div v-if="!hasTabs" class="modal__content">
            <slot name="content">
            </slot>
        </div>
    </VueModal>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { valueIsNull } from "@/values";

import ModalContent from "@/components/modal/ModalContent";
import ModalTabHeader from "@/components/modal/ModalTabHeader.vue";
import { IModalTab } from "@/components/modal/types";

@Component({ components: { ModalContent, ModalTabHeader } })
export default class Modal extends Vue {
    @Prop({ type: Array }) modalTabs!: IModalTab[] | undefined;
    @Prop({ type: Boolean, default: true }) show!: boolean;
    @Prop({ type: String }) width!: string;
    @Prop({ type: String }) height!: string;
    @Prop({ type: Number, default: 0 }) startingTab!: number;

    private selectedTab: number = 0;

    private mounted() {
        this.watchIsOpen();
    }

    @Watch("show")
    private watchIsOpen() {
        if (this.show) {
            this.$modal.show(this.uid);
        } else {
            this.$modal.hide(this.uid);
        }
    }

    @Watch("startingTab", { immediate: true })
    private changeStartingTab() {
        this.selectedTab = this.startingTab;
        this.fixupTab();
    }

    @Watch("modalTabs")
    private changeModalTabs() {
        this.fixupTab();
    }

    private fixupTab() {
        if (this.modalTabs && this.modalTabs.length > 0 && this.selectedTab >= this.modalTabs.length) {
            this.selectedTab = this.modalTabs.length - 1;
        }
    }

    // Event is not typed for vue-js-modal
    private beforeClose(ev: any) {
        if (this.show) {
            ev.stop();
        }
        this.$emit("close");
    }

    private switchTab(index: number) {
        if (index < this.modalTabs!.length) {
            this.selectedTab = index;
        }
    }

    private get hasTabs(): boolean {
        return this.modalTabs !== undefined;
    }

    private get currentTabContent(): Vue | string {
        return R.pathOr("No Content", [this.selectedTab, "content"], this.modalTabs);
    }
}
</script>

<style scoped>
 .modal__tab_headers {
     display: flex;
     flex-direction: row;
     padding: 10px;
 }
 .modal__close_button {
     background: none;
     border: none;
     padding: 10px 10px 0 0;
     cursor: pointer;
 }
 .modal__content {
     padding: 10px;
     overflow: auto;
     height: 80vh;
 }

 .modal__content >>> .view-form {
     width: 82vw;
     height: calc(80vh + 60px)
 }
</style>

<style>
    /* styles for vue-js-modal.
    It's their naming so don't touch this
    if you refactor styles */
    .v--modal-box.v--modal {
        background-color: var(--NavigationBackColor);
        color: var(--NavigationTextColor);
        border: 1px solid var(--NavigationTextColor);
    }
</style>

