      v-b-tooltip.click.blur.bottom.noninteractive
      class="input_label"
      :title="title"
    >
      {{ title }}
    </label>
    <ButtonsPanel
      :buttons="buttons"
      @goto="$emit('goto', $event)"
    >
      <template #search-panel>
        <SearchPanel
          v-if="isEnableFilter"
          @update:filterString="$emit('update:filterString', $event)"
        />
      </template>
      <template #actions-menu>
        <ActionsMenu
          :actions="actions"
          :buttons="buttons"
          menu-align="right"
          @goto="$emit('goto', $event)"
        />
        <i
          class="material-icons material-button fullscreen_button"
          @click.stop="openFullscreen()"
        >fullscreen</i>
      </template>
    </ButtonsPanel>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Action } from "@/components/ActionsMenu.vue";
import type { IUserViewType } from "@/components/FormControl.vue";
import { queryLocation } from "@/state/query";
import { router } from "@/modules";
import { PanelButton } from "@/components/ButtonsPanel.vue";
import SearchPanel from "@/components/SearchPanel.vue";

@Component({
  components: {
    SearchPanel,
  },
})
export default class HeaderPanel extends Vue {
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: Array, required: true }) actions!: Action[];
  @Prop({ type: Array, required: true }) buttons!: PanelButton[];
  @Prop({ type: Boolean, required: true }) isEnableFilter!: boolean;
  @Prop({ type: Object, default: null }) view!: IUserViewType;

  private openFullscreen() {
    if (this.view !== null) {
      void router.push(queryLocation(this.view));
    }
  }
}

</script>

<style scoped>
  .nested-menu {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .input_label {
    margin-bottom: 0;
    color: var(--MainTextColor);
    font-weight: 600;
    font-size: 1.25em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;
  }

  .fullscreen_button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--MainTextColor);
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .input_label {
        max-width: 150px;
      }
    }
  }
</style>
