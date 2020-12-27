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
    :class="['search-wrapper', {
      'search-show': showInput,
    }]"
  >
    <b-form
      inline
      :class="['find', {
        'search-field_hidden': !showInput,
      }]"
      @submit.prevent="updateInput"
    >
      <b-input-group>
        <b-form-input
          ref="searchInput"
          :value="localFilterString"
          class="find_in form-control"
          :placeholder="$t('search_placeholder')"
          @update="localFilterString = $event; debouncedUpdateInput()"
          @change="updateInput"
          @blur="updateInput"
        />
        <b-input-group-append v-if="localFilterString.length > 0">
          <span
            id="searchclear"
            class="material-icons clear-search"
            @click="localFilterString = ''; updateInput()"
          >backspace</span>
        </b-input-group-append>
      </b-input-group>
    </b-form>
    <button
      class="search-button"
      @click.prevent="toggleShowInput"
    >
      <i
        v-if="!showInput"
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

import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { Debounce } from "vue-debounce-decorator";

@Component
export default class SearchPanel extends Vue {
  @Prop({ type: String, default: "" }) filterString!: string;

  private showInput;
  private localFilterString;

  constructor() {
    super();
    this.localFilterString = this.filterString;
    this.showInput = this.filterString !== "";
  }

  private toggleShowInput() {
    this.showInput = !this.showInput;
  }

  private updateInput() {
    if (this.localFilterString !== this.filterString) {
      this.$emit("update:filterString", this.localFilterString);
    }
  }

  @Debounce(2000)
  private debouncedUpdateInput() {
    this.updateInput();
  }

  @Watch("showInput")
  private setFocusOnField(newValue: boolean, oldValue: boolean) {
    if (newValue === oldValue) return;

    if (newValue) {
      (this.$refs.searchInput as HTMLElement).focus();
    } else {
      this.localFilterString = "";
      this.updateInput();
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
    z-index: 1000;
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
