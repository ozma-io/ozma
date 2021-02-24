import { RawLocation } from "vue-router";
import { Link, IAttrToLinkOpts, attrToLink } from "@/links";
import { mapMaybe, isMobile } from "@/utils";

export interface IButton {
  icon?: string;
  title?: string;
  tooltip?: string;
  backgroundColor?: string;
}

export interface IEmptyButton extends IButton {
  type: "empty";
}

export interface ILocationButton extends IButton {
  location: RawLocation;
  type: "location";
}

export interface ILinkButton extends IButton {
  link: Link;
  type: "link";
}

export interface ICallbackButton extends IButton {
  callback: () => void;
  type: "callback";
}

export interface IUploadFileButton extends IButton {
  uploadFile: (file: File) => void;
  type: "upload-file";
}

export interface IButtonGroup extends IButton {
  buttons: Button[];
  type: "button-group";
}

export type Button = ILocationButton | ILinkButton | ICallbackButton | IUploadFileButton | IButtonGroup | IEmptyButton;

export const attrToButtons = (buttonsAttr: unknown[], opts?: IAttrToLinkOpts, isExtraButton = false): Button[] => {
  return mapMaybe((rawButton: unknown) => {

    if (typeof rawButton !== "object" || rawButton === null) {
      return undefined;
    }
    
    // `buttonsAttr` at this point is guaranteed to be `Record<string, unknown>`,
    // but TypeScript doesn't support advanced type witnesses like that.
    const buttonObj = rawButton as Record<string, unknown>;

    const title = typeof buttonObj.title === "string" ? buttonObj.title : undefined;
    const icon = typeof buttonObj.icon === "string" ? buttonObj.icon : undefined;
    const tooltip = typeof buttonObj.tooltip === "string" ? buttonObj.tooltip : undefined;

    if (buttonObj.visible === false) {
      return undefined;
    }

    // @display = "all" | "mobile" | "desktop"
    const display = typeof buttonObj.display === "string" ? buttonObj.display : "desktop";

    if (isMobile && !isExtraButton) {
      if (display === "desktop") {
        return undefined;
      }
    }
    if (isMobile && isExtraButton) {
      if (display === "all" || display === "mobile") {
        return undefined;
      }
    }
    if (!isMobile && !isExtraButton) {
      if (display === "mobile") {
        return undefined;
      }
    }
    if (!isMobile && isExtraButton) {
      if (display === "all" || display === "desktop") {
        return undefined;
      }
    }

    const backgroundColor = typeof buttonObj.backgroundColor === "string" ? buttonObj.backgroundColor : undefined 

    const link = attrToLink(buttonObj, opts);
    if (link !== null) {
      return {
        title,
        icon,
        tooltip,
        backgroundColor,
        link,
        type: "link",
      }
    }

    if (Array.isArray(buttonObj.buttons)) {
      const buttons = attrToButtons(buttonObj.buttons, opts);
      return {
        title,
        icon,
        tooltip,
        backgroundColor,
        buttons,
        type: "button-group",
      }
    }

    return {
      type: "empty",
    }

  }, buttonsAttr)
}