import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { ReferenceName, deepClone, deepEquals, waitTimeout } from "@/utils";
import { CurrentEntries, Entries, IEntriesRef } from "@/state/entries";
import { RowId } from "ozma-api";

const entries = namespace("entries");

export interface INotAskedEntries {
  status: "not_asked";
}

export interface IPendingEntries {
  status: "pending";
}

export interface ILoadedEntries {
  status: "ok";
  limit: number | null;
}

export interface IErrorEntries {
  status: "error";
  error: Error;
}

export type EntriesState = INotAskedEntries | IPendingEntries | ILoadedEntries | IErrorEntries;

@Component
export default class BaseEntriesView extends Vue {
  @entries.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IEntriesRef; reference: ReferenceName }) => void;
  @entries.State("current") entriesMap!: CurrentEntries;
  @entries.Action("getEntries") getEntries!: (args: { reference: ReferenceName; ref: IEntriesRef; search: string; limit: number }) => Promise<boolean>;
  @entries.Action("getEntriesByIds") getEntriesByIds!: (args: { reference: ReferenceName; ref: IEntriesRef; ids: RowId[] }) => Promise<Entries>;

  // These are supposed to be read only in children user views!
  // Keeping them as state values to avoid creating computed properties (which, also, weirdly fail in this case).
  protected currentEntries: Entries | null = null;
  protected requestedEntriesRef: IEntriesRef | null = null;
  protected requestedSearch = "";
  protected requestedLimit = 0;

  get entriesLoadingState(): EntriesState {
    const node = this.newEntries?.get(this.requestedSearch);
    return node ?? { status: "pending" };
  }

  private get newEntries() {
    if (this.requestedEntriesRef) {
      const ret = this.entriesMap.entries.get(this.requestedEntriesRef);
      return ret === undefined ? null : ret;
    }
    return null;
  }

  protected destroyed() {
    this.freeEntries();
  }

  @Watch("newEntries", { immediate: true })
  private updateEntries() {
    if (this.requestedEntriesRef) {
      if (this.newEntries instanceof Error) {
        this.currentEntries = null;
      } else if (this.newEntries === null) {
        void this.getRequestedEntries();
      } else if (!(this.newEntries instanceof Promise)) {
        this.currentEntries = this.newEntries.entries;
      }
    }
  }

  private getRequestedEntries() {
    return this.getEntries({
      ref: this.requestedEntriesRef!,
      reference: this.uid,
      search: this.requestedSearch,
      limit: this.requestedLimit,
    });
  }

  private freeEntries() {
    if (this.requestedEntriesRef !== null) {
      this.removeEntriesConsumer({ ref: this.requestedEntriesRef, reference: this.uid });
      this.requestedEntriesRef = null;
      this.requestedLimit = 0;
      this.requestedSearch = "";
      this.currentEntries = null;
    }
  }

  // Returns `true`, if more entries are available.
  protected fetchEntries(entity: IEntriesRef, search: string, limit: number) {
    if (!deepEquals(this.requestedEntriesRef, entity)) {
      this.freeEntries();
      this.requestedEntriesRef = deepClone(entity);
    }
    this.requestedSearch = search;
    this.requestedLimit = limit;
    return waitTimeout().then(() => this.getRequestedEntries());
  }

  protected fetchEntriesByIds(entity: IEntriesRef, ids: number[]) {
    if (!deepEquals(this.requestedEntriesRef, entity)) {
      this.freeEntries();
      this.requestedEntriesRef = deepClone(entity);
    }
    // For an unknown reason, removing this `waitTimeout` results in an infinite
    // loop when opening a kanban board with reference columns. I'm sure there's
    // something going on with Vuex here, because even returning immediately from
    // `gedtEntriesByIds` doesn't help, but returning from this function or adding
    // this delay does.
    return waitTimeout().then(() => this.getEntriesByIds({
      ref: this.requestedEntriesRef!,
      reference: this.uid,
      ids,
    }));
  }
}
