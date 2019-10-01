import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { ReferenceName } from "@/utils";
import { IEntityRef } from "@/api";
import { Entries, CurrentEntries } from "@/state/user_view";
import { equalEntityRef } from "@/values";

const userView = namespace("userView");

@Component
export default class BaseEntriesView extends Vue {
    @userView.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IEntityRef, reference: ReferenceName }) => void;
    @userView.State("entries") entriesMap!: CurrentEntries;
    @userView.Action("getEntries") getEntries!: (args: { reference: ReferenceName, ref: IEntityRef }) => Promise<Entries>;

    protected currentEntries: Entries | Error | null = null;

    get newEntries() {
        const ret = this.entriesMap.getEntries(this.getEntriesEntity());
        return ret === undefined ? null : ret;
    }

    destroyEntries(ref: IEntityRef) {
        this.removeEntriesConsumer({ ref, reference: this.uid });
    }

    @Watch("newEntries", { immediate: true })
    updateEntries() {
        if (this.newEntries instanceof Error) {
            this.currentEntries = null;
        } else if (this.newEntries !== null) {
            this.currentEntries = this.newEntries;
        } else {
            this.getEntries({ ref: this.getEntriesEntity(), reference: this.uid });
        }
    }

    @Watch("entity", { deep: true })
    entityChanged(newEntity: IEntityRef, oldEntity: IEntityRef) {
        if (!equalEntityRef(newEntity, oldEntity)) {
            if (oldEntity !== undefined) {
                this.destroyEntries(oldEntity);
            }
            this.getEntries({ ref: newEntity, reference: this.uid });
        }
    }

    destroyed() {
        this.destroyEntries(this.getEntriesEntity());
    }

    protected getEntriesEntity(): IEntityRef {
        throw Error("Not implemented");
    }
}
