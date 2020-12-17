import { AttributesMap, IResultColumnInfo } from "@/api";
import { ISelectionRef } from "@/components/BaseUserView";
import { Link } from "@/links";

export interface IGridBase {
  size: number;
}

export interface IGridInput extends IGridBase {
  type: "input";
  field: IFieldInfo;
}

export interface IGridSection extends IGridBase {
  type: "section";
  content: GridElement[];
}

export interface IGridButtons {
  type: "buttons";
  actions: IButtonAction[];
}

export interface IButtonAction {
  name: string;
  variant: string;
  link: Link;
}

export type GridElement = IGridInput | IGridSection | IGridButtons;

export interface IGridProps {
  uv: any;
  row: any;
  localRow: any;
  locked: boolean;
  selectionMode: boolean;
  scope: string;
  level: number;
  onUpdate: (fieldIndex: number, event: any) => void;
  onGoto: (event: any) => void;
}

export interface IFieldInfo {
  index: number;
  columnInfo: IResultColumnInfo;
  caption: string;
}

export interface IBlockInfo {
  width: number;
  fields: IFieldInfo[];
}

export interface IFormValueExtra {
  attributes: AttributesMap;
  visible: boolean;
}

export interface IFormRowExtra {
  selectionEntry?: ISelectionRef;
}

export interface IFormUserViewExtra {
  homeSchema: string | null;
}
