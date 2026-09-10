<template>
  <b-col
    cols="12"
    :lg="blockContent.size"
    :class="[
      'form_grid_block__column',
      {
        'element-block': blockContent.type === 'element',
        'full-width-element': isFullWidth && blockContent.type === 'element',
      },
    ]"
  >
    <div
      :class="[
        {
          first_level_grid_block: firstLevel,
          'has-sub-blocks': firstLevel && blockContent.type === 'section_with_sub_blocks',
          'has-no-content': hasNoContent,
          'only-nested-userview': singleUserViewSection,
        },
      ]"
    >
      <slot
        v-if="blockContent.type === 'element'"
        :element="blockContent.element"
      />
      <b-row v-else-if="blockContent.type === 'section'">
        <FormGridBlock
          v-for="(subBlock, subBlockI) in blockContent.content"
          :key="subBlockI"
          v-slot="slotProps"
          :block-content="subBlock"
          :parent-full-width="isFullWidth"
        >
          <slot :element="slotProps.element" />
        </FormGridBlock>
      </b-row>
      <template v-else-if="blockContent.type === 'section_with_sub_blocks'">
        <template v-for="(subBlock, subBlockI) in blockContent.subBlocks">
          <!-- Sub-block with card: rendered as a glass card -->
          <div
            v-if="subBlock.hasCard"
            :key="subBlockI"
            :class="['form_sub_block', { 'form_sub_block--unstyled': !formSubBlocksEnabled }]"
            :style="subBlock.color && formSubBlocksEnabled ? { '--sub-block-color': subBlock.color } : {}"
          >
            <div v-if="subBlock.title" class="form_sub_block__title">
              {{ subBlock.title }}
            </div>
            <b-row>
              <FormGridBlock
                v-for="(item, itemI) in subBlock.content"
                :key="itemI"
                v-slot="slotProps"
                :block-content="item"
                :parent-full-width="isFullWidth"
              >
                <slot :element="slotProps.element" />
              </FormGridBlock>
            </b-row>
          </div>
          <!-- Elements without sub-block: rendered with standard background -->
          <div v-else :key="'inline-' + subBlockI" class="form_inline_block">
            <b-row>
              <FormGridBlock
                v-for="(item, itemI) in subBlock.content"
                :key="itemI"
                v-slot="slotProps"
                :block-content="item"
                :parent-full-width="isFullWidth"
              >
                <slot :element="slotProps.element" />
              </FormGridBlock>
            </b-row>
          </div>
        </template>
      </template>
    </div>
  </b-col>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import type { GridElement } from '@/components/form/FormGrid.vue'

@Component({
  name: 'FormGridBlock',
})
export default class FormGridBlock extends Vue {
  @Prop({ type: Object }) blockContent!: GridElement<any>
  @Prop({ type: Boolean, default: false }) firstLevel!: boolean
  @Prop({ type: Boolean, default: false }) hasNoContent!: boolean
  @Prop({ type: Boolean, default: false }) singleUserViewSection!: boolean
  // The form itself always spans the whole width, so first-level blocks start from `true`.
  @Prop({ type: Boolean, default: true }) parentFullWidth!: boolean

  // True when this block spans the whole form width, i.e. every block on the
  // way down from the form root takes all 12 columns.
  get isFullWidth(): boolean {
    return this.parentFullWidth && this.blockContent.size === 12
  }

  get formSubBlocksEnabled(): boolean {
    return this.$store.state.settings.current.getEntry(
      'form_sub_blocks',
      Boolean,
      false,
    )
  }
}
</script>

<style lang="scss" scoped>
.form_grid_block__column {
  padding-right: 0;
  padding-bottom: 0;
  padding-left: 0;

  &:not(:last-child) {
    margin-bottom: 0.625rem;
  }

  &.element-block.col-lg-12 ::v-deep .col-12 {
    padding: 0;

    .border-label {
      left: 0.5rem;
    }
  }
}

