<i18n>
    {
        "en": {
            "account": "Account",
            "theme": "Theme",
            "invite_user": "Invite",
            "workspaces": "Workspaces",
            "documentation": "Documentation",
            "login": "Login",
            "logout": "Logout",
            "base_user_view_error": "Failed to perform an operation: {msg}",
            "forget_dismissed_help_pages": "Forget dismissed help pages",
            "enable_development_mode": "Enable development mode",
            "disable_development_mode": "Disable development mode",
            "development_mode_indicator": "Development mode is on",
            "change_language": "Language",
            "en": "English",
            "es": "Spanish (Español)",
            "ru": "Russian (Русский)",
            "authed_link": "Copy link with authorization"
        },
        "ru": {
            "account": "Профиль",
            "theme": "Тема",
            "invite_user": "Пригласить",
            "workspaces": "Базы",
            "documentation": "Документация",
            "login": "Войти",
            "logout": "Выйти",
            "base_user_view_error": "Ошибка выполнения операции: {msg}",
            "forget_dismissed_help_pages": "Сбросить пропущенные страницы помощи",
            "enable_development_mode": "Включить режим разработки",
            "disable_development_mode": "Выключить режим разработки",
            "development_mode_indicator": "Включён режим разработки",
            "change_language": "Язык",
            "en": "Английский (English)",
            "es": "Испанский (Español)",
            "ru": "Русский",
            "authed_link": "Скопировать ссылку с авторизацией"
        },
        "es": {
            "account": "La cuenta",
            "theme": "El tema",
            "invite_user": "Invitar",
            "workspaces": "Espacios de Trabajo",
            "documentation": "La documentación",
            "login": "La sesión",
            "logout": "Cerrar la sesión",
            "error": "El error",
            "forget_dismissed_help_pages": "Olvidar de las páginas de ayuda",
            "enable_development_mode": "Habilitar el modo de desarrollo",
            "disable_development_mode": "Deshabilitar el modo de desarrollo",
            "development_mode_indicator": "El modo de desarrollo está activado",
            "change_language": "El idioma",
            "en": "Inglés (English)",
            "es": "Español",
            "ru": "Ruso (Русский)",
            "authed_link": "Copiar el enlace con autorización"
        }
    }
</i18n>

<template>
  <!-- eslint-disable vue/v-on-event-hyphenation -->
  <popper
    ref="popup"
    trigger="clickToOpen"
    :style="{ height: '2rem' }"
    :visible-arrow="false"
    :options="{
      placement: 'bottom-end',
      positionFixed: true,
      modifiers: {
        offset: { offset: '0, 25' },
        preventOverflow: { enabled: true, boundariesElement: 'viewport' },
        hide: { enabled: true },
      },
    }"
    :disabled="!show"
    :force-show="show"
    @documentClick="show = false"
  >
    <div class="popper">
      <div class="profile-block">
        <Avatar round :size="2.625" :username="username" />
        <div class="user-info">
          <div v-if="showUsername" class="user-name">
            {{ username }}
          </div>
          <div class="user-email">
            {{ userEmail }}
          </div>
        </div>
      </div>
      <ButtonList :buttons="buttons" @goto="$emit('goto', $event)" />
    </div>
    <!-- eslint-disable vue/no-deprecated-slot-attribute -->
    <button
      slot="reference"
      type="button"
      class="material-button rounded-circle clear-option-button"
      :style="{ padding: 0 }"
      @click.capture="show = !show"
    >
      <Avatar round :username="username" />
    </button>
  </popper>
</template>

<script lang="ts">
import { namespace } from 'vuex-class'
import { Component, Vue } from 'vue-property-decorator'
import Popper from 'vue-popperjs'

import * as Api from '@/api'
import { Button } from '@/components/buttons/buttons'
import { defaultVariantAttribute, IThemeRef } from '@/utils_colors'
import { CurrentAuth, getAuthedLink, INoAuth } from '@/state/auth'
import { eventBus } from '@/main'
import { CurrentSettings, DisplayMode } from '@/state/settings'
import ButtonList from '@/components/buttons/ButtonList.vue'
import Avatar from '@/components/Avatar.vue'

const auth = namespace('auth')
const settings = namespace('settings')

@Component({ components: { ButtonList, Popper, Avatar } })
export default class AppHeader extends Vue {
  @auth.State('current') currentAuth!: CurrentAuth | INoAuth | null
  @settings.State('current') currentSettings!: CurrentSettings
  @settings.Action('setCurrentTheme') setCurrentTheme!: (
    theme: IThemeRef,
  ) => Promise<void>
  @settings.Action('writeUserSettings') writeUserSettings!: (setting: {
    name: string
    value: string
  }) => Promise<void>
  @settings.State('userIsRoot') userIsRoot!: boolean
  @settings.Action('setDisplayMode') setDisplayMode!: (
    mode: DisplayMode,
  ) => Promise<void>
  @settings.Getter('developmentModeEnabled') developmentModeEnabled!: boolean
  @auth.Action('logout') logout!: () => Promise<void>
  @auth.Action('login') login!: () => Promise<void>

  private show = false

  private get username() {
    const currentAuth = this.currentAuth as CurrentAuth | null
    return currentAuth?.username ?? currentAuth?.email ?? null
  }

  private get userEmail() {
    const currentAuth = this.currentAuth as CurrentAuth | null
    return currentAuth?.email ?? null
  }

