<template>
    <VueModal :name="modalName" @before-close="$emit('modal:beforeClose', $event)">
        <div slot="top-right">
            <input type="button" value="close" class="material-icons modal__close_button" @click="$modal.hide(modalName)">
        </div>
        <div class="modal__tab_headers" v-if="hasTabs">
            <div v-for="tab, index in tabs"
                :class="['modal__tab_header', {'selected': index === selectedTab}]"
                @click="switchTab(index)">
                {{tab.title}}
            </div>
        </div>
        <div v-if="hasTabs" class="modal__content">
            <ModalContent :nodes="currentTabContent" />
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

import ModalContent from "./ModalContent";
import { IModalTabsProp, IModalTab } from "./types";

const sortTabsByOrder: (tabs: IModalTab[]) => IModalTab[] = R.sortBy(R.prop("order"));

@Component({ components: { ModalContent } })
export default class Modal extends Vue {
    @Prop({ type: Object }) modalTabs!: IModalTabsProp | undefined;
    @Prop({ type: Boolean }) isOpen!: boolean;
    @Prop({ type: Number, default: 0 }) startingTab!: number;
    @Prop({ type: String, default: "modal" }) modalName!: string;

    private selectedTab: number = this.startingTab;

    private mounted() {
        this.watchIsOpen(this.isOpen);
    }

    @Watch("isOpen")
    private watchIsOpen(isOpen: boolean) {
        if (isOpen) {
            this.$modal.show(this.modalName);
        } else {
            this.$modal.hide(this.modalName);
        }
    }

    private switchTab(index: number) {
        if (index < this.tabs.length) {
            this.selectedTab = index;
        }
    }

    private get hasTabs(): boolean {
        return !!this.modalTabs;
    }

    private get tabs(): IModalTab[] {
        if (this.modalTabs) {
            return sortTabsByOrder(
                Object.entries(this.modalTabs)
                      .map(([order, tab]) => ({ order, ...tab })),
            );
        }
        return [];
    }

    private get currentTabContent(): Vue | string {
        return R.pathOr("No Content", [this.selectedTab, "content"], this.tabs);
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
 .modal__content {
     padding: 10px;
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

