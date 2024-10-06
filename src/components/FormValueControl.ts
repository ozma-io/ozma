import Vue from 'vue'

import { currentValue, ICombinedValue } from '@/user_views/combined'
import { vueEmit } from '@/utils'
import { isOptionalUserString } from '@/state/translations'

export default Vue.extend({
  name: 'FormValueControl',
  functional: true,
  props: {
    value: { type: Object, required: true },
    locked: { type: Boolean },
    type: { type: Object, required: true },
    attributes: { type: Object },
    attributeMappings: { type: Object },
    homeSchema: { type: String },
    caption: { validator: isOptionalUserString },
    forceCaption: { type: Boolean },
    compactMode: { type: Boolean },
    disableColor: { type: Boolean },
    scope: { type: String },
    level: { type: Number, required: true },
    autofocus: { type: Boolean },
    modalOnly: { type: Boolean },
    isCellEdit: { type: Boolean },
    forceModalOnMobile: { type: Boolean },
  },
  render(createElement, context) {
    const value = context.props.value as ICombinedValue
    const isNullable =
      value.info === undefined ||
      value.info.field === null ||
      value.info.field.isNullable
    const locked = Boolean(context.props.locked || !value.info?.field)
    const passHandler =
      (name: string) =>
      (...args: unknown[]) =>
        vueEmit(context, name, ...args)
    return createElement('FormControl', {
      attrs: {
        ...context.props,
        value: currentValue(value),
        pun: value.pun ?? undefined,
        isNullable,
        fieldRef: value.info?.fieldRef,
        rowId: value.info?.id,
        fieldType: value.info?.field?.fieldType,
        locked,
      },
      on: {
        update: passHandler('update'),
        closeModalInput: passHandler('close-modal-input'),
        goto: passHandler('goto'),
        blur: passHandler('blur'),
      },
    })
  },
})
