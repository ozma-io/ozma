import { AttributesMap, IResultColumnInfo } from "@/api";
import { ISelectionRef } from "@/components/BaseUserView";

export interface IGridInputInfo {
  size: number;
  type: "section" | "input";
  field?: IFieldInfo;
}

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

export interface IGridInputInfoTopLevel extends IGridInputInfo {
  content?: IGridInputInfo[];
}

export interface IGridInputInfoTopLevel extends IGridInputInfo {
  content?: IGridInputInfo[];
}

export interface IFieldInfo {
  index: number;
  columnInfo: IResultColumnInfo;
  caption: string;
  visible: boolean;
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
