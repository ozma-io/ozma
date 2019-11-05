export interface IGridInputInfo {
  label?: string;
  fieldIndex?: number;
  eventName?: string;
  size: number;
  value?: any;
  type: "section" | "text" | "textarea";
}

export interface IGridInputInfoTopLevel extends IGridInputInfo {
  content?: IGridInputInfo[];
}
