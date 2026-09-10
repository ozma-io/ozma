<i18n>
  {
    "en": {
      "confirm_default_title": "Confirm action",
      "confirm_default_ok": "OK",
      "confirm_default_cancel": "Cancel"
    },
    "ru": {
      "confirm_default_title": "Подтвердите действие",
      "confirm_default_ok": "ОК",
      "confirm_default_cancel": "Отмена"
    },
    "es": {
      "confirm_default_title": "Confirmar acción",
      "confirm_default_ok": "OK",
      "confirm_default_cancel": "Cancelar"
    }
  }
</i18n>

<template>
  <!-- Passing v-on:click to v-bind doesn't seem to work, hence this ugly solution -->
  <span
    v-if="button.type === 'location'"
    class="ozmalink-wrapper"
    @click.capture="onClickLocationCapture"
  >
    <router-link class="text-decoration-none" :to="button.location">
      <ButtonView
        :button="button"
        :list-item="listItem"
        :phantom-icon="listItemHasRightMargin"
        :align-right="alignRight"
      />
    </router-link>
  </span>

  <span
    v-else-if="button.type === 'link'"
    class="ozmalink-wrapper"
    @click.capture="onClickLinkCapture"
  >
    <OzmaLink
      class="ozmalink"
      :link="button.link"
      @goto="$emit('goto', $event)"
      @click="onClickLink"
    >
      <ButtonView
        :button="button"
        :list-item="listItem"
        :phantom-icon="listItemHasRightMargin"
        :align-right="alignRight"
        :tabindex="-1"
      />
    </OzmaLink>
  </span>

  <ButtonView
    v-else-if="button.type === 'callback'"
    :button="button"
    :list-item="listItem"
    :phantom-icon="listItemHasRightMargin"
    :align-right="alignRight"
    @click="onClickCallback"
  />

  <label
    v-else-if="button.type === 'upload-file'"
    class="m-0"
    @click.capture="onClickUploadLabel"
  >
    <ButtonView
      :button="button"
      :list-item="listItem"
      :phantom-icon="listItemHasRightMargin"
      :align-right="alignRight"
    />
    <input
      ref="fileInput"
      v-visible="false"
      class="position-fixed"
      type="file"
      @change="uploadFile($event.target, button.uploadFile)"
    />
  </label>

  <ButtonView
    v-else
    :button="button"
    :list-item="listItem"
    :phantom-icon="listItemHasRightMargin"
    :align-right="alignRight"
  />
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import type { BvMsgBoxOptions } from 'bootstrap-vue'

import ButtonView from '@/components/buttons/ButtonView.vue'
import type { Button, IButtonConfirm } from '@/components/buttons/buttons'
import type { UserString } from '@/state/translations'
import { linkHandler } from '@/links'

@Component({
  components: {
    ButtonView,
  },
})
export default class ButtonItem extends Vue {
  @Prop({ type: Object, required: true }) button!: Button
  @Prop({ type: Boolean, default: false }) listItem!: boolean
  @Prop({ type: Boolean, default: false }) listItemHasRightMargin!: boolean
  @Prop({ type: Boolean, default: false }) alignRight!: boolean

  // Used to bypass the capture-phase confirm guard for `upload-file` when we
  // programmatically trigger the input click after confirmation.
  private bypassConfirm = false

  private uploadFile(input: HTMLInputElement, next: (file: File) => void) {
    const files = input.files as FileList
    next(files[0])
  }

  private get confirmConfig(): IButtonConfirm | undefined {
    return (this.button as Button & { confirm?: IButtonConfirm }).confirm
  }

  private async askConfirm(): Promise<boolean> {
    const confirm = this.confirmConfig
    if (confirm === undefined) return true
    const ust = (s: UserString | undefined): string =>
      s !== undefined ? this.$ustOrEmpty(s) : ''
    const message =
      ust(confirm.message) ||
      ust(confirm.title) ||
      this.$t('confirm_default_title').toString()
    const opts: BvMsgBoxOptions = {
      title:
        ust(confirm.title) || this.$t('confirm_default_title').toString(),
      okTitle:
        ust(confirm.okTitle) || this.$t('confirm_default_ok').toString(),
      cancelTitle:
        ust(confirm.cancelTitle) ||
        this.$t('confirm_default_cancel').toString(),
      centered: true,
      modalClass: 'glass-confirm-modal',
      dialogClass: 'glass-confirm-dialog',
      contentClass: 'glass-confirm-content',
      bodyClass: 'glass-confirm-body',
      footerClass: 'glass-confirm-footer',
    }
    if (confirm.okVariant && confirm.okVariant.type === 'existing') {
      opts.okVariant = confirm.okVariant.className
    }
    if (confirm.cancelVariant && confirm.cancelVariant.type === 'existing') {
      opts.cancelVariant = confirm.cancelVariant.className
    }
    try {
      const ok = await this.$bvModal.msgBoxConfirm(message, opts)
      return ok === true
    } catch {
      return false
    }
  }

  private onClickLink() {
    this.$emit('button-click', this.button)
  }

  private async onClickLinkCapture(event: MouseEvent) {
    if (this.confirmConfig === undefined) return
    event.preventDefault()
    event.stopImmediatePropagation()
    event.stopPropagation()
    const ok = await this.askConfirm()
    if (!ok) return
    if (this.button.type !== 'link') return
    // Mirror what OzmaLink would do — emit `button-click` and execute the
    // link handler ourselves. Re-dispatching the DOM click after `await` is
    // fragile (event.currentTarget is null after the microtask boundary).
    this.$emit('button-click', this.button)
    const handlerObj = linkHandler(this.button.link, {
      goto: (gotoEvent) => this.$emit('goto', gotoEvent),
    })
    void handlerObj.handler()
  }

  private async onClickLocationCapture(event: MouseEvent) {
    if (this.confirmConfig === undefined) return
    event.preventDefault()
    event.stopImmediatePropagation()
    event.stopPropagation()
    const ok = await this.askConfirm()
    if (!ok) return
    if (this.button.type === 'location') {
      void this.$router.push(this.button.location)
    }
  }

  private async onClickUploadLabel(event: MouseEvent) {
    if (this.bypassConfirm) return
    if (this.confirmConfig === undefined) return
    event.preventDefault()
    event.stopImmediatePropagation()
    const ok = await this.askConfirm()
    if (!ok) return
    const input = this.$refs.fileInput as HTMLInputElement | undefined
    if (input === undefined) return
    this.bypassConfirm = true
    try {
      input.click()
    } finally {
      this.bypassConfirm = false
    }
  }

  private async onClickCallback() {
    const ok = await this.askConfirm()
    if (!ok) return

    this.$emit('button-click', this.button)

    if (this.button.type === 'callback') {
      this.button.callback()
    }
  }
}
</script>

<style lang="scss" scoped>
.ozmalink:hover {
  text-decoration: none;
}

.ozmalink-wrapper {
  display: contents;
}
</style>
