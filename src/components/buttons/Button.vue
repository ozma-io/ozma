<template>
  <hr
    v-if="button.type === 'empty'"
  >
  <!-- Passing v-on:click to v-bind doesn't seem to work, hence this ugly solution -->
  <router-link
    v-else-if="button.type === 'location'"
    :to="button.location"
  >
    <ButtonItem :button="button"/>
  </router-link>

  <FunLink
    v-else-if="button.type === 'link'"
    :link="action.link"
    @goto="$emit('goto', $event)"
  >
    <ButtonItem :button="button"/>
  </FunLink>

  <span
    v-else-if="button.type === 'callback'"
    @click="action.callback()"
  >
    <ButtonItem :button="button"/>
  </span>

  <label
    v-else-if="button.type === 'upload-file'"
  >
    <ButtonItem :button="button"/>
    <input
      type="file"
      @change="uploadFile($event.target, button.uploadFile)"
    >
  </label>
</template>