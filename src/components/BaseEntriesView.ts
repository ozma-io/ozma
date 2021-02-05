import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { ReferenceName, deepClone, deepEquals } from "@/utils";
import { CurrentEntries, Entries, IEntriesRef } from "@/state/entries";

const entries = namespace("entries");

@Component
export default class BaseEntriesView extends Vue {
  @entries.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IEntriesRef; reference: ReferenceName }) => void;
  @entries.State("current") entriesMap!: CurrentEntries;
  @entries.Action("getEntries") internalGetEntries!: (args: { reference: ReferenceName; ref: IEntriesRef; search: string; limit: number }) => Promise<void>;
  @entries.Action("getSingleEntry") internalGetSingleEntry!: (args: { reference: ReferenceName; ref: IEntriesRef; id: number}) => Promise<string | undefined>;

  protected currentEntries: Entries | Error | null = null;
  private pendingEntity: IEntriesRef | null = null;

  get entriesEntity(): IEntriesRef | null {
    throw Error("Not implemented");
  }

  get entriesSearch(): string {
    return "";
  }

  get entriesLimit(): number {
    return 0;
  }

  private get newEntries() {
    if (this.pendingEntity) {
      const ret = this.entriesMap.entries.get(this.pendingEntity);
      return ret === undefined ? null : ret;
    }
    return null;
  }

  get moreEntriesAvailable(): boolean {
    const node = this.newEntries?.get(this.entriesSearch);
    const ret = !(node && ((node.status === "ok" && node.limit === null) || node.status === "error"));
    return ret;
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
        this.getEntries();
      } else if (!(this.newEntries instanceof Promise)) {
        this.currentEntries = this.newEntries.entries;
      }
    }
  }

  @Watch("entriesEntity", { deep: true, immediate: true })
  private entityChanged(newEntity: IEntriesRef | null) {
    if (!deepEquals(this.pendingEntity, newEntity)) {
      this.currentEntries = null;
      if (this.pendingEntity !== null) {
        this.removeEntriesConsumer({ ref: this.pendingEntity, reference: this.uid });
        this.pendingEntity = null;
      }
      this.pendingEntity = deepClone(newEntity);
      if (newEntity !== null) {
        this.getEntries();
      }
    }
  }

  @Watch("entriesSearch")
  private searchChanged(search: string, oldSearch: string) {
    if (this.pendingEntity !== null && search !== oldSearch) {
      this.getEntries();
    }
  }

  @Watch("entriesLimit")
  private limitChanged(limit: number, oldLimit: number) {
    if (this.pendingEntity !== null && limit !== oldLimit) {
      this.getEntries();
    }
  }

  private getEntries() {
    void this.internalGetEntries({
      ref: this.pendingEntity!,
      reference: this.uid,
      search: this.entriesSearch,
      limit: this.entriesLimit,
    });
  }

  protected fetchOneEntry(id: number) {
    return this.internalGetSingleEntry({
      ref: this.pendingEntity!,
      reference: this.uid,
      id,
    });
  }
}
