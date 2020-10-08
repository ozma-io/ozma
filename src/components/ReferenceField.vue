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
    <SelectUserView
      v-if="selectedView"
      :initial-view="selectedView"
      :select-entity="entry.entity"
      @select="selectFromView"
      @close="selectedView = null"
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
          <FunLink
            class="single_value__link"
            :link="select.valueOption.meta.link"
            @goto="$emit('goto', $event)"
          >
            <input
              type="button"
              class="material-icons reference__open_modal"
              :value="iconValue(select.valueOption.meta.link.target)"
            >
          </FunLink>
          <span>{{ select.valueOption.label }}</span>
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
          v-for="(action, index) in selectActions"
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
import { namespace } from "vuex-class";

import { IUserViewArguments, ICombinedValue, homeSchema, currentValue, IEntriesRef } from "@/state/user_view";
import { IQuery } from "@/state/query";
import SelectUserView from "@/components/SelectUserView.vue";
import { ISelectOption } from "@/components/multiselect/MultiSelect.vue";
import MultiSelect from "@/components/multiselect/MultiSelect.vue";
import { Action } from "@/components/ActionsMenu.vue";
import BaseEntriesView from "@/components/BaseEntriesView";
import { attrToLinkRef } from "@/links";


const query = namespace("query");


export interface IReferenceSelectAction {
  name: string;
  query: IQuery;
}

@Component({
  components: {
    SelectUserView,
    MultiSelect,
  },
})
export default class ReferenceField extends mixins(BaseEntriesView) {
  @query.Action("addWindow") addWindow!: (query: IQuery) => Promise<void>;
  @Prop({ type: Array, default: () => [] }) selectActions!: IReferenceSelectAction[];
  @Prop({ type: Object, required: true }) value!: ICombinedValue;
  @Prop({ type: Object, required: true }) entry!: IEntriesRef;
  @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;
  @Prop({ type: Object }) linkedAttr!: any | undefined;
  @Prop({ type: Boolean, default: false }) isDisabled!: boolean;
  @Prop({ type: Boolean, default: false }) isNullable!: boolean;
  @Prop({ type: Boolean, default: false }) dontOpen!: boolean;
  @Prop({ type: Number }) height!: number | undefined;
  @Prop({ type: Object }) controlStyle!: any;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: String }) backgroundColor!: string;

  private selectedView: IQuery | null = null;

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
          link: attrToLinkRef(this.linkedAttr, id, linkOpts),
        },
      }));
    }
  }

  private iconValue(target: string) {
    if (target === 'modal-auto' || target === 'modal')
      return 'flip_to_front';
    else
      return 'open_in_new';
  }

  private selectFromView(id: number) {
    this.selectedView = null;
    this.$emit('update', id);
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

  .single_value__link {
    display: flex;
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
