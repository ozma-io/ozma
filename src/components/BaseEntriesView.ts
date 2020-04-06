import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { ReferenceName } from "@/utils";
import { Entries, CurrentEntries, IEntriesRef, equalEntriesRef } from "@/state/user_view";

const userView = namespace("userView");

@Component
export default class BaseEntriesView extends Vue {
  @userView.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IEntriesRef; reference: ReferenceName }) => void;
  @userView.State("entries") entriesMap!: CurrentEntries;
  @userView.Action("getEntries") getEntries!: (args: { reference: ReferenceName; ref: IEntriesRef }) => Promise<Entries>;

  protected currentEntries: Entries | Error | null = null;

  get entriesEntity(): IEntriesRef | null {
    throw Error("Not implemented");
  }

  get newEntries() {
    if (this.entriesEntity) {
      const ret = this.entriesMap.getEntries(this.entriesEntity);
      return ret === undefined ? null : ret;
    }
    return null;
  }

  protected destroyed() {
    if (this.entriesEntity) {
      this.destroyEntries(this.entriesEntity);
    }
  }

  private destroyEntries(ref: IEntriesRef) {
    this.removeEntriesConsumer({ ref, reference: this.uid });
  }

  @Watch("newEntries", { immediate: true })
  private updateEntries() {
    if (this.entriesEntity) {
      if (this.newEntries instanceof Error) {
        this.currentEntries = null;
      } else if (this.newEntries !== null) {
        this.currentEntries = this.newEntries;
      } else {
        this.getEntries({ ref: this.entriesEntity, reference: this.uid });
      }
    }
  }

  @Watch("entriesEntity", { deep: true })
  private entityChanged(newEntity: IEntriesRef, oldEntity: IEntriesRef) {
    if (!equalEntriesRef(newEntity, oldEntity)) {
      if (oldEntity !== undefined) {
        this.destroyEntries(oldEntity);
      }
      this.getEntries({ ref: newEntity, reference: this.uid });
    }
  }
}
