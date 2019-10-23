/* eslint-disable import/no-extraneous-dependencies */
import { configure } from '@storybook/vue';
import Vue from 'vue';
import vClickOutside from 'v-click-outside';
import VueI18n from "vue-i18n";
import VueGrid from "@liqueflies/vue-flex-grid";

Vue.use(vClickOutside);
Vue.use(VueI18n);
Vue.use(VueGrid);

const req = require.context('../../src', true, /\.stories.ts(x?)$/);

function loadStories() {
  req.keys().forEach(filename => req(filename));
}

configure(loadStories, module);
