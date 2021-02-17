<template>
  <div class="buttons_wrapper">
    <ul class="buttons">
      <template v-for="(button, i) in buttons">
        
        <span
          v-if="'callback' in button"
          :key="i"
          @click="button.callback()"
        >
          <li 
            v-b-tooltip.hover   
            :title="button.tooltip"
          >
            <i v-if="button.icon" :class="['material-icons',{'emoji-icon': getIconType(button.icon) == 'emoji' }]">{{ button.icon }}</i>
            <span v-if="button.name">{{ button.name }}</span>
          </li>
        </span>
        
        <FunLink
          v-else-if="'link' in button"
          :key="i"
          :link="button.link"
          @goto="$emit('goto', $event)"
        >
          <li 
            v-b-tooltip.hover   
            :title="button.tooltip"
          >
            <i v-if="button.icon" :class="['material-icons',{'emoji-icon': getIconType(button.icon) == 'emoji' }]">{{ button.icon }}</i>
            <span v-if="button.name">{{ button.name }}</span>
          </li>
        </FunLink>

        <span v-else-if="'actions' in button" :key="i">
          <li>
            <popper
              trigger="focus"
              :options="{
                placement: 'bottom',
                modifiers: { offset: { offset: '0,10px' } }
              }"
            >
              <button slot="reference" >
                <i :class="['material-icons',{'emoji-icon': getIconType(button.icon) == 'emoji' }]">{{ button.icon }}</i>
                <span>{{ button.name }}</span>
              </button>

              <ul class="actions popper border rounded overflow-hidden shadow">
                <FunLink
                  v-for="(action, j) in button.actions"
                  :key="j"
                  :link="action.link"
                  @goto="$emit('goto', $event)"
                >
                  <li v-if="'link' in action" :key="action.name">
                    <i :class="['material-icons',{'emoji-icon': getIconType(action.icon) == 'emoji' }]">{{ action.icon || "arrow_right" }}</i>
                    <span>{{ action.name }}</span>
                  </li>
                </FunLink>
              </ul>
            </popper>
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
import Popper from "vue-popperjs";
import { dragscroll } from "vue-dragscroll";

export interface IPanelButton { // Default for buttons panel
  icon?: string;
  name?: string;
  actions: Action[];
}

export interface IActionPanelButton {
  tooltip?: string;
}

export type PanelButton = IPanelButton | IActionPanelButton & Action;


@Component({
  components: { Popper },
  directives: { dragscroll },
})
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
    display: flex;

    & a {
      text-decoration: none;
      color: var(--MainTextColor);
    }

    & > a,
    & > span {
      & > li {
        display: flex;
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
          background-color: inherit;    
          display: flex;
          border-radius: 2px;
          padding: 0;

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
  }  

  ul.actions {
    & a {
      text-decoration: none;
      color: var(--MainTextColor);
    }

    & > span > li,
    & > a > li {
      display: flex;
      padding: 0.3rem 1rem;

      & > span {
        line-height: 1.5rem;
        margin-left: 10px;
        white-space: nowrap;
        overflow: hidden !important;
        text-overflow: ellipsis;
      }

      &:hover {
        background-color: var(--MainHoverBackgroundColor) !important;    
      }

    }
  }
</style>
