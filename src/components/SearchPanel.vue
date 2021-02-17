<i18n>
    {
        "en": {
            "search_placeholder": "Search"
        },
        "ru": {
            "search_placeholder": "Поиск"
        }
    }
</i18n>

<template>
  <popper
    trigger="clickToToggle"
    :options="{
      placement: 'bottom-end',
      modifiers: { offset: { offset: '0,10px' } }
    }"
  >
    <div class="popper">
      <b-form
        @submit.prevent="updateInput"
      >
        <b-input-group
          size="sm"
          class="input-group focus-entire"
        >
          <b-form-input
            ref="searchInput"
            :value="localFilterString"
            class="search-input form-control with-clear-content-button"
            :placeholder="$t('search_placeholder')"
            @update="localFilterString = $event; debouncedUpdateInput()"
            @change="updateInput"
            @blur="updateInput"
          />
          <b-input-group-append>
            <b-button
              class="button with-material-icon clear-content-button"
              :disabled="localFilterString.length === 0"
              variant="outline-secondary"
              @click.prevent="localFilterString = ''; updateInput()"
            >
              <i
                class="material-icons"
              >clear</i>
            </b-button>
            <b-button
              class="button with-material-icon"
              variant="secondary"
              @click="updateInput"
            >
              <i class="material-icons">search</i>
            </b-button>
          </b-input-group-append>
        </b-input-group>
      </b-form>
    </div>
 
    <button
      v-if="localFilterString.length === 0"
      slot="reference"
      class="material-icons material-button"
      @click.prevent
    > search
    </button>
    <button
      v-else
      slot="reference"
      class="material-icons material-button search-button-active"
      @click.prevent
    > saved_search
    </button>
  </popper>
</template>
<script lang="ts">

import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { Debounce } from "vue-debounce-decorator";
import Popper from "vue-popperjs";

@Component({
  components: { Popper },
})
export default class SearchPanel extends Vue {
  @Prop({ type: String, required: true }) filterString!: string;

  private localFilterString: string;

  constructor() {
    super();
    this.localFilterString = this.filterString;
  }

  private updateInput() {
    if (this.localFilterString !== this.filterString) {
      this.$emit("update:filterString", this.localFilterString);
    }
    this.setFocusOnField();
  }

  @Debounce(2000)
  private debouncedUpdateInput() {
    this.updateInput();
  }

  private setFocusOnField() {
      this.$nextTick(() => (this.$refs.searchInput as HTMLElement).focus());
  }
}

</script>
<style lang="scss" scoped>
  .input-group {
    background-color: var(--MainBackgroundColor);
    border-radius: 0.2rem;
  }

  .search-button-active {
    background-color: var(--WarningBackColor) !important;
  }
</style>
