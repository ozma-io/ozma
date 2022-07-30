import { IActionRef } from "ozma-api";
import { Store } from "vuex";
import { z } from "zod";

import { app } from "@/main";
import { queryLocation, IQueryState, IQuery, attrToRef, IAttrToQueryOpts, attrToRecord, attrObjectToQuery, selfIdArgs, refIdArgs } from "@/state/query";
import { randomId, shortLanguage, waitTimeout } from "@/utils";
import { saveAndRunAction } from "@/state/actions";
import { router } from "@/modules";
import { IValueInfo } from "@/user_views/combined";
import { documentGeneratorUrl, IDocumentRef, instanceName } from "@/api";

export const hrefTargetTypes = ["blank", "self"] as const;
export type HrefTargetType = typeof hrefTargetTypes[number];

const isHrefTargetType = (rawType: unknown): rawType is HrefTargetType => {
  return hrefTargetTypes.includes(rawType as any);
};

export interface IHrefLink {
  href: string;
  type: "href";
  target: HrefTargetType;
}

export const targetTypes = ["top", "root", "modal", "blank", "modal-auto"] as const;
export type TargetType = typeof targetTypes[number];

const isTargetType = (rawType: unknown): rawType is TargetType => {
  return targetTypes.includes(rawType as any);
};

export interface IQueryLink {
  query: IQuery;
  target: TargetType;
  type: "query";
}

export interface IActionLink {
  action: IActionRef;
  args: Record<string, unknown>;
  type: "action";
}

export interface IQRCodeLink {
  links: Record<string, Record<string, Link>>;
  type: "qrcode";
}

export interface IDocumentLink {
  type: "document";
  template: IDocumentRef;
  filename: string;
  args: Record<string, unknown>;
}

export type Link = IHrefLink | IQueryLink | IActionLink | IQRCodeLink | IDocumentLink;

export interface IAttrToLinkOpts extends IAttrToQueryOpts {
  defaultTarget?: TargetType;
  defaultActionArgs?: Record<string, any>;
}

const messages: Record<string, Record<string, string>> = {
  en: {
    "generation_start_title": "File generation is started",
    "generation_start_description": "It may take few seconds",
    "generation_fail": "Error occured while file generation. Try again.",
  },
  ru: {
    "generation_start_title": "Началось создание файла",
    "generation_start_description": "Это займёт несколько секунд",
    "generation_fail": "Произошла ошибка при создании файла. Попробуйте снова.",
  },
};
const funI18n = (key: string) => messages[shortLanguage]?.[key]; // TODO: can't access VueI18n here, but this solution looks stupid too.

export const addLinkDefaultArgs = (link: Link, args: object) => {
  if ("args" in link) {
    link.args = { ...args, ...link.args };
  } else if ("query" in link && link.query.args.args) {
    link.query.args.args = { ...args, ...link.query.args.args };
  }
};

export const EntityRef = z.object({
  schema: z.string(),
  name: z.string(),
});

export const attrToQueryLink = (linkedAttr: object, opts?: IAttrToLinkOpts): IQueryLink | null => {
  const query = attrObjectToQuery(linkedAttr, opts);
  if (query === null) {
    return null;
  }

  const attrDict = linkedAttr as Record<string, unknown>;
  const targetAttr = attrDict["target"];
  let target: TargetType;
  if (isTargetType(targetAttr)) {
    target = targetAttr;
  } else if (opts?.defaultTarget) {
    target = opts.defaultTarget;
  } else {
    target = "modal-auto";
  }

  return { query, target, type: "query" };
};

export const attrToActionLink = (linkedAttr: object, opts?: IAttrToLinkOpts): IActionLink | null => {
  const attrDict = linkedAttr as Record<string, unknown>;
  const action = attrToRef(attrDict["action"]);
  if (action === null) {
    return null;
  }

  let args = attrToRecord(attrDict["args"]);
  if (args === null) {
    return null;
  }

  const display = attrDict["display"];
  const addIds = attrDict["add_selected_entry_ids"]; // TODO: deprecated, delete this.
  if (addIds || display === "selection_panel" || display === "selectionPanel") {
    args = { ...opts?.defaultActionArgs, ...args };
  }

  return { action, args, type: "action" };
};

