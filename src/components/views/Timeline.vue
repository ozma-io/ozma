<i18n>
  {
    "en": {
      "no_datetime": "The query is lacking timeline_datetime attribute",
      "datetime_wrong_type": "timeline_datetime attribute is not on value with datetime type",
      "send": "Send"
    },
    "ru": {
      "no_datetime": "В запросе отсутствует атрибут timeline_datetime",
      "datetime_wrong_type": "Атрибут timeline_datetime должен быть указан для значения с типом datetime",
      "send": "Отправить"
    },
    "es": {
      "no_datetime": "La consulta carece del atributo timeline_datetime",
      "datetime_wrong_type": "El atributo timeline_datetime no está en el valor con el tipo datetime",
      "send": "Enviar"
    }
  }
</i18n>

<template>
  <div class="timeline-background">
    <Errorbox v-if="errors" :message="errors" />
    <fragment v-else>
      <div v-if="messageIndex" class="input-container">
        <b-input-group>
          <b-textarea
            v-model="message"
            class="cell-variant cell-local-variant textarea"
            @keypress.ctrl.enter.stop="sendMessage"
          />
          <b-input-group-append>
            <b-button
              variant="primary"
              :disabled="message.length === 0"
              @click="sendMessage"
            >
              {{ $t('send') }}
            </b-button>
          </b-input-group-append>
        </b-input-group>
      </div>

      <transition-group tag="ul" class="timeline" name="fade-1">
        <Phenom v-for="phenom in phenoms" :key="phenom.key" :phenom="phenom" />
      </transition-group>
    </fragment>
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import moment, { Moment } from 'moment'
import { namespace } from 'vuex-class'

import { UserView } from '@/components'
import Errorbox from '@/components/Errorbox.vue'
import BaseUserView, { EmptyBaseUserView } from '@/components/BaseUserView'
import Phenom, {
  IPhenom,
  PhenomType,
  isPhenomType,
} from '@/components/views/timeline/Phenom.vue'
import { mapMaybe, tryDicts } from '@/utils'
import {
  ICombinedValue,
  IRowCommon,
  RowRef,
  valueToPunnedText,
} from '@/user_views/combined'
import type { ScopeName, ISubmitResult } from '@/state/staging_changes'
import { CurrentAuth, INoAuth } from '@/state/auth'

interface IPhenomColumn {
  value: ICombinedValue
  valueText: string
}

type PhenomColumn = IPhenomColumn

type PhenomRow = PhenomColumn[]

export interface IRowPhenom {
  type: PhenomType
  ref: RowRef
  columns: PhenomRow
}

const auth = namespace('auth')
const staging = namespace('staging')

