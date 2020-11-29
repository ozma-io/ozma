import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { ReferenceName, deepClone } from "@/utils";
import { Entries, CurrentEntries, IEntriesRef, equalEntriesRef } from "@/state/user_view";

const userView = namespace("userView");

@Component
export default class BaseEntriesView extends Vue {
  @userView.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IEntriesRef; reference: ReferenceName }) => void;
  @userView.State("entries") entriesMap!: CurrentEntries;
  @userView.Action("getEntries") getEntries!: (args: { reference: ReferenceName; ref: IEntriesRef }) => Promise<Entries>;

  protected currentEntries: Entries | Error | null = null;
  private pendingEntity: IEntriesRef | null = null;

  get entriesEntity(): IEntriesRef | null {
    throw Error("Not implemented");
  }

  get newEntries() {
    if (this.entriesEntity) {
      const ret = this.entriesMap.entries.get(this.entriesEntity);
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
  updateEntries() {
    if (this.entriesEntity) {
      if (this.newEntries instanceof Error) {
        this.currentEntries = null;
      } else if (this.newEntries === null) {
        this.getEntries({ ref: this.entriesEntity, reference: this.uid });
      } else if (!(this.newEntries instanceof Promise)) {
        this.currentEntries = this.newEntries;
      }
    }
  }

  @Watch("entriesEntity", { deep: true, immediate: true })
  entityChanged(newEntity: IEntriesRef | null) {
    const newPendingEntity = deepClone(newEntity);
    if (newPendingEntity !== null && this.newEntries === null) {
      this.getEntries({ ref: newPendingEntity, reference: this.uid });
    }

    const oldPendingEntity = this.pendingEntity;
    this.pendingEntity = newPendingEntity;
    if (oldPendingEntity !== null && (newEntity === null || !equalEntriesRef(oldPendingEntity, newEntity))) {
      this.removeEntriesConsumer({ ref: oldPendingEntity, reference: this.uid });
    }
  }
}
