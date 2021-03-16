import { Component, Watch, Vue } from "vue-property-decorator";

@Component
export default class CommonFilterable extends Vue {
  private currentFilter: string[] = [];
  filter!: string[];

  protected created() {
    this.currentFilter = this.filter;
  }

  @Watch("filter")
  protected updateFilter() {
    const oldFilter = this.currentFilter;
    this.currentFilter = this.filter;

    // Check if current filter contained this one
    const contained = oldFilter.every(oldWord => this.currentFilter.some(newWord => newWord.startsWith(oldWord)));

    if (!contained) {
      this.buildRowPositions();
    } else {
      // Filter existing rows when we filter a subset of already filtered ones.
      const newWords = this.currentFilter.filter(newWord => !oldFilter.some(oldWord => oldWord.startsWith(newWord)));
      this.rowPositions = this.rowPositions.filter(rowI => rowContains(this.uv.rows![rowI], newWords));
    }
  }
}