export const attrToQRCodeLink = (linkedAttr: object, opts?: IAttrToLinkOpts): IQRCodeLink | null => {
  const attrDict = linkedAttr as Record<string, unknown>;
  const qrСodeLink: IQRCodeLink = {
    links: {},
    type: "qrcode",
  };

  const linksObj = attrDict["qrcode"];
  if (typeof linksObj !== "object" || linksObj === null) {
    return null;
  }

  Object.entries(linksObj).forEach(([schema, sRecoreds]) => {
    if (typeof sRecoreds !== "object" || sRecoreds === null) {
      return;
    }

    const sRecoredsObj = sRecoreds as Record<string, unknown>;
    Object.entries(sRecoredsObj).forEach(([name, nRercords]) => {
      if (typeof nRercords !== "object" || nRercords === null) {
        return;
      }
      const link = attrToLink(nRercords, opts);
      if (link !== null) {
        if (!qrСodeLink.links[schema]) {
          qrСodeLink.links[schema] = {};
        }
        qrСodeLink.links[schema][name] = link;
      }
    });
  });

  return qrСodeLink;
};

const extensions = ["pdf", "odt", "html", "txt"];
const extensionRegex = new RegExp(`.*.${extensions.join("|")}$`);
const filenameHasExtension = (filename: string): boolean => (extensionRegex.exec(filename)) !== null;

export const attrToDocumentLink = (linkedAttr: Record<string, unknown>, opts?: IAttrToLinkOpts): IDocumentLink | null => {
  const templateRaw = linkedAttr["document_template"];
  if (typeof templateRaw !== "object" || templateRaw === null) return null;
  const templateObj = templateRaw as Record<string, unknown>;
  const ref = EntityRef.safeParse(templateObj);
  const filenameRaw = linkedAttr["filename"];
  const args = attrToRecord(linkedAttr["args"]);
  if (!ref.success
   || (filenameRaw !== undefined && typeof filenameRaw !== "string")
   || args === null) {
    return null;
  }
  const filename = filenameRaw === undefined
    ? `${name}.pdf`
    : filenameRaw + (filenameHasExtension(filenameRaw) ? "" : ".pdf");

  return { template: ref.data, filename, args, type: "document" };
};

export const attrToLink = (linkedAttr: unknown, opts?: IAttrToLinkOpts): Link | null => {
  if (typeof linkedAttr === "string") {
    return {
      type: "href",
      href: linkedAttr,
      target: "self",
    };
  }

  if (typeof linkedAttr !== "object" || linkedAttr === null) {
    return null;
  }
  const linkedAttrObj = linkedAttr as Record<string, unknown>;

  const query = attrToQueryLink(linkedAttrObj, opts);
  if (query !== null) {
    return query;
  }

  const href = linkedAttrObj["href"];
  if (typeof href === "string") {
    const target = isHrefTargetType(linkedAttrObj["target"]) ? linkedAttrObj["target"] : "self";
    return {
      type: "href",
      href,
      target,
    };
  }

  const action = attrToActionLink(linkedAttrObj, opts);
  if (action !== null) {
    return action;
  }

  const qrCode = attrToQRCodeLink(linkedAttrObj, opts);
  if (qrCode !== null) {
    return qrCode;
  }

  const documentLink = attrToDocumentLink(linkedAttrObj, opts);
  if (documentLink !== null) {
    return documentLink;
  }

  return null;
};

// Set 'id' argument to the value id.
export const attrToLinkSelf = (linkedAttr: unknown, update?: IValueInfo, opts?: IAttrToLinkOpts): Link | null => {
  if (typeof linkedAttr !== "object") {
    return null;
  }

  const ret = attrToLink(linkedAttr, opts);
  if (ret !== null) {
    addLinkDefaultArgs(ret, selfIdArgs(update));
  }
  return ret;
};

// Set 'id' argument to the id of the referenced value.
export const attrToLinkRef = (linkedAttr: unknown, value: unknown, opts?: IAttrToLinkOpts): Link | null => {
  const ret = attrToLink(linkedAttr, opts);
  if (ret !== null) {
    addLinkDefaultArgs(ret, refIdArgs(value));
  }
  return ret;
};

export const iconValue = (target: string) => {
  if (target === "modal-auto" || target === "modal") {
    return "flip_to_front";
  } else {
    return "open_in_new";
  }
};

