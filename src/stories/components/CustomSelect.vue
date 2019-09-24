<template>
  <MultiSelect
    :value="value"
    :height="height"
    @update:value="updateValue"
    :options="users"
    :single="single"
    :disabled="disabled"
    :required="required">
    <template v-slot:singleValue="select">
      <span class="user_bar__container user_bar__container_single" :style="select.listValueStyle">
        <img
          v-if="select.valueOption.meta && select.valueOption.meta.img"
          class="user_bar__image"
          :src="select.valueOption.meta.img"
          :style="getUserBarStyle(select.valueOption)"
        ></img>
        <span>{{select.valueOption.label}}</span>
      </span>
    </template>
    <template v-slot:label="select">
      <span
        v-for="option, index in select.valueOptions"
        class="values_list__value"
        :style="select.listValueStyle"
        @click.stop>
        <img
          v-if="option.meta && option.meta.img"
          class="user_bar__image"
          :src="option.meta.img"
          :style="getUserBarStyle(option)"
        ></img>
        {{option.label}}
        <input @click="select.removeValue(index)" type="button" class="material-icons values_list__value__close" value="close">
      </span>
    </template>
    <template v-slot:option="select">
      <table class="options_table select_container__options_list"
        v-if="getHasOptionsLeft(select.selectedOptions)" >
        <thead>
          <th>&nbsp;</th>
          <th>Username</th>
          <th>Random</th>
        </thead>
        <tbody>
          <tr
            v-for="option, index in select.selectedOptions"
            @click="select.addOptionToValue(option)"
            :class="[
                   'user_row',
                  'select_container__options_list__option',
                  {'select_container__options_list__option_active': select.selectedOption === index }
                  ]"
          >
            <td style="width: 30px;">
              <div
                v-if="option.meta && option.meta.img"
                class="user_bar__image"
                :style="getUserBarStyle(option)"
              ></div>
            </td>
            <td class="table_user_name"><span>{{option.label}}</span></td>
            <td class="table_user_name"><span>LMAO</span></td>
          </tr>
        </tbody>
      </table>
    </template>
  </MultiSelect>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import * as R from "ramda";
import MultiSelect, { ISelectOption } from "@/components/multiselect/MultiSelect.vue";

const users: ISelectOption[] = [
  { value: "user_a", label: "User A", meta: { img: "https://gensokyo.social/system/media_attachments/files/000/970/409/original/abb19b4f3bff62c0.png"}},
  { value: "user_b", label: "User B", meta: { img: "https://files.botsin.space/accounts/avatars/000/168/024/original/fe5556fe411f42f4.png"}},
  { value: "user_c", label: "User C", meta: { img: "https://cdn.mastodon.technology/accounts/avatars/000/107/402/original/f3ee4e42a0dcd88a.png"}},
  { value: "user_d", label: "User D", meta: { img: "https://pleroma.voidlurker.net/media/72364a5c2141851a4c89478c000f7feb960a9d0e8922ef3efe6e1f7e0dbe76fc.png?name=blob.png"}},
  { value: "user_f", label: "User F", meta: { img: "https://media.monads.online/monads-online-mastodon/accounts/avatars/000/000/001/original/2NN3S9C2IA81.png"}},
];

@Component({
  components: { MultiSelect },
})
export default class CustomSelect extends Vue {
  @Prop({}) value!: any;
  @Prop({ type: Boolean, default: false }) single!: boolean;
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  @Prop({ type: Number, default: null }) height?: number;

  private users: ISelectOption[] = users;

  private getUserBarStyle(option: ISelectOption) {
    const url = R.pathOr(null, ["meta", "img"], option);
    console.log(this.disabled);
    return { backgroundImage: `url(${url})` };
  }

  private getHasOptionsLeft(selectedOptions: ISelectOption[] = []) {
    return !R.isEmpty(selectedOptions);
  }

  private updateValue(val: any) {
    this.$emit("update:value", val);
  }
}
</script>

<style>
 .user_bar__container_single {
   height: 40px;
 }
 .user_bar__container_multi {
   height: 30px;
 }
 .user_bar__container {
   display: flex;
   flex-direction: row;
   align-items: center;
 }
 .user_bar__image {
   height: 30px;
   width: 30px;
   background-size: cover;
   background-repeat: no-repeat;
   margin-right: 5px;
 }
 .user_row {
   cursor: pointer;
 }
 .user_row:hover {
   background-color: var(--NavigationBackColor);
   color: var(--NavigationTextColor);
 }
 .options_table {
   width: 100%;
 }
</style>
