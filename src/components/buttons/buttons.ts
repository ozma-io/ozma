import { RawLocation } from "vue-router";
import { Link, IAttrToLinkOpts, attrToLink } from "@/links";
import { mapMaybe, isMobile } from "@/utils";

export interface IButton {
  icon?: string;
  name?: string;
  tooltip?: string;
  display?: string;
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

export const attrToButtons = (buttonsAttr: unknown, opts?: IAttrToLinkOpts): Button[] => {
  if (!Array.isArray(buttonsAttr)) {
    return [];
  }

  return mapMaybe((rawButton: unknown) => {

    if (typeof rawButton !== "object" || rawButton === null) {
      return undefined;
    }
    
    // `buttonsAttr` at this point is guaranteed to be `Record<string, unknown>`,
    // but TypeScript doesn't support advanced type witnesses like that.
    const buttonObj = rawButton as Record<string, unknown>;

    const name = typeof buttonObj.name === "string" ? buttonObj.name : undefined;
    const icon = typeof buttonObj.icon === "string" ? buttonObj.icon : undefined;
    const tooltip = typeof buttonObj.tooltip === "string" ? buttonObj.tooltip : undefined;
    const display = typeof buttonObj.display === "string" ? buttonObj.display : undefined;
    const backgroundColor = typeof buttonObj.backgroundColor === "string" ? buttonObj.backgroundColor : undefined 

    if (buttonObj.visible === false) {
      return undefined;
    }

    const link = attrToLink(buttonObj, opts);
    if (link !== null) {
      return {
        name,
        icon,
        tooltip,
        backgroundColor,
        link,
        display,
        type: "link",
      }
    }

    if (Array.isArray(buttonObj.buttons)) {
      const buttons = attrToButtons(buttonObj.buttons, opts);
      return {
        name,
        icon,
        tooltip,
        backgroundColor,
        buttons,
        display,
        type: "button-group",
      }
    }

    console.log("buttonObj", buttonObj);

    return {
      type: "empty",
    }

  }, buttonsAttr)
}

export const buttonsToPanelButtons = (buttons: Button[]): Button[] => {
  let panelButtons: Button[] = [];
  const extraButton: Button = {
    icon: "more_vert",  
    type: "button-group", 
    buttons: []
  };

  buttons.forEach(button => {

    if (button.display === undefined) {
      extraButton.buttons.push(button);

    } else if (isMobile && button.display === "mobile") {
      panelButtons.push(button);

    } else if (!isMobile && button.display === "desktop") {
      panelButtons.push(button);

    } else if (button.display === "all") {
      panelButtons.push(button);
    
    } else {
      extraButton.buttons.push(button);
      
    }
  });

  panelButtons.push(extraButton);
  return panelButtons;
}