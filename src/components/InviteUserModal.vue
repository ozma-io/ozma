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
        }
    }
</i18n>

<template>
  <VueModal
    adaptive
    :min-width="300"
    :min-height="200"
    :width="350"
    height="auto"
    :name="uid"
    transition="modal"
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
          :empty="!roleValue.value"
        >
          <ReferenceField
            :value="roleValue"
            :label="$t('role_label').toString()"
            :reference-entity="roleEntity"
            :uv-args="mockUvArgs"
            :nullable="true"
            :scope="'no-scope'"
            @update:value="roleValueValue = $event"
          />
        </InputSlot>

        <div class="d-flex flex-row-reverse">
          <b-button
            variant="success"
            @click="sendInvite"
          >
            {{ $t('send_invite') }}
          </b-button>
        </div>
      </div>
    </div>
  </VueModal>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import { IEntityRef } from "ozma-api";
import { invitesServiceUrl, instanceName, instancesHost } from "@/api";

import { randomId } from "@/utils";
import ReferenceField from "@/components/ReferenceField.vue";
import { ICombinedValue } from "@/user_views/combined";
import InputSlot from "@/components/form/InputSlot.vue";
import Input from "@/components/form/Input.vue";

@Component({ components: { ReferenceField, InputSlot, Input } })
export default class InviteUserModal extends Vue {
  @Prop({ type: String, required: true }) authToken!: string;

  private mockUvArgs = { source: { type: "named", ref: { schema: "mock_schema", name: "mock_name" } }, args: {} };

  private emailValue = "";

  private roleEntity: IEntityRef = {
    schema: "public",
    name: "users",
  };

  private roleValueValue = null;

  private get roleValue(): ICombinedValue {
    return {
      value: this.roleValueValue,
      info: {
        field: null,
        fieldRef: { entity: this.roleEntity, name: "role_id" },
      },
    };
  }

  private show() {
    this.$modal.show(this.uid);
  }

  private hide() {
    this.$modal.hide(this.uid);
  }

  private async sendInvite() {
    const id = randomId();
    this.$bvToast.toast(this.$t("invite_start_description").toString(), {
      title: this.$t("invite_start_title").toString(),
      noAutoHide: true,
      solid: true,
      id,
    });

    const url = new URL(`${invitesServiceUrl}/api/invite`);
    const token = this.authToken;
    const body = JSON.stringify({
      email: this.emailValue,
      role_id: this.roleValueValue,
      /* instance_name: "dev", */
      /* instance_domain: "ozma-dev.org", */
      instance_name: instanceName,
      instance_domain: instancesHost,
    });

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        redirect: "manual",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body,
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      this.$bvToast.hide(id);
      if (res.status === 200) {
        this.$bvToast.toast(this.$t("invite_success_description").toString(), {
          title: this.$t("invite_success_title").toString(),
          variant: "success",
          solid: true,
        });

        this.emailValue = "";
        this.roleValueValue = null;
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.$bvToast.hide(id);
        this.$bvToast.toast(this.$t("invite_fail_description").toString(), {
          title: this.$t("invite_fail_title").toString(),
          variant: "danger",
          solid: true,
        });
      }
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.$bvToast.hide(id);
      this.$bvToast.toast(e, {
        title: this.$t("invite_fail_title").toString(),
        variant: "danger",
        solid: true,
      });
    }
  }
}
</script>

<style lang="scss" scoped>
  .v--modal-overlay {
    background: rgba(0, 0, 0, 0.8) !important;
  }

  .form-container {
    width: 99%;
  }

  ::v-deep {
    .v--modal-box {
      max-height: 80% !important;
    }

    .modal-enter-active,
    .modal-leave-active {
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.26, 1.55);
    }

    .modal-enter,
    .modal-leave-to {
      transform: translateY(100%);
      opacity: 0;
    }

    .modal-enter-to,
    .modal-leave {
      opacity: 1;
    }
  }

  .message-container {
    padding: 1rem;
    display: flex;
    flex-flow: column;
    align-items: center;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .invite-icon {
    margin-top: 1rem;
    margin-bottom: 1rem;
    font-size: 5rem;
    line-height: 5rem;
    color: var(--default-foregroundDarkerColor);
  }

  .header {
    margin-bottom: 1rem;
    text-align: center;
    font-weight: bold;
  }

  .message {
    text-align: center;
  }

  .buttons-container {
    margin-top: 2rem;
    margin-bottom: 1rem;
    display: flex;
    flex-flow: column;
  }

  .ok-button {
    margin-bottom: 1.5rem;
    font-weight: bold;
  }
</style>
