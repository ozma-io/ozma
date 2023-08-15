import { VNode } from "vue";

export interface IModalTab {
  key: string;
  autofocus: boolean;
  header: VNode | VNode[] | null;
  content: VNode | VNode[];
}
