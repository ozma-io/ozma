<i18n>
    {
        "en": {
            "no_cards": "Empty",
            "count_tooltip": "Number of cards in column"
        },
        "ru": {
            "no_cards": "Пусто",
            "count_tooltip": "Количество карточек в колонке"
        },
        "es": {
            "no_cards": "Vacio",
            "count_tooltip": "El número de cartas en la columna"
        }
    }
</i18n>

<template>
  <div class="column_container" data-dragscroll :style="style">
    <div class="column_header" data-dragscroll>
      <div class="column_header__title_block" data-dragscroll>
        <span
          class="column_header__title"
          :title="title ?? undefined"
          data-dragscroll
        >
          {{ title ?? '. . .' }}
        </span>
        <span
          v-b-tooltip.hover.d1000.noninteractive
          class="column_header__count"
          :title="$t('count_tooltip')"
        >
          {{ cardCount }}
        </span>
        <span class="column_controls" data-dragscroll>
          <i
            v-if="createButton"
            class="material-icons material-button add-button"
            @click="$emit('create')"
            >add</i
          >
        </span>
      </div>
    </div>
    <!-- force-fallback is needed for *-class properties to work:
         https://github.com/SortableJS/Sortable/issues/1268 -->
    <!-- fallback-tolerance > 0 activate iOS bug with content selection
         but important for PC use with open/drag finc -->
    <!-- FIXME: update when they will update dependencies
         https://github.com/SortableJS/Vue.Draggable/pull/1085 -->
    <draggable
      class="column_body"
      :group="{ name: $parent.uid, put: true }"
      ghost-class="card_dragging_ghost"
      chosen-class="card_dragging_chosen"
      drag-class="card_dragging_drag"
      touch-start-threshold="10"
      force-fallback="true"
      fallback-tolerance="5"
      animation="200"
      data-dragscroll
      draggable=".card-container"
      handle=".handle"
      :style="[{ width }, colorVariables]"
      :value="shownCards"
      :disabled="!allowDragging"
      @start="onDragStart"
      @end="onDragEnd"
      @change="onChange"
    >
      <Card
        v-for="(card, cardIndex) in shownCards"
        :key="card.key"
        :background-color="card.backgroundColor"
        :color-variant-attribute="card.colorVariant"
        :class="[
          {
            handle: !$isMobile,
          },
        ]"
      >
        <div
          :class="[
            'mob-handle',
            {
              handle: $isMobile,
            },
          ]"
        />
        <slot
          name="card"
          :dragged="cardIndex === draggedIndex"
          :card="card.card"
        />
      </Card>
      <template #footer>
        <InfiniteLoading
          spinner="spiral"
          :distance="10"
          :identifier="cards.length"
          @infinite="updateShownCardsLength"
        >
          <template #no-results>
            <div v-if="cards.length === 0" class="no-card">
              {{ $t('no_cards') }}
            </div>
            <span v-else />
          </template>
          <template #no-more>
            <span />
          </template>
          <template #error>
            <span />
          </template>
        </InfiniteLoading>
      </template>
    </draggable>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import InfiniteLoading, { StateChanger } from 'vue-infinite-loading'
import draggable from 'vuedraggable'

import Card from '@/components/kanban/Card.vue'
import { nextRender } from '@/utils'
import type { ColorVariantAttribute } from '@/utils_colors'

export interface ICard<CardT> {
  key: unknown
  card: CardT
  backgroundColor?: string
  colorVariant: ColorVariantAttribute
}

const showStep = 10

@Component({ components: { Card, draggable, InfiniteLoading } })
export default class KanbanColumn extends Vue {
  @Prop({ type: Array, required: true }) cards!: ICard<unknown>[]
  @Prop({ required: true }) title!: string | null
  @Prop({ type: Boolean, default: false }) createButton!: boolean
  @Prop({ type: Number, default: 300 }) width!: number
  @Prop({ type: Object }) colorVariables!: Record<string, string>
  @Prop({ type: String, default: 'none' }) backgroundColor!: string
  @Prop({ type: Boolean, default: false }) allowDragging!: string

