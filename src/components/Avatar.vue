<template>
  <div
    class="avatar-box"
    :style="{ width: circleSize, height: circleSize }"
  >
    <div
      class="placeholder-avatar"
      :style="{
        backgroundColor: placeholderAvatarColor,
        borderRadius: round ? '50%' : '0.25rem',
      }"
    >
      <span
        v-if="placeholderAvatarText"
        class="letter"
        :style="{ fontSize: letterFontSize }"
      >
        {{ placeholderAvatarText }}
      </span>
      <span v-else class="material-icons">
        person
      </span>
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
  @Prop({ required: true }) username!: string | null;
  @Prop({ type: Boolean, default: false }) round!: boolean;
  @Prop({ type: Number, default: 1.875 }) size!: number; // in `rem`

  private get placeholderAvatarColor(): string {
    return this.username ? toColor(this.username) : "#ccc";
  }

  private get placeholderAvatarText(): string | null {
    return this.username?.split(" ", 2).map(word => word[0]).join("").toUpperCase() ?? null;
  }

  private get circleSize() {
    return `${this.size}rem`;
  }
  private get letterFontSize() {
    return `${this.size / 2}rem`;
  }
}
</script>

<style lang="scss" scoped>
  .avatar-box {
    overflow: hidden;

    .placeholder-avatar {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: bold;
      color: white;
      user-select: none;
    }
  }
</style>
