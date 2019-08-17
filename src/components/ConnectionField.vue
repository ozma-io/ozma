<i18n>
    {
        "en": {
            "empty": "(Empty)"
        },
        "ru": {
            "empty": "(Пусто)"
        }
    }
</i18n>

<template>
    <div class="field-block">
        <div class="added-block">
            <input @input="addEntry();" v-model="search" list="entrys" ref="newentry" class="search-input">
            <datalist id="entrys">
                <option v-for="option in options" v-bind:key="option.value" v-bind:value="option.text" ></option>
            </datalist>
        </div>
        <div v-if="!selectedEntries.length && !showedField" class="empty-block">{{$t('empty')}}</div>
        <div :class="['entrys-block',{'entrys-meny-block':(meny && selectedEntries.length > 1)||showedField}]">
            <div v-for="entry in selectedEntries" :class="['entry-block',{'entry-meny-block':manyFields && selectedEntries.length > 1,
                                                                           'link':entry.link}]"> 
                <UserViewLink v-if="entry.link !== null" :uv="entry.link">{{entry.text}}</UserViewLink>
                <span v-else>{{entry.text}}</span>
                <div v-if="manyFields" class="buttoncolor-block clear-block"><input type="button" class="material-icons button_clear" value="clear" @click="deletion(entry.text)"/></div>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
    import { Component, Prop, Vue, Watch } from "vue-property-decorator"
    import { IQuery } from "@/state/query"

    export interface ISelectOption {
        text: string
        value: string
        link: IQuery | null
    }

    interface ISelectedEntry {
        text: string
        value: string
        link: IQuery | null
    }

    @Component
    export default class ActionsMenu extends Vue {
        @Prop({ type: Array }) options!: ISelectOption[]
        @Prop() value!: any
        @Prop({ type: Boolean }) manyFields!: boolean
        @Prop() link!: IQuery | null

        private search: string = ""
        private showedField: boolean = false
        private selectedEntries: ISelectedEntry[] = []

        private created() {
            for (const i of this.options) {
                if (i.value === this.value.toString()) {
                    this.selectedEntries.push({ text: i.text, value: i.value, link: i.link })
                }
            }
        }
        @Watch("foo")
        private change() {
            this.created()
        }
        private clear() {
            this.selectedEntries = []
        }
        private deletion(text: string) {
            const indexarray = (a: ISelectedEntry[], txt: string) => {
                for (let i = 0; i < a.length; i++) {
                    if (a[i].text === txt) {
                        return i
                    }
                }
                return -1

            }
            this.selectedEntries.splice(indexarray(this.selectedEntries, text), 1)
            const newValue = null
            this.$emit("update:value", newValue)
        }
        private addEntry() {
            const newentry: any = this.$refs["newentry"]
            const indexarray = (a: ISelectedEntry[], txt: string) => {
                for (let i = 0; i < a.length; i++) {
                    if (a[i].text === txt) {
                        return i
                    }
                }
                return -1

            }
            const inarray = (a: ISelectedEntry[], txt: string) => {
                if (indexarray(a, txt) >= 0) {
                    return true
                }
                return false

            }
            const entrytext: string = newentry.value
            const entryvalue: string = this.options[indexarray(this.options, entrytext)].value
            const entrylink: IQuery | null = this.options[indexarray(this.options, entrytext)].link
            const elemoftext: ISelectedEntry = { text: entrytext, value: entryvalue, link: entrylink }
            if (!this.manyFields) {
                this.clear()
            }
            if (!inarray(this.selectedEntries, entrytext) && inarray(this.options, entrytext)) {
                this.selectedEntries.push(elemoftext)
                this.search = ""

                if (!this.manyFields) {
                    const newValue = this.selectedEntries[0].value
                    this.$emit("update:value", newValue)
                }
            }
            newentry.blur()
        }
    }
</script>

<style scoped>
    a {
        color: var(--ButtonTextColor) !important;
    }
    .link {
        z-index: 101;
        position: sticky;
    }
    .field-block{
        display: contents;
        vertical-align: bottom;
        flex-wrap: wrap;
    }
    .field-block:after {
        content: '';
        width: 100%;
        order: 0;
    }
    .added-block{
        display: inline-block;
        width: 5px;
    }
    .added-color-block{
        margin-left:5px;
    }
    .button_clear {
        padding: 2px;
        color: var(--ButtonTextColor) !important;
        background: hsla(0,0%,100%,.3);
        border: 0px !important;
        outline: none;
    }
    .buttoncolor-block {
        background-color: var(--MenuColor);
        width: max-content;
        height: calc(1.4em + 1.5px);
        display: inline-block;
        vertical-align: top;
    }
    .clear-block {
        height: calc(1rem + 4px);
        vertical-align: middle;
    }
    .search-input {
        padding: 0;
        border: 0;
        width: 300vh;
        opacity: 0;
        margin-left: 5px;

    }
    .search-input:focus{
        opacity:1;
        position:relative;
        z-index: 102;
    }
    .empty-block {
        color: #D6D5D5;
        margin-left: 5px;
        display:inline-block;
    }
    .entrys-block{
        display:inline-block;
    }
    .entry-meny-block:first-child {
        margin-left: 2px;
    }
    .entry-block{
        margin-left: 5px;
    }
    .entry-block::after {
        content: ";";
        color: var(--ButtonTextColor);
    }
    .entry-block:last-child:after {
        content: "";
    }
    .entrys-meny-block{
       display: flex;
    }
    .entry-meny-block{
        display: block;
        order: 1;
    }
</style>