  private draggedIndex: number | null = null
  private shownCardsLength = 0

  private updateShownCardsLength(ev: StateChanger) {
    this.shownCardsLength = Math.min(
      this.shownCardsLength + showStep,
      this.cards.length,
    )

    if (this.shownCardsLength >= this.cards.length) {
      ev.complete()
    } else {
      ev.loaded()
    }
  }

  private get allCardsShown() {
    return this.shownCardsLength >= this.cards.length
  }

  private get shownCards() {
    return this.cards.slice(0, this.shownCardsLength)
  }

  get style() {
    return {
      width: `${this.width}px`,
      minWidth: `${this.width}px`,
    }
  }

  get cardCount() {
    return this.cards.length > 0 ? `${this.cards.length}` : ''
  }

  private onDragStart(evt: any) {
    this.draggedIndex = evt.oldIndex
    this.$emit('drag-start', evt.oldIndex)
  }

  private onDragEnd() {
    // On slow browsers `dragging` is unset too fast, which causes disabled links in draggable to be clicked.
    void nextRender().then(() => {
      this.draggedIndex = null
      this.$emit('drag-end')
    })
  }

  private onChange(event: any) {
    if ('added' in event) {
      this.$emit('add', event.added.element.card, event.added.newIndex)
    } else if ('moved' in event) {
      this.$emit(
        'move',
        event.moved.element.card,
        event.moved.oldIndex,
        event.moved.newIndex,
      )
    } else if ('removed' in event) {
      this.$emit('remove', event.removed.element.card, event.removed.oldIndex)
    }
  }
}
</script>

<style lang="scss" scoped>
.column_container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-radius: 0.75rem;
  background-color: var(--kanban-backgroundColor);
  padding: 1.25rem 0.5rem 0.25rem 0.5rem;
  height: fit-content;
  max-height: 100%;
  color: var(--MainTextColor);

  &:hover {
    ::-webkit-scrollbar {
      display: block;
    }
  }
}

.column_header {
  display: flex;
  padding: 0 0.5rem;
}

.column_header__title_block {
  display: flex;
  align-items: center;
  width: 100%;
  color: var(--kanban-foregroundColor);
}

.column_header__title {
  overflow: hidden;
  font-weight: bold;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column_header__count {
  position: relative;
  bottom: 0.25rem;
  left: 0.5rem;
  color: var(--kanban-foregroundDarkerColor);
  font-size: 0.75rem;
}

.column_select_checkbox {
  vertical-align: middle;
}

.column_body {
  padding-bottom: 0;
  height: 100%;
  min-height: 100px;
  overflow-x: hidden;
}

.column_controls {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.column_controls > i {
  vertical-align: middle;
}

.add-button {
  border: 0;
}

.no-card {
  border: 1px dashed var(--kanban-foregroundDarkerColor);
  border-radius: 0.25rem;
  padding: 2rem 0;
  color: var(--kanban-foregroundDarkerColor);
}

::v-deep .card_dragging_ghost {
  border-width: 0;
  border-radius: 0.25rem;
  background-color: var(--kanban-backgroundDarker2Color, #ddd) !important;

  > * {
    visibility: hidden;
  }
}

.card_dragging_drag {
  transform: rotate(3deg);
  opacity: 1 !important;
  box-shadow: 0 10px 10px -10px;
}

@media screen and (max-width: 460px) {
  .mob-handle {
    border-radius: 0.25rem 0.25rem 0 0;
    background-color: var(--kanban-backgroundDarker2Color, #ddd);
    height: 20px;
  }
}

::-webkit-scrollbar {
  display: none;
  width: 3px;
  height: 10px;
}

::-webkit-scrollbar-thumb {
  border-radius: 5px;
  background: rgba(150, 150, 150, 0.5);
}

::-webkit-scrollbar-track {
  border-radius: 5px;
  background: rgba(50, 50, 50, 0.1);
}

::-webkit-scrollbar-thumb:vertical:hover {
  background: #999;
  width: 100px;
}

::-webkit-scrollbar-thumb:vertical:active {
  background: #777;
}
</style>
