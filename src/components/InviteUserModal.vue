<i18n>
    {
        "en": {
            "header": "Invite",
            "email_label": "Email",
            "role_label": "Role",
            "send_invite": "Send invite",
            "invite_start_title": "Sending invite...",
            "invite_start_description": " ",
            "invite_success_title": "Invite is sent",
            "invite_success_description": " ",
            "invite_fail_title": "Fail during invite",
            "invite_fail_description": "Maybe this email is already invited or something gone wrong on our side",
            "": ""
        },
        "ru": {
            "header": "Пригласить",
            "email_label": "Электронный адрес",
            "role_label": "Роль",
            "send_invite": "Послать приглашение",
            "invite_start_title": "Отправка приглашения...",
            "invite_start_description": " ",
            "invite_success_title": "Приглашение отправлено",
            "invite_success_description": " ",
            "invite_fail_title": "Ошибка во время приглашения",
            "invite_fail_description": "Возможно на эту почту уже было отправлено приглашение или произошла ошибка на нашей стороне",
            "": ""
        },
        "es": {
            "header": "Invitar",
            "email_label": "Email o correo electronico",
            "role_label": "El rol",
            "send_invite": "Mandar la invitación",
            "invite_start_title": "La invitación está mandando...",
            "invite_start_description": " ",
            "invite_success_title": "La invitacion fue mandada",
            "invite_success_description": " ",
            "invite_fail_title": "El error durante la invitación",
            "invite_fail_description": "Tal vez este correo electrónico ya está invitado o algo salió mal de nuestro lado",
            "": ""
        }
    }
</i18n>

<template>
  <ModalWindow
    adaptive
    class="invite-modal"
    :min-width="300"
    :min-height="200"
    :width="350"
    height="auto"
    :name="uid"
    transition="invite-modal-transition"
  >
    <div class="message-container">
      <i class="material-icons invite-icon">group</i>
      <h1 class="header">
        {{ $t('header').toString() }}
      </h1>

      <div class="form-container">
        <InputSlot
          class="mb-3"
          :inline="false"
          :is-cell-edit="false"
          :label="$t('email_label').toString()"
          required
          :empty="!emailValue || emailValue.length === 0"
        >
          <Input
            :value="emailValue"
            required
            autofocus
            @input="emailValue = $event"
          />
        </InputSlot>

        <InputSlot
          class="mb-3"
          :inline="false"
          :is-cell-edit="false"
          :label="$t('role_label').toString()"
          :empty="!roleValue"
        >
          <ReferenceField
            :value="roleValue"
            :label="$t('role_label').toString()"
            :reference-entity="roleEntity"
            nullable
            scope="no-scope"
            @update:value="roleValue = $event"
          />
        </InputSlot>

        <div class="d-flex flex-row-reverse">
          <b-button variant="success" @click="sendInvite">
            {{ $t('send_invite') }}
          </b-button>
        </div>
      </div>
    </div>
  </ModalWindow>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { IEntityRef } from 'ozma-api'
import { namespace } from 'vuex-class'
import { invitesServiceUrl, instanceName, instancesHost } from '@/api'

import { randomId, waitTimeout } from '@/utils'
import { CurrentAuth, INoAuth } from '@/state/auth'
import ReferenceField from '@/components/ReferenceField.vue'
import InputSlot from '@/components/form/InputSlot.vue'
import Input from '@/components/form/Input.vue'
import ModalWindow from './modal/ModalWindow.vue'

const auth = namespace('auth')

@Component({ components: { ModalWindow, ReferenceField, InputSlot, Input } })
export default class InviteUserModal extends Vue {
  @auth.State('current') currentAuth!: CurrentAuth | INoAuth | null
  @auth.State('pending') pendingAuth!: Promise<void> | null

  private emailValue = ''
  private roleValue: number | null = null

  private roleEntity: IEntityRef = {
    schema: 'public',
    name: 'roles',
  }

  private show() {
    this.$modal.show(this.uid)
  }

  private hide() {
    this.$modal.hide(this.uid)
  }

  private async sendInvite() {
    while (this.pendingAuth) {
      // eslint-disable-next-line no-await-in-loop
      await this.pendingAuth
      // eslint-disable-next-line no-await-in-loop
      await waitTimeout()
    }

    if (!this.currentAuth?.refreshToken) {
      throw new Error('No token available')
    }

    const id = randomId()
    this.$bvToast.toast(this.$t('invite_start_description').toString(), {
      title: this.$t('invite_start_title').toString(),
      noAutoHide: true,
      solid: true,
      id,
    })

    const url = new URL(`${invitesServiceUrl}/api/invite`)
    const token = this.currentAuth.token
    const body = JSON.stringify({
      email: this.emailValue,
      role_id: this.roleValue,
      /* instance_name: "dev", */
      /* instance_domain: "ozma-dev.org", */
      instance_name: instanceName,
      instance_domain: instancesHost,
    })

    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        redirect: 'manual',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      })

      await waitTimeout(100)
      this.$bvToast.hide(id)
      if (res.status === 200) {
        this.$bvToast.toast(this.$t('invite_success_description').toString(), {
          title: this.$t('invite_success_title').toString(),
          variant: 'success',
          solid: true,
        })

        this.emailValue = ''
        this.roleValue = null
      } else {
        await waitTimeout(100)
        this.$bvToast.hide(id)
        this.$bvToast.toast(this.$t('invite_fail_description').toString(), {
          title: this.$t('invite_fail_title').toString(),
          variant: 'danger',
          solid: true,
        })
      }
    } catch (e) {
      await waitTimeout(100)
      this.$bvToast.hide(id)
      this.$bvToast.toast(String(e), {
        title: this.$t('invite_fail_title').toString(),
        variant: 'danger',
        solid: true,
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.form-container {
  width: 99%;
}

.invite-modal ::v-deep > .vm--overlay {
  background: rgba(0, 0, 0, 0.8) !important;
}

.invite-modal ::v-deep > .vm--modal {
  max-height: 80% !important;
}

::v-deep {
  .invite-modal-transition-enter-active,
  .invite-modal-transition-leave-active {
    transition: all 1s ease-out;
  }

  .invite-modal-transition-enter,
  .invite-modal-transition-leave-to {
    transform: translateY(100%);
    opacity: 0;
  }
}

.message-container {
  display: flex;
  flex-flow: column;
  align-items: center;
  padding: 1rem;
  overflow-x: hidden;
  overflow-y: auto;
}

.invite-icon {
  margin-top: 1rem;
  margin-bottom: 1rem;
  color: var(--default-foregroundDarkerColor);
  font-size: 5rem;
  line-height: 5rem;
}

.header {
  margin-bottom: 1rem;
  font-weight: bold;
  text-align: center;
}

.message {
  text-align: center;
}

.buttons-container {
  display: flex;
  flex-flow: column;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.ok-button {
  margin-bottom: 1.5rem;
  font-weight: bold;
}
</style>
