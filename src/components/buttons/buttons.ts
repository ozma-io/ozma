import { RawLocation } from "vue-router";
import { Link, IAttrToLinkOpts, attrToLink } from "@/links";
import { mapMaybe, isMobile } from "@/utils";

export interface IButton {
  icon?: string;
  caption?: string;
  tooltip?: string;
  display?: string;
  variant?: string;
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

export const attrToButton = (buttonAttr: unknown, opts?: IAttrToLinkOpts): Button | undefined => {
  if (typeof buttonAttr !== "object" || buttonAttr === null) {
    return undefined;
  }

  // `buttonsAttr` at this point is guaranteed to be `Record<string, unknown>`,
  // but TypeScript doesn't support advanced type witnesses like that.
  const buttonObj = buttonAttr as Record<string, unknown>;

  const caption = typeof buttonObj.caption === "string" ? buttonObj.caption : undefined;
  const icon = typeof buttonObj.icon === "string" ? buttonObj.icon : undefined;
  const tooltip = typeof buttonObj.tooltip === "string" ? buttonObj.tooltip : undefined;
  const display = typeof buttonObj.display === "string" ? buttonObj.display : undefined;
  const variant = typeof buttonObj.variant === "string" ? buttonObj.variant : undefined;

  if (buttonObj.visible === false) {
    return undefined;
  }

  const link = attrToLink(buttonObj, opts);
  if (link !== null) {
    return {
      caption,
      icon,
      tooltip,
      variant,
      link,
      display,
      type: "link",
    };
  }

  if (Array.isArray(buttonObj.buttons)) {
    const buttons = attrToButtons(buttonObj.buttons, opts);
    return {
      caption,
      icon,
      tooltip,
      variant,
      buttons,
      display,
      type: "button-group",
    };
  }

  return {
    caption,
    icon,
    tooltip,
    variant,
    display,
    type: "empty",
  };
};

export const attrToButtons = (buttonsAttr: unknown, opts?: IAttrToLinkOpts): Button[] => {
  if (!Array.isArray(buttonsAttr)) {
    return [];
  }
  return mapMaybe((rawButton: unknown) => {
    return attrToButton(rawButton, opts);
  }, buttonsAttr);
};

// Will be deleted
// The difference with this function is that it does not display buttons if the name is empty.
// And buttons was be name actions.
// Display is new params.
export const attrToButtonsOld = (buttonsAttr: unknown, opts?: IAttrToLinkOpts): Button[] => {
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
    const display = typeof buttonObj.display === "string" ? buttonObj.display : "desktop";
    const variant = typeof buttonObj.variant === "string" ? buttonObj.variant : undefined;

    if (buttonObj.visible === false || name === undefined) {
      return undefined;
    }

    const link = attrToLink(buttonObj, opts);
    if (link !== null) {
      return {
        name,
        icon,
        tooltip,
        variant,
        link,
        display,
        type: "link",
      };
    }

    if (Array.isArray(buttonObj.actions)) {
      const buttons = attrToButtons(buttonObj.actions, opts);
      return {
        name,
        icon,
        tooltip,
        variant,
        buttons,
        display,
        type: "button-group",
      };
    }

    return undefined;
  }, buttonsAttr);
};

export const buttonsToPanelButtons = (buttons: Button[]): Button[] => {
  const panelButtons: Button[] = [];
  const extraButton: Button = {
    icon: "more_vert",
    type: "button-group",
    buttons: [],
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
};
