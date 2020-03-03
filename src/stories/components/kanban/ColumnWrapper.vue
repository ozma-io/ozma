<template>
    <b-container fluid>
        <b-row>
            <b-col :cols="cardSize">
                <Column :cards="data" title="Первый контакт" />
            </b-col>
        </b-row>
    </b-container>
</template>

<script lang="ts">
import { Vue, Prop, Component } from "vue-property-decorator";
import Column from "@/components/kanban/Column.vue";
import { ICard } from "@/components/kanban/Card.vue";

const cards: ICard[] = [
    {
        rows: [
            [{ type: "text", value: "ТрансТехСервис", size: 9 }, { type: "image", value: "https://drive.nya.social/files/6acd01ba-ef3f-46c9-af3b-35046aebf2b0.png", size: 3 }],
            [{ type: "text", value: "8 Машинок и скутер", size: 12 }],
            [{type: "text", value: "1 000 000 руб", size: 6}, {type: "text", value: "Прошёл 1 день", size: 6}],
        ],
    },
    {
        rows: [
            [{ type: "text", value: "Трансаэро", size: 9 }, { type: "image", value: "https://drive.nya.social/files/6acd01ba-ef3f-46c9-af3b-35046aebf2b0.png", size: 3 }],
            [{ type: "text", value: "Лепнина", size: 12 }],
            [{type: "text", value: "1 000 000 руб", size: 6}, {type: "text", value: "Через 6 дней", size: 6}],
        ],
    },
    {
        rows: [
            [{ type: "text", value: "Сорус", size: 9 }, { type: "image", value: "https://drive.nya.social/files/6acd01ba-ef3f-46c9-af3b-35046aebf2b0.png", size: 3 }],
            [{ type: "text", value: "1000 статуэток", size: 12 }],
            [{type: "text", value: "1 000 000 руб", size: 6}, {type: "text", value: "Через 8 дней", size: 6}],
        ],
    },
    {
        rows: [
            [{ type: "text", value: "Холидей Классик", size: 9 }, { type: "image", value: "https://drive.nya.social/files/6acd01ba-ef3f-46c9-af3b-35046aebf2b0.png", size: 3 }],
            [{ type: "text", value: "Подставки для ручек", size: 12 }],
            [{type: "text", value: "1 000 000 руб", size: 6}, {type: "text", value: "Прошёл 1 день", size: 6}],
        ],
    },
];

@Component({ components: { Column }})
export default class ColumnWrapper extends Vue {
    @Prop({ type: Number, required: false, default: 5 }) cardSize!: number;

    data: ICard[] = cards;
}
</script>