export interface ILinkHandler {
  handler: () => Promise<void>;
  href?: string;
  target?: string;
  rel?: string;
}

export interface ILinkHandlerParams {
  store: Store<any>;
  goto: (query: IQuery) => void;
  link: Link;
  openQRCodeScanner: (link: Link) => void;
  replaceInsteadPush?: boolean;
}

export const linkHandler = (params: ILinkHandlerParams): ILinkHandler => {
  let handler: () => Promise<void>;
  let href: string | undefined;
  // HTML <a> target, with underscores.
  let target: string | undefined;
  let rel: string | undefined;

  if (params.link.type === "query") {
    const query = params.link.query;
    // We always point href to just the location itself, for simplicity.
    href = router.resolve(queryLocation(query)).href;
    rel = "noopener";

    if (params.link.target === "modal") {
      handler = async () => {
        await params.store.dispatch("query/addWindow", query);
      };
    } else if (params.link.target === "root") {
      /* eslint-disable @typescript-eslint/require-await */
      handler = params.replaceInsteadPush
        ? async () => params.store.dispatch("query/replaceRoot", query)
        : async () => params.goto(query);
      /* eslint-enable @typescript-eslint/require-await */
    } else if (params.link.target === "top") {
      handler = async () => {
        await params.store.dispatch("query/pushRoot", query);
      };
    } else if (params.link.target === "blank") {
      target = "_blank";
      // eslint-disable-next-line @typescript-eslint/require-await
      handler = async () => {
        window.open(href!, target, rel);
      };
    } else if (params.link.target === "modal-auto") {
      handler = async () => {
        const queryState = params.store.state.query as IQueryState;
        if (queryState.current?.windows.length === 0) {
          await params.store.dispatch("query/addWindow", query);
        } else {
          params.goto(query);
        }
      };
    } else {
      throw new Error("Impossible");
    }
  } else if (params.link.type === "href") {
    href = params.link.href;
    rel = "noreferrer";

    if (params.link.target === "self") {
      target = "_self";
    } else if (params.link.target === "blank") {
      target = "_blank";
    } else {
      throw new Error("Impossible");
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    handler = async () => {
      window.open(href!, target, rel);
    };
  } else if (params.link.type === "action") {
    const { action, args } = params.link;

    handler = async () => {
      const ret = await saveAndRunAction(params.store, action, args);
      const retLink = attrToLink(ret.result, { defaultTarget: "root" });
      if (retLink !== null) {
        const linkHandlerParams: ILinkHandlerParams = {
          store: params.store,
          goto: params.goto,
          link: retLink,
          openQRCodeScanner: params.openQRCodeScanner,
        };
        await linkHandler(linkHandlerParams).handler();
      }
    };
  } else if (params.link.type === "qrcode") {
    handler = () => {
      params.openQRCodeScanner(params.link);
      return Promise.resolve();
    };
  } else if (params.link.type === "document") {
    const { template, filename, args } = params.link;
    handler = async () => {
      const id = randomId();
      app.$bvToast.toast(funI18n("generation_start_description"), {
        title: funI18n("generation_start_title"),
        noAutoHide: true,
        solid: true,
        id,
      });

      const token = params.store.state.auth.current.token;
      const escapedFilename = encodeURIComponent(filename);
      const url = new URL(`${documentGeneratorUrl}/api/${instanceName}/${template.schema}/${template.name}/generate/${escapedFilename}`);
      url.search = new URLSearchParams(args as Record<string, string>).toString();

      try {
        const res = await fetch(url.toString(), {
          method: "GET",
          redirect: "manual",
          headers: new Headers({
            "Authorization": `Bearer ${token}`,
          }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.setAttribute("download", filename);
          a.click();
        } else {
          const body = await res.json();
          app.$bvToast.toast(String(body.message), {
            title: funI18n("generation_fail"),
            variant: "danger",
            solid: true,
          });
          return;
        }
      } catch (e) {
        app.$bvToast.toast(String(e), {
          title: funI18n("generation_fail"),
          variant: "danger",
          solid: true,
        });
      } finally {
        // Don't know why it's needed there, but without it toast won't close.
        await waitTimeout(100);
        app.$bvToast.hide(id);
      }
    };
  } else {
    throw new Error("Impossible");
  }
  return { handler, href, target, rel };
};
