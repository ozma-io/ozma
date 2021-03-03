<template>
  <div class="avatar-box">
    <div
      class="placeholder-avatar"
      :style="{
        backgroundColor: placeholderAvatarColor,
      }"
    >
      {{ placeholderAvatarText }}
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

const toColor = (str: string) => {
  let hash = 0;
  if (!str) return "black";
  for (const ch of str.split("")) {
    hash = (hash << (8 - hash)) + ch.charCodeAt(0);
  }
  return `hsl(${hash % 360}, 60%, 60%)`;
};

@Component({ directives: {} })
export default class Avatar extends Vue {
  @Prop({ type: String, required: true }) username!: string;

  private get placeholderAvatarColor(): string {
    return toColor(this.username);
  }

  private get placeholderAvatarText(): string {
    return this.username.split(" ", 2).map(word => word[0]).join("").toUpperCase();
  }
}
</script>

<style lang="scss" scoped>
  .avatar-box {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    overflow: hidden;

    .placeholder-avatar {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1.3rem;
      font-weight: bold;
      color: white;
      user-select: none;
    }
  }
</style>
