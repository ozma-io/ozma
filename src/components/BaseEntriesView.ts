import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { ReferenceName, deepClone, deepEquals } from "@/utils";
import { CurrentEntries, Entries, IEntriesRef } from "@/state/entries";

const entries = namespace("entries");

@Component
export default class BaseEntriesView extends Vue {
  @entries.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IEntriesRef; reference: ReferenceName }) => void;
  @entries.State("current") entriesMap!: CurrentEntries;
  @entries.Action("getEntries") getEntries!: (args: { reference: ReferenceName; ref: IEntriesRef }) => Promise<Entries>;

  protected currentEntries: Entries | Error | null = null;
  private pendingEntity: IEntriesRef | null = null;

  get entriesEntity(): IEntriesRef | null {
    throw Error("Not implemented");
  }

  private get newEntries() {
    if (this.pendingEntity) {
      const ret = this.entriesMap.entries.get(this.pendingEntity);
      return ret === undefined ? null : ret;
    }
    return null;
  }

  protected destroyed() {
    if (this.pendingEntity !== null) {
      this.removeEntriesConsumer({ ref: this.pendingEntity, reference: this.uid });
    }
  }

  @Watch("newEntries", { immediate: true })
  private updateEntries() {
    if (this.pendingEntity) {
      if (this.newEntries instanceof Error) {
        this.currentEntries = null;
      } else if (this.newEntries === null) {
        void this.getEntries({ ref: this.pendingEntity, reference: this.uid });
      } else if (!(this.newEntries instanceof Promise)) {
        this.currentEntries = this.newEntries;
      }
    }
  }

  @Watch("entriesEntity", { deep: true, immediate: true })
  private entityChanged(newEntity: IEntriesRef | null) {
    if (deepEquals(this.pendingEntity, newEntity)) {
      return;
    }
    const newPendingEntity = deepClone(newEntity);
    if (newPendingEntity !== null && this.newEntries === null) {
      void this.getEntries({ ref: newPendingEntity, reference: this.uid });
    }

    this.currentEntries = null;
    const oldPendingEntity = this.pendingEntity;
    this.pendingEntity = newPendingEntity;
    if (oldPendingEntity !== null) {
      this.removeEntriesConsumer({ ref: oldPendingEntity, reference: this.uid });
    }
  }
}
