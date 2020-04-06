import Vue from "vue";

export default function makeFormField(Component: any, componentName: string) {
  return (
    Vue.component("FormField", {
      components: {[componentName]: Component},
      props: {
        bindProps: { type: Object, required: true },
        value: { type: Object, required: true },
      },
      data() {
        return {
          stateValue: this.value,
          componentName,
        };
      },
      methods: {
        updateValue(val: any) {
          this.stateValue = val;
        },
      },
      template: `<component :is="componentName" :value="stateValue" @update:value="updateValue($event)" v-bind="bindProps" />`,
    })
  );
}