.first_level_grid_block {
  border-radius: 0.75rem;
  background: var(--backgroundColor);
  padding: 1.25rem;
  height: 100%;

  @include mobile {
    padding: 1.25rem 0.75rem 0.75rem 0.75rem;
  }

  // Remove box shadow from nested .first_level_grid_block
  .first_level_grid_block {
    box-shadow: none;
  }

  &:not(.only-nested-userview) {
    ::v-deep .nested-userview {
      margin-top: 0.5rem;
      margin-bottom: 0.25rem;
      border: 1px solid var(--default-borderColor);
      border-radius: 0.625rem;
      overflow: hidden;
    }
  }

  &.has-sub-blocks {
    background: transparent;
    border: none;
    border-radius: 0;
    box-shadow: none;
    padding: 0;
  }
}

.form_inline_block {
  border-radius: 0.75rem;
  background: var(--backgroundColor);
  padding: 1.25rem;
  margin-bottom: 0.75rem;

  @include mobile {
    padding: 1.25rem 0.75rem 0.75rem 0.75rem;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.form_sub_block {
  border: 1px solid var(--default-borderColor);
  border-radius: 1.5rem;
  background: var(--sub-block-color, var(--backgroundColor)) !important;
  padding: 1.5rem;
  margin-bottom: 0.75rem;

  &.form_sub_block--unstyled {
    border: none;
    border-radius: 0;
    background: transparent !important;
    padding: 0;
    margin-bottom: 0;
  }

  @include mobile {
    padding: 1rem 0.75rem 0.75rem 0.75rem;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.form_sub_block__title {
  margin-bottom: 1.25rem;
  padding-bottom: 0;
  color: var(--default-foregroundDarkerColor);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.has-no-content {
  display: none;
}

.only-nested-userview {
  padding: 0;
}

.row {
  margin: 0;
}

/* A nested user view stretched across the whole form width keeps its header
   (title, search, buttons) pinned while its content scrolls away. */
.form_grid_block__column.full-width-element {
  ::v-deep .nested-userview {
    /* `clip` instead of `hidden`: it still cuts the rounded corners, but
       doesn't become a scroll container, which would kill the sticky header.
       `hidden` stays as a fallback for browsers without `clip`. */
    overflow: hidden;
    overflow: clip;
  }

  ::v-deep .nested-userview > .header-panel {
    position: sticky;
    top: 0;
    /* Above the table's own sticky cells and dropdowns (up to 31). */
    z-index: 32;
    background: var(--backgroundColor);
  }

  /* The table's column headers are sticky too, but they resolve against the
     nearest scroll container, so nothing between them and the page may be one.
     A table wider than the form has to keep its own horizontal scroll, which
     makes the wrapper a scroll container again; Table.vue then follows the
     page scroll by hand and moves the sticky `top` of the headers (a
     transform would cut their backdrop blur off from the rows). Views with
     `control_height` scroll inside their box and are left alone. */
  ::v-deep .nested-userview:not(.fixed-height) {
    .userview-wrapper,
    .userview-overlay,
    .table-wrapper:not(.horizontal-overflow) {
      overflow: visible;
    }

    .table-wrapper:not(.horizontal-overflow) th {
      top: calc(var(--nested-header-height, 0px) - 1px);
    }

    .table-wrapper.horizontal-overflow {
      --pinned-headers: 1;

      th {
        top: var(--pinned-header-offset, -1px);
      }

      /* Follow the page scroll on the compositor: as the wrapper exits the
         scrollport (inset by the header panel), the headers move down by the
         same distance, starting when the table's top reaches the panel and
         stopping at the table's end. Table.vue sets the three lengths. */
      @supports (animation-timeline: view()) {
        view-timeline: --pinned-table block;
        view-timeline-inset: calc(var(--nested-header-height, 0px) - 1px) auto;

        th {
          animation: pinned-header linear both;
          animation-timeline: --pinned-table;
          /* `exit-crossing`, not `exit`: for a wrapper taller than the
             scrollport `exit` only starts once its bottom edge is in view. */
          animation-range: exit-crossing var(--pinned-header-start, 0px)
            exit-crossing var(--pinned-header-end, 0px);
        }
      }
    }
  }
}

@keyframes pinned-header {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(var(--pinned-header-max, 0px));
  }
}
</style>
