import { AttributesMap, IResultColumnInfo } from "@/api";
import { ISelectionRef } from "@/components/BaseUserView";

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

export type GridElement = IGridInput | IGridSection;

export interface IGridProps {
  uv: any;
  row: any;
  localRow: any;
  locked: boolean;
  indirectLinks: boolean;
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
}

export interface IFormRowExtra {
  selectionEntry?: ISelectionRef;
}

export interface IFormUserViewExtra {
  homeSchema: string | null;
}
