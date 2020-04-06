<template>
  <b-container fluid>
    <b-row>
      <b-col :cols="cardSize">
        <Card :data="data" />
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Vue, Prop, Component } from "vue-property-decorator";
import Card, { ICard, ICardRow } from "@/components/kanban/Card.vue";

const data: ICard = {
  rows: [
    [{ type: "text", value: "ТрансТехСервис", size: 9 }, { type: "image", value: "https://drive.nya.social/files/6acd01ba-ef3f-46c9-af3b-35046aebf2b0.png", size: 3 }],
    [{ type: "text", value: "8 Машинок и скутер", size: 12 }],
    [{type: "text", value: "1 000 000 руб", size: 6}, {type: "text", value: "Прошёл 1 день", size: 6}],
  ],
};

@Component({ components: { Card }})
export default class CardWrapper extends Vue {
  @Prop({ type: Number, required: false, default: 5 }) cardSize!: number;

  data: ICard = data;
}
</script>
