<i18n>
    {
        "en": {
            "search_placeholder": "Search"
        },
        "ru": {
            "search_placeholder": "Поиск"
        },
        "es": {
            "search_placeholder": "La búsqueda"
        }
    }
</i18n>

<template>
  <div class="search-wrapper">
    <transition name="resize-fade" @after-leave="showOpenButton = true">
      <b-form v-if="showInput" inline @submit.prevent="updateInput">
        <b-input-group size="sm" class="input-group focus-entire">
          <b-input
            ref="searchInput"
            :value="localFilterString"
            class="search-input form-control with-clear-content-button"
            :placeholder="$t('search_placeholder')"
            @update="
              localFilterString = $event
              debouncedUpdateInput()
            "
            @change="updateInput"
            @blur="updateInput"
            @focus="$root.$emit('form-input-focused')"
          />
          <b-input-group-append>
            <b-button
              class="button with-material-icon clear-content-button"
              :disabled="localFilterString.length === 0"
              variant="outline-secondary"
              @click.prevent="
                localFilterString = ''
                updateInput()
              "
            >
              <i class="material-icons">clear</i>
            </b-button>
            <b-button
              class="button with-material-icon"
              variant="secondary"
              @click.prevent="toggleShowInput"
            >
              <i class="material-icons">search_off</i>
            </b-button>
          </b-input-group-append>
        </b-input-group>
      </b-form>
    </transition>

    <b-button
      v-if="showOpenButton"
      class="open-search-button button-only-icon"
      variant="light"
      @click.prevent="toggleShowInput"
    >
      <span class="icon material-icons">search</span>
      <span>&#8203;</span>
    </b-button>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { Debounce } from 'vue-debounce-decorator'

@Component
export default class SearchPanel extends Vue {
  @Prop({ type: String, required: true }) filterString!: string

  private showInput = false
  private showOpenButton = true
  private localFilterString = ''

  created() {
    this.showInput = this.filterString !== ''
    this.showOpenButton = this.filterString === ''
    this.localFilterString = this.filterString
  }

  private toggleShowInput() {
    this.showInput = !this.showInput
    if (this.showInput === true) {
      this.showOpenButton = false
    }
  }

  private updateInput() {
    if (this.localFilterString !== this.filterString) {
      this.$emit('update:filter-string', this.localFilterString)
    }
  }

  @Debounce(2000)
  private debouncedUpdateInput() {
    this.updateInput()
  }

  @Watch('showInput')
  private setFocusOnField(newValue: boolean, oldValue: boolean) {
    if (newValue === oldValue) return

    if (newValue) {
      this.$nextTick(() => (this.$refs.searchInput as HTMLElement).focus())
    } else {
      this.localFilterString = ''
      this.updateInput()
    }
  }
}
</script>

<style lang="scss" scoped>
.search-wrapper {
  display: flex;
  align-items: center;
  width: auto;
}

.search-input {
  background-color: var(--cell-backgroundColor);
  color: var(--cell-foregroundColor);

  ::placeholder {
    color: var(--cell-foregroundDarkerColor);
  }

  &:focus {
    background-color: var(--cell-backgroundColor);
    color: var(--cell-foregroundColor);
  }
}

.open-search-button {
  --button-backgroundColor: transparent;
  --button-backgroundDarker1Color: rgba(0, 0, 0, 0.2);
  --button-backgroundDarker2Color: rgba(0, 0, 0, 0.4);
  --button-borderColor: transparent;
}

.input-group {
  border-radius: 0.5rem;
  background-color: var(--MainBackgroundColor);
}

.resize-fade-enter-active {
  transition: all 0.025s;
}

.resize-fade-leave-active {
  transition: all 0.025s;
}

.resize-fade-enter,
.resize-fade-leave-to {
  opacity: 0.1;
  width: 100px;
}

.resize-fade-enter-to,
.resize-fade-leave {
  /* TODO: Currently input-group's width is 257px and it's inherits from some Bootstrap rules and it's not very good.
             Would be cool to make it autiresizeable by text width or something like this. */
  width: 257px;
}
</style>
