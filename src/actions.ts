import { RawLocation } from "vue-router";
import { Link } from "@/links";

export interface IAction {
  icon?: string;
  name?: string;
  order?: number;
}

export interface ILocationAction extends IAction {
  location: RawLocation;
}

export interface ILinkAction extends IAction {
  link: Link;
}

export interface ICallbackAction extends IAction {
  callback: () => void;
}

export interface IUploadFileAction extends IAction {
  uploadFile: (file: File) => void;
}

export type Action = ILocationAction | ILinkAction | ICallbackAction | IUploadFileAction;