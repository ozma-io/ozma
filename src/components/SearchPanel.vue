<i18n>
    {
        "en": {
            "search_placeholder": "Type to search"
        },
        "ru": {
            "search_placeholder": "Поиск"
        }
    }
</i18n>

<template>
  <div
    class="search-wrapper"
  >
    <b-form
      inline
      :class="['find', {
        'search-field_hidden': !isShownSearchField,
      }]"
      @submit.prevent="submitFilter()"
    >
      <b-input-group>
        <b-form-input
          ref="searchInput" 
          v-model="filterString"
          class="find_in form-control"
          :placeholder="$t('search_placeholder')"
        />
        <b-input-group-append v-if="filterString.length > 0">
          <span
            id="searchclear"
            class="material-icons clear-search"
            @click="filterString = ''"
          >backspace</span>
        </b-input-group-append>
      </b-input-group>
    </b-form>
    <button
      class="search-button"
      @click.prevent="toggleSearchFieldVisibility(null)"
    >
      <i
        v-if="!isShownSearchField"
        class="material-icons search-button__icon"
      >search</i>
      <i
        v-else
        class="material-icons search-button__icon"
      >close</i>
    </button>
  </div>
</template>

<script lang="ts">

import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import {Debounce} from "vue-debounce-decorator";
import {replaceSearch} from "@/state/query";
import {namespace} from "vuex-class";
import {CurrentQuery} from "@/state/query";

const query = namespace("query");

@Component
export default class SearchPanel extends Vue {

  private filterString = "";
  private isShownSearchField = false;

  @Prop({ type: String, required: true }) uvName: string;
  @query.State("current") query!: CurrentQuery;

  private toggleSearchFieldVisibility(flag?: boolean | null) {

    if (flag !== null) {
      this.isShownSearchField = flag as boolean;
    } else {
      this.isShownSearchField = !this.isShownSearchField;
    }
  }

  @Watch("filterString")
  @Debounce(500)
  private submitFilter() {
    replaceSearch(this.uvName, this.filterString);
  }

  @Watch("query.search.root", {deep: true, immediate: true})
  private updateRootParams() {
    this.filterString = this.query.getSearch(this.uvName, String, "");
  }

  @Watch("isShownSearchField") 
  setFocusOnField() {
    if (this.isShownSearchField) {
      (this.$refs.searchInput as HTMLElement).focus();
    } else {
      this.filterString = "";
    }
  }

  @Watch("$route.path")
  private closeSearchField() {
    this.isShownSearchField = false;
  }

}

</script>
<style scoped>

  .search-wrapper {
    display: flex;
    align-items: center;
    width: auto;
    flex: 1;
  }

  .clear-search {
    height: 20px;
    font-size: 20px;
    margin: 0;
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

  .find_in {
    border-radius: 0;
    border-top: 0;
    border-left: 0;
    border-right: 0;
    padding-left: 0 !important;
    padding-right: 20px !important;
    font-size: 14px !important;
  }

  .find_in::placeholder {
    color: var(--MainTextColorLight) !important;
    font-size: 14px;
  }

  .find {
    margin-right: 10px;
  }

  .search-field_hidden {
    opacity: 0;
    pointer-events: none;
  }

  .search-button {
    padding: 0;
    background: transparent;
    height: 20px;
    outline: none;
  }

  .search-button__icon {
    font-size: 20px;
  }
</style>