  private get showUsername() {
    return this.userEmail !== this.username
  }

  private get allowBusinessMode() {
    return this.currentSettings.getEntry('allow_business_mode', Boolean, false)
  }

  private toggleDeveloperMode() {
    if (this.allowBusinessMode && this.userIsRoot) {
      void this.setDisplayMode(
        this.developmentModeEnabled ? 'business' : 'development',
      )
    }
  }

  private get themeButtons(): Button[] {
    const locale = this.$i18n.locale
    return Object.entries(this.currentSettings.themes).flatMap(
      ([schemaName, themesSchema]) => {
        return Object.entries(themesSchema).map(([themeName, theme]) => {
          const ref = {
            schema: schemaName,
            name: themeName,
          }
          let name: string
          if (locale in theme.localized) {
            name = theme.localized[locale]
          } else if ('en' in theme.localized) {
            name = theme.localized['en']
          } else {
            name = `${schemaName}.${themeName}`
          }
          return {
            caption: name,
            variant: defaultVariantAttribute,
            type: 'callback',
            callback: () => this.setCurrentTheme(ref),
          }
        })
      },
    )
  }

  private get buttons() {
    const buttons: Button[] = []

    if (this.currentAuth?.refreshToken) {
      buttons.push({
        caption: this.$t('account').toString(),
        type: 'link',
        link: { href: Api.accountUrl, type: 'href', target: 'blank' },
        variant: defaultVariantAttribute,
      })

      buttons.push({
        type: 'divider',
        variant: defaultVariantAttribute,
      })
    }
    /*
    if (this.themeButtons.length > 0) {
      buttons.push({
        caption: this.$t("theme").toString(),
        type: "button-group",
        buttons: this.themeButtons,
        variant: defaultVariantAttribute,
      });
    }
    */

    buttons.push({
      caption: this.$t('change_language').toString(),
      variant: defaultVariantAttribute,
      type: 'button-group',
      buttons: ['en', 'es', 'ru'].map((language) => ({
        caption: this.$t(language).toString(),
        variant: defaultVariantAttribute,
        type: 'callback',
        callback: () => {
          void this.writeUserSettings({ name: 'language', value: language })
        },
      })),
    })

    if (this.currentAuth?.refreshToken) {
      buttons.push({
        caption: this.$t('invite_user').toString(),
        variant: defaultVariantAttribute,
        type: 'callback',
        callback: () => eventBus.emit('show-invite-user-modal'),
      })

      if (this.allowBusinessMode && this.userIsRoot) {
        buttons.push({
          caption: this.$t(
            this.developmentModeEnabled
              ? 'disable_development_mode'
              : 'enable_development_mode',
          ).toString(),
          tooltip: 'Ctrl+Shift+D',
          type: 'callback',
          callback: () => this.toggleDeveloperMode(),
          variant: defaultVariantAttribute,
          keepButtonGroupOpened: true,
        })
      }

      if (this.developmentModeEnabled) {
        buttons.push({
          caption: this.$t('documentation').toString(),
          variant: defaultVariantAttribute,
          type: 'link',
          link: { type: 'href', href: 'https://wiki.ozma.io', target: 'blank' },
        })

        buttons.push({
          caption: this.$t('workspaces').toString(),
          variant: defaultVariantAttribute,
          type: 'link',
          link: {
            type: 'href',
            href: 'https://admin.ozma.io',
            target: 'blank',
          },
        })

        if (Api.developmentMode) {
          const currentAuth = this.currentAuth
          buttons.push({
            caption: this.$t('authed_link').toString(),
            variant: defaultVariantAttribute,
            type: 'callback',
            callback: () => {
              const link = getAuthedLink(currentAuth)
              void navigator.clipboard.writeText(link)
            },
          })
        }

        buttons.push({
          caption: this.$t('forget_dismissed_help_pages').toString(),
          variant: defaultVariantAttribute,
          type: 'callback',
          callback: () => {
            const allKeys = Object.keys(localStorage)
            const keys = [
              'dismissHelpPages',
              ...allKeys.filter((key) => key.startsWith('watchedHelpPage_')),
            ]
            for (const key of keys) {
              localStorage.removeItem(key)
            }
          },
        })
      }

      buttons.push({
        type: 'divider',
        variant: { type: 'existing', className: '' },
      })
      buttons.push({
        caption: this.$t('logout').toString(),
        type: 'callback',
        callback: () => void this.logout(),
        variant: defaultVariantAttribute,
      })
    } else {
      buttons.push({
        caption: this.$t('login').toString(),
        type: 'callback',
        callback: () => void this.login(),
        variant: defaultVariantAttribute,
      })
    }

    return buttons
  }
}
</script>

<style lang="scss" scoped>
.popper {
  display: flex;
  flex-direction: column;
  box-shadow: 0px 5px 12px 0px rgba(0, 0, 0, 0.08),
    0px 15px 30px -7px rgba(33, 35, 38, 0.12);
  border-radius: 0.5rem;
  padding: 1.25rem 0 0.75rem 0;
}

.profile-block {
  display: flex;
  justify-content: flex-start;
  gap: 0.5rem;
  padding: 0 1.5rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}
.user-name {
  color: #1f1f1f;
  font-weight: 600;
  font-size: 0.875rem;
}
.user-email {
  color: #3d3d3d;
  font-weight: 500;
  font-size: 0.75rem;
}
</style>
