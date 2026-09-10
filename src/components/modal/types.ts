import { VNode } from 'vue'

export interface IModalTab {
  key: string
  autofocus: boolean
  overlayBlurEnabled: boolean
  header: VNode | VNode[] | null
  content: VNode | VNode[]
}
