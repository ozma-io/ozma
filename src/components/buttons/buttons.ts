import { RawLocation } from "vue-router";
import { Link, IAttrToLinkOpts, attrToLink } from "@/links";
import { mapMaybe, isMobile, shortLanguage } from "@/utils";

export const buttonDisplays = ["all", "desktop", "mobile", "selectionPanel"] as const;
export type ButtonDisplay = typeof buttonDisplays[number];
export const isButtonDisplay = (display: unknown): display is ButtonDisplay => buttonDisplays.includes(display as any);

export interface IButton {
  icon?: string;
  caption?: string;
  tooltip?: string;
  display?: ButtonDisplay;
  variant?: unknown;
  disabled?: boolean;
  colorVariables?: Record<string, string>;
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

export type Button = ILocationButton | ILinkButton | ICallbackButton | IUploadFileButton | IButtonGroup | IOtherButton| IErrorButton;

const messages: Record<string, Record<string, string>> = {
  en: {
    "error_button": "<Error>",
    "computed_attributes": "Computed attributes",
  },
  ru: {
    "error_button": "<Ошибка>",
    "computed_attributes": "Вычисленные атрибуты",
  },
};
const funI18n = (key: string) => messages[shortLanguage]?.[key]; // TODO: can't access VueI18n here, but this solution looks stupid too.

export const attrToButton = (buttonAttr: unknown, opts?: IAttrToLinkOpts, parseAsOtherInsteadError = false): Button | undefined => {
  if (typeof buttonAttr !== "object" || buttonAttr === null) {
    return undefined;
  }

  // `buttonsAttr` at this point is guaranteed to be `Record<string, unknown>`,
  // but TypeScript doesn't support advanced type witnesses like that.
  const buttonObj = buttonAttr as Record<string, unknown>;

  // "caption" is preferred, but we can't put "name" only to `attrToButtonOld` due to buttons in table cells.
  const caption = typeof buttonObj.caption === "string"
    ? buttonObj.caption
    : typeof buttonObj.name === "string" ? buttonObj.name : undefined;
  const icon = typeof buttonObj.icon === "string" ? buttonObj.icon : undefined;
  const tooltip = typeof buttonObj.tooltip === "string" ? buttonObj.tooltip : undefined;
  const display = isButtonDisplay(buttonObj.display) ? buttonObj.display : undefined;
  const variant = buttonObj.variant ?? undefined;
  const variables = buttonObj.colorVariables ?? undefined;
  let colorVariables;
  if (typeof variables === "object"
   && variables !== null
   && Object.keys(variables).every(key => typeof key === "string")
   && Object.values(variables).every(values => typeof values === "string")
  ) {
    colorVariables = variables as Record<string, string>;
  }
  if (!colorVariables && variant) {
    // colorVariables = getColorVariables("button", variant);
  }

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
      colorVariables,
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
      colorVariables,
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
      colorVariables,
      display,
      type: "other",
    };
  }

  return {
    caption: funI18n("error_button"),
    icon: "error_outline",
    tooltip: `${funI18n("computed_attributes")}: ${JSON.stringify(buttonObj)}`,
    variant: "outline-danger",
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

    const caption = typeof buttonObj.name === "string" ? buttonObj.name : undefined;
    const icon = typeof buttonObj.icon === "string" ? buttonObj.icon : undefined;
    const tooltip = typeof buttonObj.tooltip === "string" ? buttonObj.tooltip : undefined;
    const display = isButtonDisplay(buttonObj.display) ? buttonObj.display : "desktop";
    const variant = buttonObj.variant ?? undefined;
    let colorVariables;
    if (variant) {
      // colorVariables = getColorVariables("button", variant);
    }

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
        colorVariables,
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
        colorVariables,
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
    variant: "interfaceButton",
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
