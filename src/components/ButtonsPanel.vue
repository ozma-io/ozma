<template>
  <div class="buttons_wrapper">
    <ul class="buttons">
      <template v-for="(button, i) in buttons">
        
        <span
          v-if="'callback' in button"
          :key="i"
          @click="button.callback()"
        >
          <li ref="button" class="material-button">
            <i v-if="button.icon" :class="['material-icons material-button',{'emoji': getIconType(button.icon) == 'emoji' }]">{{ button.icon }}</i>
            <span v-if="button.name">{{ button.name }}</span>
          </li>
        </span>
        <b-tooltip v-if="button.tooltip"  :target="()=>$refs.button">{{ button.tooltip }}</b-tooltip>
        <FunLink
          v-else-if="'link' in button"
          :key="i"
          :link="button.link"
          @goto="$emit('goto', $event)"
        >
          <li :id="'id' + i">
            <i v-if="button.icon" :class="['material-icons',{'emoji': getIconType(button.icon) == 'emoji' }]">{{ button.icon }}</i>
            <span v-if="button.name">{{ button.name }}</span>
          </li>

        </FunLink>

        <span v-else-if="'actions' in button" :key="i">
          <li>
            <button ref="button">
              <i :class="['material-icons',{'emoji': getIconType(button.icon) == 'emoji' }]">{{ button.icon }}</i>
              <span>{{ button.name }}</span>
            </button>
            <b-popover :target="()=>$refs.button" triggers="focus" placement="bottom">
              <ul class="actions">
                <FunLink
                  v-for="(action, j) in button.actions"
                  :key="j"
                  :link="action.link"
                  @goto="$emit('goto', $event)"
                >
                  <li v-if="'link' in action" :key="action.name">
                    <i :class="['material-icons',{'emoji': getIconType(action.icon) == 'emoji' }]">{{ action.icon || "arrow_right" }}</i>
                    <span>{{ action.name }}</span>
                  </li>
                </FunLink>
              </ul>
            </b-popover>
          </li>
        </span>
      </template>
    </ul>
    <slot name="search-panel" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Action } from "@/components/ActionsMenu.vue";
import { getIconType } from "@/utils";

export interface IPanelButton { // Default for buttons panel
  icon?: string;
  name?: string;
  actions: Action[];
}

export interface IActionPanelButton {
  tooltip?: string;
}

export type PanelButton = IPanelButton | IActionPanelButton & Action;

@Component
export default class ButtonsPanel extends Vue {
  @Prop({ type: Array, required: true }) buttons!: PanelButton[];

  private getIconType(str: string | undefined | null) {
    return getIconType(str);
  }
}
</script>

<style lang="scss" scoped>

  .buttons_wrapper {
    display: flex;
    align-items: center;
  }

  ul {
    margin: 0;
    padding: 0;
  }

  li {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  ul.buttons {
    & a {
      text-decoration: none;
      color: var(--MainTextColor);
    }

    & > a > li,
    & > span > li {
      display: flex;
      float: left;
      border-radius: 2px;
      cursor: pointer;
      margin: 0 2px;

      & span {
        line-height: 1.5rem;
        margin: 0 3px;    
      }

      &:hover {
        background-color: var(--MainHoverBackgroundColor);    
        box-shadow: 0 0 0 2px var(--MainHoverBackgroundColor);
      }

      &:active {
        background-color: var(--MainActiveBackgroundColor);    
        box-shadow: 0 0 0 2px var(--MainActiveBackgroundColor);
      }

      & button {
        background-color: var(--MainBackgroundColor);    
        display: flex;
        border-radius: 2px;

        & span {
          line-height: 1.5rem;
          margin: 0 3px;    
        }        

        &:hover {
          background-color: var(--MainHoverBackgroundColor);    
          box-shadow: 0 0 0 2px var(--MainHoverBackgroundColor);
        }

        &:active {
          background-color: var(--MainActiveBackgroundColor);    
          box-shadow: 0 0 0 2px var(--MainActiveBackgroundColor);
        }
      }
    }
  }  

  ul.actions {
    & > span > li,
    & > a > li {
      display: flex;

      & > span {
        line-height: 1.5rem;
        margin-left: 10px;
        white-space: nowrap;
        overflow: hidden !important;
        text-overflow: ellipsis;
      }

      &:hover {
        background-color: var(--MainHoverBackgroundColor);    
      }

    }
  }

  .emoji {
    font-size: 18px;
  }

</style>
