<i18n>
    {
        "en": {
            "select_view": "Add in modal window",
            "follow_reference": "Open in modal window",
            "loading": "Loading"
        },
        "ru": {
            "select_view": "Создать во вложенном окне",
            "follow_reference": "Открыть во вложенном окне",
            "loading": "Загрузка"
        }
    }
</i18n>

<template>
  <div>
    <!-- Used when user selects an entry -->
    <ModalUserView
      v-if="selectedView"
      :initial-view="selectedView"
      :select-entity="entry.entity"
      @select="$emit('update', $event); selectedView = null"
      @close="selectedView = null"
    />

    <!-- Used when user opens a model window for an entry ("modal" button) -->
    <ModalUserView
      v-if="nestedView !== null"
      :initial-view="nestedView"
      @close="nestedView = null"
    />

    <MultiSelect
      v-if="options !== null"
      ref="control"
      :value="currentValue"
      :options="options"
      :height="height"
      single
      :autofocus="autofocus"
      :dont-open="dontOpen"
      :required="!isNullable"
      :disabled="isDisabled"
      :background-color="backgroundColor"
      @update:value="$emit('update', $event)"
      @focus="$emit('focus', $event)"
    >
      <template #singleValue="select">
        <span
          v-if="select.valueOption.meta && select.valueOption.meta.link"
          :style="select.listValueStyle"
          class="single_value"
        >
          <input
            type="button"
            class="material-icons reference__open_modal"
            value="flip_to_front"
            @click.stop="nestedView = select.valueOption.meta.link"
          >
          <UserViewLink
            :uv="select.valueOption.meta.link"
            @[indirectLinks?`click`:null]="$emit('goto', $event)"
          >
            {{ select.valueOption.label }}
          </UserViewLink>
        </span>
        <span
          v-else
          :style="select.listValueStyle"
          class="single_value"
        >{{ select.valueOption.label }}</span>
      </template>
      <template
        v-if="!isDisabled"
        #actions
      >
        <button
          v-for="(action, index) in actions"
          :key="index"
          type="button"
          class="reference__new_modal__button"
          @click="selectedView = action.query"
        >
          <input
            type="button"
            class="material-icons reference__open_modal"
            value="add"
          >
          {{ action.name }}
        </button>
      </template>
    </MultiSelect>
    <center v-else style="margin-top: 5px; color:#777;">
      {{ $t('loading') }}...
    </center>
    <!-- <input
      v-else
      ref="control"
      type="text"
      :autofocus="autofocus"
      class="reference_backup_input"
      :value="currentValue"
      :disabled="isDisabled"
      :required="!isNullable"
      :style="controlStyle"
      @input="$emit('update', $event.target.value)"
    > -->
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { IUserViewArguments, ICombinedValue, homeSchema, currentValue, IEntriesRef } from "@/state/user_view";
import { IQuery, attrToQueryRef } from "@/state/query";
import ModalUserView from "@/components/ModalUserView.vue";
import { ISelectOption } from "@/components/multiselect/MultiSelect.vue";
import MultiSelect from "@/components/multiselect/MultiSelect.vue";
import { Action } from "@/components/ActionsMenu.vue";
import BaseEntriesView from "@/components/BaseEntriesView";

@Component({
  components: {
    ModalUserView,
    MultiSelect,
  },
})
export default class ReferenceField extends mixins(BaseEntriesView) {
  @Prop({ type: Array, required: true }) actions!: Action[];
  @Prop({ type: Object, required: true }) value!: ICombinedValue;
  @Prop({ type: Object, required: true }) entry!: IEntriesRef;
  @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;
  @Prop({ type: Object }) selectView!: IQuery | undefined;
  @Prop({ type: Object }) linkedAttr!: any | undefined;
  @Prop({ type: Boolean, default: false }) isDisabled!: boolean;
  @Prop({ type: Boolean, default: false }) isNullable!: boolean;
  @Prop({ type: Boolean, default: false }) dontOpen!: boolean;
  @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
  @Prop({ type: Number }) height!: number | undefined;
  @Prop({ type: Object }) controlStyle!: any;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: String }) backgroundColor!: string;
  private selectedView: IQuery | null = null;
  private nestedView: IQuery | null = null;

  get entriesEntity() {
    return this.entry;
  }

  get currentValue() {
    return currentValue(this.value);
  }

  get options(): ISelectOption[] | null {
    if (this.currentEntries === null) {
      return null;
    } else {
      const home = homeSchema(this.uvArgs);
      const linkOpts = home !== null ? { homeSchema: home } : undefined;

      return Object.entries(this.currentEntries).map(([id, name]) => ({
        label: name,
        value: Number(id),
        meta: {
          link: attrToQueryRef(this.linkedAttr, id, linkOpts),
        },
      }));
    }
  }
}
</script>

<style scoped>
  .reference_backup_input {
    width: 100%;
  }

  .form-view {
    width: 85vw;
  }

  .single_value > a,
  .select_container__options_list__option > a {
    color: var(--MainTextColor);
    text-decoration: underline;
  }

  .reference__open_modal {
    border: none;
    background: none;
    padding: 0;
    margin: 0 10px 0 0;
    color: var(--MainBorderTextColor);
  }

  .reference__new_modal__button {
    color: var(--MainBorderTextColor);
    display: flex;
    align-items: center;
    width: 100%;
    background: var(--MainBorderColor);
  }
</style>
