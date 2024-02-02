<i18n>
    {
        "en": {
            "contact": "Schedule a demo call",
            "sign_up": "Start your app with this demo",
            "invite_user": "Invite"
        },
        "ru": {
            "contact": "Заказать внедрение",
            "sign_up": "Скопировать себе это демо",
            "invite_user": "Пригласить"
        },
        "es": {
            "contact": "Llamada de demostración",
            "sign_up": "Registrarse",
            "invite_user": "Invitar"
        }
    }
</i18n>

<template>
  <div v-if="messageHtml !== ''" class="banner-wrapper">
    <b-alert
      :show="messageHtml !== ''"
      class="custom-alert mb-0"
      dismissible
      @dismissed="onDismissed"
    >
      <div class="content-wrapper">
        <!-- eslint-disable vue/no-v-html -->
        <span v-html="messageHtml" />
        <!-- eslint-enable vue/no-v-html -->
        <div class="buttons-wrapper">
          <ButtonItem
            v-if="showContactButton"
            class="contact-button"
            :button="contactButton"
          />
          <ButtonItem
            v-if="showSignUpButton"
            class="sign-up-button"
            :button="signUpButton"
          />
          <ButtonItem
            v-if="showInviteButton"
            class="invite-button"
            :button="inviteButton"
          />
        </div>
      </div>

      <template #dismiss>
        <div class="dismiss-button material-button">
          <i class="material-icons">close</i>
        </div>
      </template>
    </b-alert>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import sanitizeHtml from 'sanitize-html'
import { namespace } from 'vuex-class'

import { eventBus } from '@/main'
import ButtonItem from '@/components/buttons/ButtonItem.vue'
import { Button } from './buttons/buttons'
import { CurrentSettings } from '@/state/settings'
import { CurrentAuth, INoAuth } from '@/state/auth'

import { instanceName } from '@/api'

const sanitizeSettings = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a'],
  allowedAttributes: {
    a: ['href', 'target'],
  },
}

const sanitize = (message: string) => sanitizeHtml(message, sanitizeSettings)

const settings = namespace('settings')
const auth = namespace('auth')

@Component({ components: { ButtonItem } })
export default class AlertBanner extends Vue {
  @settings.State('current') settings!: CurrentSettings
  @auth.State('current') currentAuth!: CurrentAuth | INoAuth | null

  private refreshKey = 0

  private get message() {
    // eslint-disable-next-line
    this.refreshKey
    const message = this.settings.getEntry('banner_message', String, '')
    const isImportant = this.settings.getEntry(
      'banner_important',
      Boolean,
      false,
    )
    const viewedMessage = localStorage.getItem('viewed-banner-message')
    if (message.trim() === '' || (!isImportant && message === viewedMessage))
      return ''
    return message
  }

  private get messageHtml() {
    return sanitize(this.message)
  }

  get showContactButton() {
    return this.settings.getEntry(
      'show_contact_button_in_banner',
      Boolean,
      false,
    )
  }

  get showSignUpButton() {
    return this.settings.getEntry(
      'show_sign_up_button_in_banner',
      Boolean,
      false,
    )
  }

  get hasAuth() {
    return Boolean(this.currentAuth?.refreshToken)
  }
  get showInviteButton() {
    return (
      this.settings.getEntry('show_invite_button_in_banner', Boolean, false) &&
      this.hasAuth
    )
  }

  private get contactButton(): Button {
    const language = this.$i18n.locale
    let url = 'https://ozma.io/get-started/'
    if (['ru'].includes(language)) {
      url = `https://ozma.io/${language}/get-started/`
    }
    return {
      caption: this.$t('contact').toString(),
      variant: { type: 'existing', className: 'ctaButton' },
      type: 'link',
      link: { type: 'href', href: url, target: 'blank' },
    }
  }

  private get inviteButton() {
    return {
      icon: 'person_add',
      caption: this.$t('invite_user').toString(),
      variant: { type: 'existing', className: 'ctaButton' },
      type: 'callback',
      callback: () => eventBus.emit('show-invite-user-modal'),
    }
  }

  private get signUpButton() {
    const language = this.$i18n.locale
    const url = `https://onboard.ozma.io/${instanceName}/${language}`
    return {
      caption: this.$t('sign_up').toString(),
      variant: { type: 'existing', className: 'ctaButton' },
      type: 'link',
      link: { type: 'href', href: url, target: 'blank' },
    }
  }

  onDismissed() {
    localStorage.setItem('viewed-banner-message', this.message)
    this.refreshKey++ // To refresh `message` computated property
  }
}
</script>

<style lang="scss" scoped>
.banner-wrapper {
  background-color: var(--userview-background-color);
  padding: 1.875rem 2.25rem 0 2.25rem;
}

.custom-alert {
  border-color: var(--banner-borderColor, #dde5f8);
  border-radius: 0.5rem;
  background-color: var(--banner-backgroundColor, #dde5f8);
  padding: 1rem 3.75rem;
  padding-right: 6.75rem;
  color: var(--banner-foregroundColor, black);

  @include mobile {
    padding: 1.25rem 1rem;
    padding-right: 3rem;
  }

  ::v-deep {
    .close {
      opacity: 1;
      padding: 1rem 3rem;

      @include mobile {
        padding: 0.75rem;
      }
    }
  }
}

.dismiss-button {
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 1;
  border-radius: 50%;
  background-color: #eef2fb;
  width: 1.5rem;
  height: 1.5rem;
  color: #777c87;
}

.content-wrapper {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-size: 0.9375rem;

  @include mobile {
    flex-direction: column;
  }
}

.buttons-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.contact-button,
.invite-button,
.sign-up-button {
  &:hover {
    text-decoration: none;
  }

  ::v-deep {
    .btn {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
    }
  }
}
</style>
