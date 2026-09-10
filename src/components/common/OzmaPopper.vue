<template>
  <component :is="tagName">
    <span v-show="isDisplayed" ref="popperWrapper" :class="rootClass">
      <slot>{{ content }}</slot>
    </span>
    <slot name="reference"></slot>
  </component>
</template>

<script>
import Popper from 'popper.js'

const SHOW_ANIMATION_DURATION_MS = 260
const HIDE_ANIMATION_DURATION_MS = 140
const CONTENT_SHOW_ANIMATION_DURATION_MS = 280
const CONTENT_HIDE_ANIMATION_DURATION_MS = 140
const POPPER_Z_INDEX_BASE = 100050

let nextPopperZIndex = POPPER_Z_INDEX_BASE

function on(element, event, handler) {
  if (element && event && handler) {
    if (document.addEventListener) {
      element.addEventListener(event, handler, false)
    } else {
      element.attachEvent('on' + event, handler)
    }
  }
}

function off(element, event, handler) {
  if (element && event) {
    if (document.removeEventListener) {
      element.removeEventListener(event, handler, false)
    } else {
      element.detachEvent('on' + event, handler)
    }
  }
}

export default {
  props: {
    tagName: {
      type: String,
      default: 'span',
    },
    trigger: {
      type: String,
      default: 'hover',
      validator: (value) =>
        [
          'clickToOpen',
          'click', // Same as clickToToggle, provided for backwards compatibility.
          'clickToToggle',
          'hover',
          'focus',
        ].indexOf(value) > -1,
    },
    delayOnMouseOver: {
      type: Number,
      default: 0,
    },
    delayOnMouseOut: {
      type: Number,
      default: 0,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    content: String,
    enterActiveClass: String,
    leaveActiveClass: String,
    boundariesSelector: String,
    reference: {
      type: [Object, HTMLElement],
      default: null,
    },
    forceShow: {
      type: Boolean,
      default: false,
    },
    dataValue: {
      type: [String, Number, Boolean, Object, Array, Function],
      default: null,
    },
    appendToBody: {
      type: Boolean,
      default: true,
    },
    visibleArrow: {
      type: Boolean,
      default: true,
    },
    transition: {
      type: String,
      default: '',
    },
    stopPropagation: {
      type: Boolean,
      default: false,
    },
    preventDefault: {
      type: Boolean,
      default: false,
    },
    options: {
      type: Object,
      default() {
        return {}
      },
    },
    rootClass: {
      type: String,
      default: '',
    },
  },
  emits: ['show', 'hide', 'created', 'document-click'],

  data() {
    return {
      referenceElm: null,
      popper: null,
      popperJS: null,
      showPopper: false,
      isDisplayed: false,
      transitionTimer: null,
      animationFrame1: null,
      animationFrame2: null,
      popperOptions: {
        placement: 'bottom',
        modifiers: {
          computeStyle: {
            gpuAcceleration: false,
          },
        },
      },
      boundHandlers: null,
    }
  },

  watch: {
    showPopper(value) {
      if (value) {
        this.$emit('show', this)
        if (this.popperJS) {
          this.popperJS.enableEventListeners()
        }
        this.updatePopper()
      } else {
        if (this.popperJS) {
          this.popperJS.disableEventListeners()
        }
        this.$emit('hide', this)
      }
    },

    forceShow: {
      handler(value) {
        this[value ? 'doShow' : 'doClose']()
      },
      immediate: true,
    },

    disabled(value) {
      if (value) {
        this.doClose()
      }
    },
  },

  created() {
    this.appendedArrow = false
    this.appendedToBody = false
    this.isForceShowControlled = Object.prototype.hasOwnProperty.call(
      this.$options.propsData || {},
      'forceShow',
    )
    const optionModifiers = this.options?.modifiers || {}
    const baseModifiers = this.popperOptions.modifiers || {}
    const mergedModifiers = { ...baseModifiers, ...optionModifiers }

    if (baseModifiers.computeStyle || optionModifiers.computeStyle) {
      mergedModifiers.computeStyle = {
        ...(baseModifiers.computeStyle || {}),
        ...(optionModifiers.computeStyle || {}),
      }
    }

    this.popperOptions = {
      ...this.popperOptions,
      ...this.options,
      modifiers: mergedModifiers,
    }
    this.boundHandlers = {
      doShow: (event) => this.doShow(event),
      doClose: (event) => this.doClose(event),
      doToggle: (event) => this.doToggle(event),
      onMouseOver: (event) => this.onMouseOver(event),
      onMouseOut: (event) => this.onMouseOut(event),
      handleDocumentClick: (event) => this.handleDocumentClick(event),
    }
  },

  mounted() {
    const referenceNodes =
      typeof this.$slots.reference === 'function'
        ? this.$slots.reference({})
        : []
    const defaultNodes =
      typeof this.$slots.default === 'function'
        ? this.$slots.default({})
        : []
    const rootElement = this.$el instanceof HTMLElement ? this.$el : null
    const referenceFallback =
      rootElement instanceof HTMLElement ? rootElement.children.item(1) : null
    const wrapperElement =
      this.$refs.popperWrapper instanceof HTMLElement ? this.$refs.popperWrapper : null
    const popperFallback =
      wrapperElement instanceof HTMLElement
        ? wrapperElement.firstElementChild || wrapperElement
        : null

    this.referenceElm =
      this.reference || referenceNodes?.[0]?.elm || referenceFallback || null
    this.popper = defaultNodes?.[0]?.elm || popperFallback || null

    // If visibility is controlled from parent via `force-show`,
    // avoid internal trigger listeners to prevent click state races.
    if (this.isForceShowControlled) {
      on(document, 'click', this.boundHandlers.handleDocumentClick)
      return
    }

    switch (this.trigger) {
      case 'clickToOpen':
        on(this.referenceElm, 'click', this.boundHandlers.doShow)
        on(document, 'click', this.boundHandlers.handleDocumentClick)
        break
      case 'click': // Same as clickToToggle, provided for backwards compatibility.
      case 'clickToToggle':
        on(this.referenceElm, 'click', this.boundHandlers.doToggle)
        on(document, 'click', this.boundHandlers.handleDocumentClick)
        break
      case 'hover':
        on(this.referenceElm, 'mouseover', this.boundHandlers.onMouseOver)
        on(this.popper, 'mouseover', this.boundHandlers.onMouseOver)
        on(this.referenceElm, 'mouseout', this.boundHandlers.onMouseOut)
        on(this.popper, 'mouseout', this.boundHandlers.onMouseOut)
        break
      case 'focus':
        on(this.referenceElm, 'focus', this.boundHandlers.onMouseOver)
        on(this.popper, 'focus', this.boundHandlers.onMouseOver)
        on(this.referenceElm, 'blur', this.boundHandlers.onMouseOut)
        on(this.popper, 'blur', this.boundHandlers.onMouseOut)
        break
    }
  },

  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.clearAnimationHandles()
    this.destroyPopper()
  },

  beforeUnmount() {
    this.beforeDestroy()
  },

  // Fallback in case environment only fires `unmounted`.
  unmounted() {
    this.beforeDestroy()
  },

  methods: {
    animationsEnabled() {
      const globalFlag =
        document.documentElement.getAttribute('data-ui-animations')
      if (globalFlag === 'off') {
        return false
      }
      if (globalFlag === 'on') {
        return true
      }

      const currentSettings = this.$store?.state?.settings?.current
      if (currentSettings === undefined || currentSettings === null) {
        return true
      }

      if (typeof currentSettings.getEntry === 'function') {
        return currentSettings.getEntry('ui_animations_enabled', Boolean, true)
      }

      const rawValue = currentSettings.settings?.ui_animations_enabled
      return rawValue === undefined ? true : rawValue !== 'false'
    },

    getAnimatedElement() {
      if (this.popper instanceof HTMLElement) {
        return this.popper
      }

      const wrapper = this.$refs.popperWrapper
      if (wrapper instanceof HTMLElement) {
        return wrapper.firstElementChild instanceof HTMLElement
          ? wrapper.firstElementChild
          : wrapper
      }

      return null
    },

    getAnimatedContentElements(containerElement) {
      if (!(containerElement instanceof HTMLElement)) {
        return []
      }

      return Array.from(containerElement.children).filter(
        (child) =>
          child instanceof HTMLElement &&
          !child.hasAttribute('x-arrow') &&
          !child.classList.contains('popper__arrow'),
      )
    },

    clearAnimationHandles() {
      if (this.transitionTimer !== null) {
        clearTimeout(this.transitionTimer)
        this.transitionTimer = null
      }

      if (this.animationFrame1 !== null) {
        cancelAnimationFrame(this.animationFrame1)
        this.animationFrame1 = null
      }

      if (this.animationFrame2 !== null) {
        cancelAnimationFrame(this.animationFrame2)
        this.animationFrame2 = null
      }
    },

    clearAnimatedStyles(element) {
      if (!(element instanceof HTMLElement)) {
        return
      }

      element.style.transition = ''
      element.style.willChange = ''
      element.style.opacity = ''
      element.style.visibility = ''
      element.style.transform = ''
      element.style.transformOrigin = ''
    },

    clearAnimatedContentStyles(element) {
      if (!(element instanceof HTMLElement)) {
        return
      }

      this.clearAnimatedStyles(element)
      element.style.transform = ''
      element.style.transformOrigin = ''
    },

    bringToFront() {
      const popperElement = this.popper
      if (!(popperElement instanceof HTMLElement)) {
        return
      }

      nextPopperZIndex += 1
      popperElement.style.zIndex = String(nextPopperZIndex)
    },

    prepareOpenAnimationState(containerElement, contentElements) {
      this.clearAnimatedStyles(containerElement)
      containerElement.style.transition = 'none'
      containerElement.style.willChange = 'opacity, transform'
      containerElement.style.transformOrigin = 'top center'
      containerElement.style.visibility = 'hidden'
      containerElement.style.opacity = '0'
      containerElement.style.transform = 'translateY(6px) scale(0.985)'

      contentElements.forEach((contentElement) => {
        this.clearAnimatedContentStyles(contentElement)
      })
    },

    animateIn() {
      const containerElement = this.getAnimatedElement()
      if (!(containerElement instanceof HTMLElement)) {
        return
      }
      const contentElements = this.getAnimatedContentElements(containerElement)

      containerElement.style.visibility = 'visible'

      this.animationFrame1 = requestAnimationFrame(() => {
        this.animationFrame2 = requestAnimationFrame(() => {
          containerElement.style.transition =
            `opacity ${SHOW_ANIMATION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${CONTENT_SHOW_ANIMATION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
          containerElement.style.opacity = '1'
          containerElement.style.transform = 'translateY(0) scale(1)'

          this.transitionTimer = setTimeout(() => {
            this.clearAnimatedStyles(containerElement)
            contentElements.forEach((contentElement) => {
              this.clearAnimatedContentStyles(contentElement)
            })
            this.clearAnimationHandles()
          }, Math.max(SHOW_ANIMATION_DURATION_MS, CONTENT_SHOW_ANIMATION_DURATION_MS))
        })
      })
    },

    animateOut(onDone) {
      const containerElement = this.getAnimatedElement()
      if (!(containerElement instanceof HTMLElement)) {
        onDone()
        return
      }
      const contentElements = this.getAnimatedContentElements(containerElement)

      this.clearAnimatedStyles(containerElement)
      containerElement.style.transition = 'none'
      containerElement.style.willChange = 'opacity'
      containerElement.style.opacity = '1'

      contentElements.forEach((contentElement) => {
        this.clearAnimatedContentStyles(contentElement)
      })
      containerElement.style.transition = 'none'
      containerElement.style.willChange = 'opacity, transform'
      containerElement.style.transformOrigin = 'top center'
      containerElement.style.opacity = '1'
      containerElement.style.transform = 'translateY(0) scale(1)'
      // Force style flush before starting transition.
      void containerElement.offsetWidth

      this.animationFrame1 = requestAnimationFrame(() => {
        this.animationFrame2 = requestAnimationFrame(() => {
          containerElement.style.transition =
            `opacity ${HIDE_ANIMATION_DURATION_MS}ms cubic-bezier(0.4, 0, 1, 1), transform ${CONTENT_HIDE_ANIMATION_DURATION_MS}ms cubic-bezier(0.4, 0, 1, 1)`
          containerElement.style.opacity = '0'
          containerElement.style.transform = 'translateY(4px) scale(0.99)'

          this.transitionTimer = setTimeout(() => {
            this.clearAnimatedStyles(containerElement)
            contentElements.forEach((contentElement) => {
              this.clearAnimatedContentStyles(contentElement)
            })
            this.clearAnimationHandles()
            onDone()
          }, Math.max(HIDE_ANIMATION_DURATION_MS, CONTENT_HIDE_ANIMATION_DURATION_MS))
        })
      })
    },

    doToggle(event) {
      if (this.stopPropagation) {
        event.stopPropagation()
      }

      if (this.preventDefault) {
        event.preventDefault()
      }

      if (!this.forceShow) {
        if (this.showPopper) {
          this.doClose()
        } else {
          this.doShow()
        }
      }
    },

    doShow() {
      if (this.disabled) {
        return
      }

      this.clearAnimationHandles()
      this.isDisplayed = true
      this.showPopper = true
      this.bringToFront()

      if (!this.animationsEnabled()) {
        this.$nextTick(() => {
          const containerElement = this.getAnimatedElement()
          if (!(containerElement instanceof HTMLElement)) {
            return
          }

          this.clearAnimatedStyles(containerElement)
          this.getAnimatedContentElements(containerElement).forEach((element) => {
            this.clearAnimatedContentStyles(element)
          })
          this.updatePopper()
          // Re-assert z-index after updatePopper so we end up above any parent
          // popup whose createPopper/onCreate bringToFront fired in this tick.
          this.bringToFront()
        })
        return
      }

      this.$nextTick(() => {
        const containerElement = this.getAnimatedElement()
        if (!(containerElement instanceof HTMLElement)) {
          return
        }

        const contentElements = this.getAnimatedContentElements(containerElement)
        this.prepareOpenAnimationState(containerElement, contentElements)
        this.updatePopper()
        // Re-assert z-index after updatePopper so we end up above any parent
        // popup whose createPopper/onCreate bringToFront fired in this tick.
        this.bringToFront()

        this.animationFrame1 = requestAnimationFrame(() => {
          this.animationFrame2 = requestAnimationFrame(() => {
            this.animateIn()
          })
        })
      })
    },

    doClose() {
      if (!this.isDisplayed && !this.showPopper) {
        return
      }

      this.clearAnimationHandles()
      this.showPopper = false

      if (!this.animationsEnabled()) {
        this.isDisplayed = false
        this.doDestroy()
        return
      }

      this.$nextTick(() => {
        this.animateOut(() => {
          // Popper could have been opened back while close animation was running.
          if (!this.showPopper) {
            this.isDisplayed = false
            this.doDestroy()
          }
        })
      })
    },

    doDestroy() {
      if (this.showPopper) {
        return
      }

      if (this.popperJS) {
        this.popperJS.destroy()
        this.popperJS = null
      }

      if (this.appendedToBody) {
        // Keep the container in body — removing it causes Vue to re-insert it
        // inside the original parent on next render, which puts it inside any
        // stacking context (overflow, transform) that the parent may have.
      }
    },

    createPopper() {
      this.$nextTick(() => {
        if (!this.referenceElm || !this.popper) {
          return
        }

        if (this.visibleArrow) {
          this.appendArrow(this.popper)
        }

        if (this.appendToBody) {
          const container = this.popper.parentElement
          if (container && container.parentElement !== document.body) {
            this.appendedToBody = true
            document.body.appendChild(container)
          } else if (container) {
            this.appendedToBody = true
          }
        }

        if (this.popperJS && this.popperJS.destroy) {
          this.popperJS.destroy()
        }

        if (this.boundariesSelector) {
          const boundariesElement = document.querySelector(this.boundariesSelector)

          if (boundariesElement) {
            this.popperOptions.modifiers = {
              ...this.popperOptions.modifiers,
            }
            this.popperOptions.modifiers.preventOverflow = {
              ...this.popperOptions.modifiers.preventOverflow,
            }
            this.popperOptions.modifiers.preventOverflow.boundariesElement =
              boundariesElement
          }
        }

        this.popperOptions.onCreate = () => {
          this.$emit('created', this)
          this.$nextTick(() => this.updatePopper())
        }

        this.popperJS = new Popper(this.referenceElm, this.popper, this.popperOptions)
      })
    },

    destroyPopper() {
      off(this.referenceElm, 'click', this.boundHandlers?.doToggle)
      off(this.referenceElm, 'mouseup', this.boundHandlers?.doClose)
      off(this.referenceElm, 'mousedown', this.boundHandlers?.doShow)
      off(this.referenceElm, 'focus', this.boundHandlers?.doShow)
      off(this.referenceElm, 'blur', this.boundHandlers?.doClose)
      off(this.referenceElm, 'mouseout', this.boundHandlers?.onMouseOut)
      off(this.referenceElm, 'mouseover', this.boundHandlers?.onMouseOver)
      off(document, 'click', this.boundHandlers?.handleDocumentClick)

      this.clearAnimationHandles()
      this.isDisplayed = false
      this.showPopper = false
      this.doDestroy()
    },

    appendArrow(element) {
      if (this.appendedArrow || !(element instanceof HTMLElement)) {
        return
      }

      this.appendedArrow = true

      const arrow = document.createElement('div')
      arrow.setAttribute('x-arrow', '')
      arrow.className = 'popper__arrow'
      element.appendChild(arrow)
    },

    updatePopper() {
      if (this.popperJS) {
        this.popperJS.scheduleUpdate()
      } else {
        this.createPopper()
      }
    },

    onMouseOver() {
      clearTimeout(this._timer)
      this._timer = setTimeout(() => {
        this.doShow()
      }, this.delayOnMouseOver)
    },

    onMouseOut() {
      clearTimeout(this._timer)
      this._timer = setTimeout(() => {
        this.doClose()
      }, this.delayOnMouseOut)
    },

    handleDocumentClick(e) {
      if (
        !this.$el ||
        !this.referenceElm ||
        this.elementContains(this.$el, e.target) ||
        this.elementContains(this.referenceElm, e.target) ||
        !this.popper ||
        this.elementContains(this.popper, e.target)
      ) {
        return
      }

      this.$emit('document-click', this, e)

      if (this.forceShow) {
        return
      }

      this.doClose()
    },

    elementContains(elm, otherElm) {
      if (typeof elm.contains === 'function') {
        return elm.contains(otherElm)
      }

      return false
    },
  },
}
</script>
