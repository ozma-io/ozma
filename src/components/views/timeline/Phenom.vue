<i18n>
  {
    "en": {
      "format": "Do MMM{year} [at] hh:mm A"
    },
    "ru": {
      "format": "Do MMM{year} [в] HH:mm"
    }
  }
</i18n>

<template>
  <li class="phenom">
    <div v-if="phenom.username" class="avatar-container">
      <Avatar
        :username="phenom.username"
      />
    </div>
    <b v-if="phenom.username" class="username">
      {{ phenom.username }}
    </b>
    <span
      v-if="phenom.type === 'message'"
      v-b-tooltip.hover.noninteractive
      class="datetime"
      :title="datetimeTooltipText"
    >
      {{ datetimeText }}
    </span>
    <span
      v-if="phenom.type === 'event'"
      class="event-text"
    >
      {{ eventText }}
    </span>
    <div
      v-if="phenom.type === 'event'"
      v-b-tooltip.hover.noninteractive
      class="datetime"
      :title="datetimeTooltipText"
    >
      {{ datetimeText }}
    </div>
    <!-- eslint-disable vue/multiline-html-element-content-newline -->
    <!-- eslint formatting messes with message formatting by `white-space: pre-wrap` -->
    <div
      v-if="phenom.type === 'message'"
      class="message-text border rounded shadow-sm"
    >{{ messageText }}</div>
    <!-- eslint-enable vue/multiline-html-element-content-newline -->
  </li>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import moment, { Moment } from "moment";
import Avatar from "@/components/Avatar.vue";
import { IRowPhenom } from "@/components/views/Timeline.vue";

export const phenomTypes = ["message", "event"] as const;
export type PhenomType = typeof phenomTypes[number];
export const isPhenomType = (str: string): str is PhenomType => phenomTypes.includes(str as PhenomType);
export interface IPhenom<PhenomT> {
  key: unknown;
  type: PhenomType;
  datetime: Moment;
  username: string | null;
  phenom: PhenomT;
}

// "Phenom" is shortening from "phenomenon",
// almost like "event" basically, but "event" is too overused for other things.
// Also Trello uses this name for same thing in code.
@Component({ components: { Avatar } })
export default class Phenom extends Vue {
  @Prop({ type: Object, required: true }) phenom!: IPhenom<IRowPhenom>;

  private get datetimeText() {
    const datetime = this.phenom.datetime;
    const current = moment();
    const isCurrentDay = datetime.isSame(current, "day");

    if (isCurrentDay) {
      return datetime.local().fromNow();
    } else {
      const isCurrentYear = datetime.isSame(current, "year");
      const year = isCurrentYear ? "" : " YY";
      return datetime.local().format(this.$t("format", { year }).toString());
    }
  }

  private get datetimeTooltipText() {
    return this.phenom.datetime.local().format(this.$t("format", { year: " YYYY" }).toString());
  }

  private get messageText() {
    return this.phenom.phenom.columns.map((row: any) => row.valueText).join("\n");
  }

  private get eventText() {
    return this.phenom.phenom.columns.map((row: any) => row.valueText).join(" ");
  }
}
</script>

<style lang="scss" scoped>
  .phenom {
    min-height: 3rem;
    position: relative;
    margin-left: 2.5rem;
    margin-bottom: 0.5rem;
    color: var(--MainTextColor);
    list-style-type: none;

    .avatar-container {
      position: absolute;
      left: -2.5rem;
    }

    .username {
      font-weight: bold;
      color: var(--default-foregroundColor);
    }

    .datetime {
      color: var(--default-foregroundDarkerColor);
      font-size: 0.8rem;
    }

    .event-text {
      overflow-wrap: break-word;
    }

    .message-text {
      margin-top: 0.25rem;
      padding: 0.25rem 0.5rem;
      background-color: var(--default-backgroundColor);
      white-space: pre-wrap;
      overflow-wrap: break-word;
    }
  }
</style>
