/* eslint-disable import/no-extraneous-dependencies */
import { configure } from '@storybook/vue'
import Vue from 'vue'
import vClickOutside from 'v-click-outside'
import UniqueId from 'vue-unique-id'
import VueI18n from 'vue-i18n'
import BootstrapVue from 'bootstrap-vue'
import VueDragable from 'vuedraggable'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

Vue.use(vClickOutside)
Vue.use(VueI18n)
Vue.use(UniqueId)
Vue.use(BootstrapVue)
Vue.use(VueDragable)

const req = require.context('../../src/', true, /\.stories.ts(x?)$/)

function loadStories() {
  req.keys().forEach((filename) => req(filename))
}

configure(loadStories, module)
