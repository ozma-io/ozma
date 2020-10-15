<template>
  <ul class="groups">
    <li v-for="(group, i) in groups" :key="i">
      <i v-if="group.icon" class="material-icons">{{ group.icon }}</i> 
      <span>{{ group.name }}</span>
      <ul class="actions">
        <li v-for="(action, j) in group.actions" :key="j">
          <i v-if="group.icon" class="material-icons">{{ action.icon }}</i> 
          <span>{{ action.name }}</span>
        </li>
      </ul>
    </li>
  </ul>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { Action } from "@/components/ActionsMenu.vue";

export interface IGroup {
  icon?: string;
  name: string;
  actions: Action[]; 
};

export type Group = IGroup;

@Component
export default class ActionsGroups extends Vue {
  @Prop({ type: Array, required: true }) groups!: Group[];

}
</script>

<style scoped>
  ul {
    margin: 0;
    padding: 0;
  }

  li {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  ul.groups {
    position: absolute;
    right: 55px;
  }

  ul.groups .material-icons {
    position: absolute;
    font-size: 18px;
    left: 0;
    margin: 1px 0 0 2px;
    padding: 0;
  }

  ul.groups > li {
    position: relative;
    display: block;
    float: left;
    border: 1px solid var(--MainBackgroundColor);
    border-radius: 3px;
    padding: 5px 5px 5px 20px;
    margin-right: 5px;
    cursor: pointer;
    transition: 0.2s background-color ease-in-out, 0.2s box-shadow ease-in-out, 0.2s border-color ease-in-out;
  }

  ul.actions .material-icons {
    position: absolute;
    font-size: 18px;
    left: 0;
    margin: 1px 0 0 10px;
  }

  ul.actions > li {
    padding: 5px 15px 5px 35px;
  }

  ul.groups > li:hover {
    border: 1px solid var(--MainBorderColor);
    background-color: #f9f9fb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  ul.actions {
    visibility: hidden;
    position: absolute;
    opacity: 0;
    border: 1px solid var(--MainBorderColor);
    border-radius: 3px;
    background-color: var(--MainBackgroundColor);
    box-shadow: 0 5px 5px rgba(0, 0, 0, 0.1);
    top: calc(100% + 5px);
    right: -10px;
    z-index: 1200;
    transition: 0.2s visibility ease-in-out, 0.2s opacity ease-in-out;
  }

  ul.groups > li:hover ul.actions {
    opacity: 1;
    visibility: visible;
  }

  ul.actions > li:hover {
    background-color: var(--MainBorderColor);
  }
</style>