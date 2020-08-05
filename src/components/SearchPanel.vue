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
      @click="toggleSearchFieldVisibility(null)"
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

const searchParam = "__q";

@Component
export default class SearchPanel extends Vue {

  private filterString = "";
  private isShownSearchField = false;

  @query.State("current") query!: CurrentQuery;

  @Watch("filterString")
  @Debounce(500)
  private submitFilter() {
    replaceSearch("q", this.filterString);
  }

  @Watch("query.search.root", {deep: true, immediate: true})
  private updateRootParams() {
    this.filterString = this.query.getSearch("q", String, "");
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
