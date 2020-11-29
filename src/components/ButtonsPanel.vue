<template>
  <ul class="buttons">
    <li v-for="(button, i) in buttons" :key="i">
      <i v-if="button.icon" class="material-icons">{{ button.icon }}</i>
      <span>{{ button.name }}</span>
      <ul class="actions">
        <FunLink
          v-for="(action, j) in button.actions"
          :key="j"
          :link="action.link"
          @goto="$emit('goto', $event)"
        >
          <li v-if="'link' in action" :key="action.name">
            <i v-if="button.icon" class="material-icons">{{ action.icon }}</i>
            <span>{{ action.name }}</span>
          </li>
        </FunLink>
      </ul>
    </li>
  </ul>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { Action } from "@/components/ActionsMenu.vue";

export interface IPanelButton {
  icon?: string;
  name: string;
  actions: Action[];
}

@Component
export default class ButtonsPanel extends Vue {
  @Prop({ type: Array, required: true }) buttons!: IPanelButton[];
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

  ul.buttons a {
    color: inherit;
    text-decoration: none;
  }

  ul.buttons {
    position: absolute;
    right: 55px;
  }

  .search-show + ul.buttons {
    display: none;
  }

  ul.buttons .material-icons {
    position: absolute;
    font-size: 18px;
    left: 0;
    margin: 1px 0 0 2px;
    padding: 0;
  }

  ul.buttons > li {
    position: relative;
    display: block;
    float: left;
    border: 1px solid var(--MainBackgroundColor);
    border-radius: 3px;
    padding: 5px 5px 5px 22px;
    margin-right: 10px;
    cursor: pointer;
    transition: 0.2s background-color ease-in-out, 0.2s box-shadow ease-in-out, 0.2s border-color ease-in-out;
  }

  ul.actions .material-icons {
    position: absolute;
    font-size: 18px;
    left: 0;
    margin: 1px 0 0 10px;
  }

  ul.actions > a > li {
    padding: 5px 15px 5px 35px;
  }

  ul.buttons > li:hover {
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

  ul.buttons > li:hover ul.actions {
    opacity: 1;
    visibility: visible;
  }

  ul.actions > a > li:hover {
    background-color: var(--MainBorderColor);
  }

  @media only screen and (max-width: 600px) {
    ul.buttons {
      display: none;
    }
  }
</style>
