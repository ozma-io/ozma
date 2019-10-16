<template>
    <VueModal :width="width" :height="height" :name="modalName" @before-close="onBeforeClose">
        <div slot="top-right">
            <input type="button" value="close" class="material-icons modal__close_button" @click="$modal.hide(modalName)">
        </div>
        <div class="modal__tab_headers" v-if="hasTabs">
            <ModalTabHeader v-for="tab, index in tabs"
                :isActive="index === selectedTab"
                :originalTitle="tab.title"
                :originalUID="tab.uid"
                :tabIndex="index"
                @tab:click="switchTab"
                @tab:close="onModalTabClose"
            />
        </div>
        <div v-if="hasTabs" class="modal__content">
            <div v-for="tab, index in tabs" v-show="index === selectedTab">
                <ModalContent  :nodes="tab.content" />
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

import ModalContent from "./ModalContent";
import ModalTabHeader  from "./ModalTabHeader.vue";
import { IModalTabsProp, IModalTab } from "./types";
import { modalPortalBus } from './ModalPortalTarget';

const sortTabsByOrder: (tabs: IModalTab[]) => IModalTab[] = R.sortBy(R.prop("order"));

@Component({ components: { ModalContent, ModalTabHeader } })
export default class Modal extends Vue {
    @Prop({ type: Object }) modalTabs!: IModalTabsProp | undefined;
    @Prop({ type: Boolean }) isOpen!: boolean;
    @Prop({ type: String }) width!: string;
    @Prop({ type: String }) height!: string;
    @Prop({ type: Function }) beforeClose!: (evt: Event) => void;
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

    private onModalTabClose(uid: string) {
        modalPortalBus.$emit('modalPortal:tabClose', uid)
    }

    private onBeforeClose(evt: Event) {
        if (this.beforeClose) {
            this.beforeClose(evt);
        } else {
            this.$emit("modal:beforeClose", evt);
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
 .modal__content {
     padding: 10px;
     overflow: auto;
     height: 80vh;
 }

 .modal__content >>> .view-form {
     width: 82vw;
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

