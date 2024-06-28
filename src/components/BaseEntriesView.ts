import { Component, Vue, Watch } from 'vue-property-decorator'
import { namespace } from 'vuex-class'

import { RowId } from '@ozma-io/ozmadb-js/client'
import { ReferenceName, deepClone, deepEquals, waitTimeout } from '@/utils'
import {
  CurrentEntries,
  Entries,
  EntriesRef,
  PartialEntries,
} from '@/state/entries'

const entries = namespace('entries')

export interface INotAskedEntries {
  status: 'not_asked'
}

export interface IPendingEntries {
  status: 'pending'
}

export interface ILoadedEntries {
  status: 'ok'
  limit: number | null
}

export interface IErrorEntries {
  status: 'error'
  error: Error
}

export type EntriesState =
  | INotAskedEntries
  | IPendingEntries
  | ILoadedEntries
  | IErrorEntries

@Component
export default class BaseEntriesView extends Vue {
  @entries.Mutation('removeEntriesConsumer') removeEntriesConsumer!: (args: {
    ref: EntriesRef
    reference: ReferenceName
  }) => void
  @entries.State('current') entriesMap!: CurrentEntries
  @entries.Action('getEntries') getEntries!: (args: {
    reference: ReferenceName
    ref: EntriesRef
    search: string
    limit: number
  }) => Promise<boolean>
  @entries.Action('getEntriesByIds') getEntriesByIds!: (args: {
    reference: ReferenceName
    ref: EntriesRef
    ids: RowId[]
  }) => Promise<Entries>

  // These are supposed to be read only in children user views!
  // Keeping them as state values to avoid creating computed properties (which, also, weirdly fail in this case).
  protected currentEntries: PartialEntries | null = null
  protected requestedEntriesRef: EntriesRef | null = null
  protected requestedSearch = ''
  protected requestedLimit = 0

  get entriesLoadingState(): EntriesState {
    const node = this.newEntries?.get(this.requestedSearch)
    return node ?? { status: 'pending' }
  }

  private get newEntries() {
    if (this.requestedEntriesRef) {
      const ret = this.entriesMap.entries.get(this.requestedEntriesRef)
      return ret === undefined ? null : ret
    }
    return null
  }

  protected destroyed() {
    this.freeEntries()
  }

  @Watch('newEntries', { immediate: true })
  private updateEntries() {
    if (this.requestedEntriesRef) {
      if (this.newEntries instanceof Error) {
        this.currentEntries = null
      } else if (this.newEntries === null) {
        void this.getRequestedEntries()
      } else if (!(this.newEntries instanceof Promise)) {
        this.currentEntries = this.newEntries
      }
    }
  }

  private getRequestedEntries() {
    return this.getEntries({
      ref: this.requestedEntriesRef!,
      reference: this.uid,
      search: this.requestedSearch,
      limit: this.requestedLimit,
    })
  }

  private freeEntries() {
    if (this.requestedEntriesRef !== null) {
      this.removeEntriesConsumer({
        ref: this.requestedEntriesRef,
        reference: this.uid,
      })
      this.requestedEntriesRef = null
      this.requestedLimit = 0
      this.requestedSearch = ''
      this.currentEntries = null
    }
  }

  // Returns `true`, if more entries are available.
  protected async fetchEntries(
    entity: EntriesRef,
    search: string,
    limit: number,
  ) {
    // Needed to break a cycle with currentEntries.
    await waitTimeout(0)
    if (!deepEquals(this.requestedEntriesRef, entity)) {
      this.freeEntries()
      this.requestedEntriesRef = deepClone(entity)
    }
    this.requestedSearch = search
    this.requestedLimit = limit
    return this.getRequestedEntries()
  }

  protected async fetchEntriesByIds(entity: EntriesRef, ids: RowId[]) {
    // Needed to break a cycle with currentEntries.
    await waitTimeout(0)
    if (!deepEquals(this.requestedEntriesRef, entity)) {
      this.freeEntries()
      this.requestedEntriesRef = deepClone(entity)
    }
    return this.getEntriesByIds({
      ref: this.requestedEntriesRef!,
      reference: this.uid,
      ids,
    })
  }
}