@UserView()
@Component({ components: { Phenom, Errorbox } })
export default class UserViewTimeline extends mixins<EmptyBaseUserView>(
  BaseUserView,
) {
  @auth.State('current') currentAuth!: CurrentAuth | INoAuth | null
  @staging.Action('submit') submitChanges!: (_: {
    scope?: ScopeName
    preReload?: () => Promise<void>
    errorOnIncomplete?: boolean
  }) => Promise<ISubmitResult>
  private message = ''

  private get phenoms() {
    const unsortedPhenoms = this.uv.mapVisibleRows(
      (row: IRowCommon, ref: RowRef) => this.makePhenom(row, ref),
    )
    // FIXME: `filter` is hack because phenom is created without datetime and it messes animation.
    return unsortedPhenoms
      .filter((phenom) => phenom.datetime)
      .sort((p1, p2) => -p1.datetime.diff(p2.datetime))
  }

  private makePhenom(row: IRowCommon, rowRef: RowRef): IPhenom<IRowPhenom> {
    const viewAttrs = this.uv.attributes
    const rowAttrs = row.attributes
    const getRowAttr = (name: string) => tryDicts(name, rowAttrs, viewAttrs)

    const columns = mapMaybe((value, colI): PhenomColumn | undefined => {
      const info = this.uv.info.columns[colI]
      const columnAttrs = this.uv.columnAttributes[colI]
      const cellAttrs = value.attributes
      const getCellAttr = (name: string) =>
        tryDicts(name, cellAttrs, columnAttrs, rowAttrs, viewAttrs)

      const visible =
        getCellAttr('visible') ?? !this.metadataIndexes.includes(colI)
      if (!visible) {
        return undefined
      }

      const punnedValue = valueToPunnedText(info.valueType, value)
      return {
        value,
        valueText: punnedValue,
      }
    }, row.values)

    const typeRaw =
      this.typeIndex === null
        ? 'message'
        : String(row.values[this.typeIndex].value)
    const type = isPhenomType(typeRaw) ? typeRaw : 'message'

    const username =
      this.usernameIndex === null
        ? null
        : this.getPunnedValueByIndex(row, this.usernameIndex)
    const datetime = row.values[this.datetimeIndex!].value as Moment

    const rowPhenom: IRowPhenom = {
      ref: rowRef,
      columns,
      type,
    }

    return {
      // FIXME: `rowKey()` makes animation flicker due to `key` changes,
      // and `datetime` may be null for new comment, but this solution is ugly and bad.
      // (and still flickers a little on save)
      key: (datetime ?? moment()).valueOf(),
      type,
      username,
      datetime,
      phenom: rowPhenom,
    }
  }

  private getPunnedValueByIndex(row: IRowCommon, index: number) {
    return valueToPunnedText(
      this.uv.info.columns[index].valueType,
      row.values[index],
    )
  }

  private indexOfAttributedCoulmn(attribute: string) {
    const index = this.uv.columnAttributes.findIndex(
      (attributes) => attributes[attribute] === true,
    )
    return index === -1 ? null : index
  }

  private get datetimeIndex() {
    return this.indexOfAttributedCoulmn('timeline_datetime')
  }

  private get usernameIndex() {
    return this.indexOfAttributedCoulmn('timeline_username')
  }

  private get typeIndex() {
    return this.indexOfAttributedCoulmn('timeline_type')
  }

  private get messageIndex() {
    return this.indexOfAttributedCoulmn('timeline_message')
  }
  private get metadataIndexes() {
    return [this.datetimeIndex, this.usernameIndex, this.typeIndex]
  }

  private get username() {
    const currentAuth = this.currentAuth as CurrentAuth | null
    return currentAuth?.username ?? currentAuth?.email ?? '<noname>'
  }

  private async sendMessage() {
    const mainEntity = this.uv.info.mainEntity
    if (!mainEntity || !mainEntity.forInsert) {
      throw new Error("View doesn't have a main entity to insert")
    }
    const id = await this.addNewRow()
    const fields = [
      {
        value: moment(), // TODO: make it backend-side.
        index: this.datetimeIndex,
      },
      {
        value: this.message,
        index: this.messageIndex,
      },
      {
        value: this.username,
        index: this.usernameIndex,
      },
      {
        value: 'message',
        index: this.typeIndex,
      },
    ]

    await Promise.all(
      fields.map(({ value, index }) => {
        if (index === null) return Promise.resolve() // `usernameIndex` and `typeIndex` may be `null`.

        const ref = { type: 'added', id, column: index }
        const fieldName = this.uv.info.columns[index].mainField?.name
        if (fieldName) {
          return this.setAddedField({
            fieldRef: {
              entity: mainEntity.entity,
              name: fieldName,
            },
            id,
            value,
          })
        } else {
          throw new Error('Column without mainField')
        }
      }),
    )

    await this.submitChanges({ scope: this.scope, errorOnIncomplete: true })
    this.message = ''
  }

  get errors() {
    if (this.datetimeIndex === null) {
      return this.$t('no_datetime')
    }
    const column = this.uv.info.columns[this.datetimeIndex]
    const columnType = this.uv.info.columns[this.datetimeIndex].valueType.type
    if (columnType !== 'datetime' && columnType !== 'localdatetime') {
      return this.$t('datetime_wrong_type')
    }
    return null
  }
}
</script>

<style lang="scss" scoped>
@include variant-to-local('cell');

.timeline-background {
  background-color: var(--default-backgroundColor);
  padding: 1rem;
}

.timeline {
  margin: 0;
  padding: 0.25rem 0.5rem;
}

.input-container {
  margin-bottom: 1rem;

  .textarea {
    border-radius: 0.5rem;
    background-color: var(--cell-backgroundColor);
    height: 3rem;
    color: var(--cell-foregroundColor);
  }
}

.fade-1-move {
  transition: transform 0.1s;
}

// Remove shadow for messages
.shadow-sm {
  -webkit-box-shadow: none;
  -moz-box-shadow: none;
  box-shadow: none;
}
</style>
