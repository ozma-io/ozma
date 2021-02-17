<template>
  <li 
    v-b-tooltip.hover   
    :title="button.tooltip"
  >
    <i v-if="button.icon" :class="['material-icons',{'emoji-icon': getIconType(button.icon) == 'emoji' }]">{{ button.icon }}</i>
    <span v-if="button.name">{{ button.name }}</span>
  </li>
</template>