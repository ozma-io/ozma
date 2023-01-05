import { RawLocation } from "vue-router";
import { Link, IAttrToLinkOpts, attrToLink } from "@/links";
import { mapMaybe, isMobile } from "@/utils";
import { i18n } from "@/modules";

export const buttonDisplays = ["all", "desktop", "mobile", "selection_panel", "selectionPanel"] as const;
export type ButtonDisplay = typeof buttonDisplays[number];
export const isButtonDisplay = (display: unknown): display is ButtonDisplay => buttonDisplays.includes(display as any);
import type { ColorVariantAttribute } from "@/utils_colors";
import { colorVariantFromAttribute, interfaceButtonVariant } from "@/utils_colors";
import { rawToUserString, UserString } from "@/state/translations";

export interface IButton {
  icon?: string;
  caption?: UserString;
  tooltip?: UserString;
  display?: ButtonDisplay;
  disabled?: boolean;
  variant: ColorVariantAttribute;
  keepButtonGroupOpened?: boolean;
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

// Used at least for barcode buttons.
export interface IOtherButton extends IButton {
  type: "other";
}

export interface IErrorButton extends IButton {
  type: "error";
}

export type Button = ILocationButton | ILinkButton | ICallbackButton | IUploadFileButton | IButtonGroup | IOtherButton | IErrorButton;

export const attrToButton = (buttonAttr: unknown, opts?: IAttrToLinkOpts, parseAsOtherInsteadError = false): Button | undefined => {
  if (typeof buttonAttr !== "object" || buttonAttr === null) {
    return undefined;
  }

  // `buttonsAttr` at this point is guaranteed to be `Record<string, unknown>`,
  // but TypeScript doesn't support advanced type witnesses like that.
  const buttonObj = buttonAttr as Record<string, unknown>;

  // "caption" is preferred, but we can't put "name" only to `attrToButtonOld` due to buttons in table cells.
  const rawCaption = "caption" in buttonObj ? buttonObj.caption : buttonObj.name;
  const caption = rawToUserString(rawCaption) ?? undefined;
  const icon = typeof buttonObj.icon === "string" ? buttonObj.icon : undefined;
  const tooltip = rawToUserString(buttonObj.tooltip) ?? undefined;
  const display = isButtonDisplay(buttonObj.display) ? buttonObj.display : undefined;
  const variant = colorVariantFromAttribute(buttonObj.variant);

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

  if (parseAsOtherInsteadError) {
    return {
      caption,
      icon,
      tooltip,
      variant,
      display,
      type: "other",
    };
  }

  return {
    caption: i18n.tc("error_button"),
    icon: "error_outline",
    tooltip: `${i18n.tc("computed_attributes")}: ${JSON.stringify(buttonObj)}`,
    variant: { type: "existing", className: "outline-danger" },
    display,
    type: "error",
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

    const rawCaption = "caption" in buttonObj ? buttonObj.caption : buttonObj.name;
    const caption = rawToUserString(rawCaption) ?? undefined;
    const icon = typeof buttonObj.icon === "string" ? buttonObj.icon : undefined;
    const tooltip = rawToUserString(buttonObj.tooltip) ?? undefined;
    const display = isButtonDisplay(buttonObj.display) ? buttonObj.display : "desktop";
    const variant = colorVariantFromAttribute(buttonObj.variant);

    if (buttonObj.visible === false || caption === undefined) {
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

    if (Array.isArray(buttonObj.actions)) {
      const buttons = attrToButtonsOld(buttonObj.actions, opts);
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

    return undefined;
  }, buttonsAttr);
};

export const buttonsToPanelButtons = (buttons: Button[]): Button[] => {
  const panelButtons: Button[] = [];
  const extraButton: Button = {
    icon: "more_vert",
    variant: interfaceButtonVariant,
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

  extraButton.disabled = extraButton.buttons.length === 0;
  panelButtons.push(extraButton);
  return panelButtons;
};
