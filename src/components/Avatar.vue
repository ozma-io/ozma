<template>
  <div class="avatar-box">
    <div
      class="placeholder-avatar"
      :style="{
        backgroundColor: placeholderAvatarColor,
        borderRadius: round ? '50%' : '0.25rem',
      }"
    >
      <span v-if="placeholderAvatarText" class="letter">
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

  private get placeholderAvatarColor(): string {
    return this.username ? toColor(this.username) : "#ccc";
  }

  private get placeholderAvatarText(): string | null {
    return this.username?.split(" ", 2).map(word => word[0]).join("").toUpperCase() ?? null;
  }
}
</script>

<style lang="scss" scoped>
  .avatar-box {
    width: 2rem;
    height: 2rem;
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

      .letter {
        transform: translateY(0.1rem);
      }
    }
  }
</style>
