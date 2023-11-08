<template>
  <div class="app-header">
    <div class="navigation-buttons-wrapper">
      <ButtonsPanel
        class="navigation-buttons"
        :buttons="navigationButtons"
        @goto="push({ ...$event, key: null })"
      />
    </div>
    <div class="logo">
      Ozma
    </div>
    <div class="profile-button-wrapper">
      <ProfileButton />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { Button } from "./components/buttons/buttons";
import { homeLink } from "./utils";
import { interfaceButtonVariant } from "./utils_colors";
import ProfileButton from "./ProfileButton.vue";
import { IQuery, QueryKey } from "./state/query";

const query = namespace("query");

@Component({ components: { ProfileButton } })
export default class AppHeader extends Vue {
  @query.Action("push") push!: (_: { key: QueryKey; query: IQuery; replace?: boolean }) => Promise<void>;

  private get navigationButtons(): Button[] {
    return [
      {
        type: "callback",
        icon: "arrow_back",
        variant: interfaceButtonVariant,
        callback: () => this.$router.back(),
      },
      {
        type: "link",
        icon: "home",
        variant: interfaceButtonVariant,
        link: homeLink,
      },
    ];
  }
}
</script>

<style lang="scss" scoped>
  .app-header {
    padding: 0.5rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    border-bottom: 1px solid var(--default-backgroundDarker2Color);

    .logo {
      margin-left: 1rem;
      font-size: 1.2rem;
    }

    .profile-button-wrapper {
      margin-left: auto;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
</style>
