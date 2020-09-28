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
          v-model="localFilterString"
          class="find_in form-control"
          :placeholder="$t('search_placeholder')"
        />
        <b-input-group-append v-if="localFilterString.length > 0">
          <span
            id="searchclear"
            class="material-icons clear-search"
            @click="localFilterString = ''"
          >backspace</span>
        </b-input-group-append>
      </b-input-group>
    </b-form>
    <button
      class="search-button"
      @click.prevent="toggleSearchFieldVisibility()"
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

@Component
export default class SearchPanel extends Vue {

  @Prop({ type: String, required: false, default: "" }) filterString!: string;

  private localFilterString = "";
  private isShownSearchField = false;

  private mounted() {
    if (this.filterString.length > 0){
      this.localFilterString = this.filterString;
      this.isShownSearchField = true;
    }
  }

  private toggleSearchFieldVisibility(flag?: boolean) {

    if (flag !== undefined) {
      this.isShownSearchField = flag;
    } else {
      this.isShownSearchField = !this.isShownSearchField;
    }
  }

  @Watch("localFilterString")
  private submitFilter() {
    this.$emit("update:filterString", this.localFilterString);
  }

  @Watch("isShownSearchField") 
  setFocusOnField() {
    if (this.isShownSearchField) {
      (this.$refs.searchInput as HTMLElement).focus();
    } else {
      this.localFilterString = "";
    }
  }

}

</script>
<style scoped>

  .search-wrapper {
    display: flex;
    align-items: center;
    width: auto;
    flex: 1;
    max-width: 500px;
    margin-left: auto;
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
    margin: 0 10px;
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
