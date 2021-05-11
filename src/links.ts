import { app } from "@/main";
import { queryLocation, IQueryState, IQuery, attrToRef, IAttrToQueryOpts, attrToRecord, attrObjectToQuery, selfIdArgs, refIdArgs } from "@/state/query";
import { IActionRef } from "ozma-api";
import { gotoHref, randomId, shortLanguage } from "@/utils";
import { saveAndRunAction } from "@/state/actions";
import { Store } from "vuex";
import { router } from "@/modules";
import { IValueInfo } from "@/user_views/combined";
import { documentGeneratorUrl, instanceName } from "./api";

export const hrefTargetTypes = ["_top", "_blank", "_self", "_parent"] as const;
export type HrefTargetType = typeof hrefTargetTypes[number];

export interface IHrefLink {
  href: string;
  type: "href";
  target: HrefTargetType;
}

export type TargetType = "top" | "root" | "modal" | "blank" | "modal-auto";

const isTargetType = (rawType: unknown): rawType is TargetType => {
  return rawType === "top" || rawType === "root" || rawType === "modal" || rawType === "blank" || rawType === "modal-auto";
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
  schema: string;
  template: string;
  filename: string;
  instance: string;
  args: Record<string, unknown>;
}

export type Link = IHrefLink | IQueryLink | IActionLink | IQRCodeLink | IDocumentLink;

export interface IAttrToLinkOpts extends IAttrToQueryOpts {
  defaultTarget?: TargetType;
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

export const addLinkDefaultArgs = (link: Link, args: Record<string, unknown>) => {
  if ("args" in link) {
    link.args = { ...args, ...link.args };
  } else if ("query" in link && link.query.args.args) {
    link.query.args.args = { ...args, ...link.query.args.args };
  }
};

const attrToQueryLink = (linkedAttr: Record<string, unknown>, opts?: IAttrToLinkOpts): IQueryLink | null => {
  const query = attrObjectToQuery(linkedAttr, opts);
  if (query === null) {
    return null;
  }

  const targetAttr = linkedAttr["target"];
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

export const attrToActionLink = (linkedAttr: Record<string, unknown>, opts?: IAttrToLinkOpts): IActionLink | null => {
  const action = attrToRef(linkedAttr["action"]);
  if (action === null) {
    return null;
  }

  const args = attrToRecord(linkedAttr["args"]);
  if (args === null) {
    return null;
  }
  return { action, args, type: "action" };
};

export const attrToQRCodeLink = (linkedAttr: Record<string, unknown>, opts?: IAttrToLinkOpts): IQRCodeLink | null => {
  const qrСodeLink: IQRCodeLink = {
    links: {},
    type: "qrcode",
  };

  if (typeof linkedAttr !== "object" || linkedAttr === null) {
    return null;
  }

  if (!("qrcode" in linkedAttr) || linkedAttr.qrcode === null) {
    return null;
  }

  const linksObj = linkedAttr.qrcode as Record<string, unknown>;

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

export const attrToDocumentLink = (linkedAttr: Record<string, unknown>, opts?: IAttrToLinkOpts): IDocumentLink | null => {
  const schema = linkedAttr["document_schema"];
  const template = linkedAttr["document_template"];
  const filename = linkedAttr["document_filename"];
  const instanceRaw = linkedAttr["document_instance"];
  const args = attrToRecord(linkedAttr["args"]);
  if (typeof schema !== "string"
   || typeof template !== "string"
   || typeof filename !== "string"
   || (instanceRaw !== undefined && typeof instanceRaw !== "string")
   || args === null) {
    return null;
  }

  const instance = instanceRaw ?? instanceName;

  return { instance, schema, template, filename, args, type: "document" };
};

export const attrToLink = (linkedAttr: unknown, opts?: IAttrToLinkOpts): Link | null => {
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
    const targetRaw = "_" + linkedAttrObj["target"];
    const target = hrefTargetTypes.includes(targetRaw as any) ? targetRaw as HrefTargetType : "_self";
    return { href, type: "href", target };
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
  href: string | null;
}

export interface ILinkHandlerParams {
  store: Store<any>;
  goto: (query: IQuery) => void;
  link: Link;
  openQRCodeScanner: (name: string, link: Link) => void;
}

export const linkHandler = (params: ILinkHandlerParams): ILinkHandler => {
  let handler: () => Promise<void>;
  let href: string | null = null;

  if (params.link.type === "query") {
    const query = params.link.query;
    if (params.link.target === "modal") {
      handler = async () => {
        await params.store.dispatch("query/addWindow", query);
      };
    } else if (params.link.target === "root") {
      // eslint-disable-next-line @typescript-eslint/require-await
      handler = async () => {
        params.goto(query);
      };
    } else if (params.link.target === "top") {
      handler = async () => {
        await params.store.dispatch("query/pushRoot", query);
      };
    } else if (params.link.target === "blank") {
      // eslint-disable-next-line @typescript-eslint/require-await
      handler = async () => {
        window.open(href!, "_blank");
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

    href = router.resolve(queryLocation(query)).href;
  } else if (params.link.type === "href") {
    const curHref = params.link.href;

    if (params.link.target === "_blank") {
      handler = () => {
        window.open(curHref, "_blank");
        return new Promise(() => {});
      };
    } else {
      handler = async () => {
        await gotoHref(curHref);
      };
      href = curHref;
    }
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
    // eslint-disable-next-line @typescript-eslint/require-await
    handler = async () => {
      params.openQRCodeScanner("open-qrcode-scanner", params.link);
    };
  } else if (params.link.type === "document") {
    const { schema, template, filename, instance, args } = params.link;
    handler = async () => {
      const id = randomId();
      app.$bvToast.toast(funI18n("generation_start_description"), {
        title: funI18n("generation_start_title"),
        solid: true,
        id,
      });

      const token = params.store.state.auth.current.token;
      const url = new URL(`${documentGeneratorUrl}/api/${instance}/${schema}/${template}/generate/${filename}.pdf`);
      url.search = new URLSearchParams(args as any).toString();

      try {
        const res = await fetch(url.toString(), {
          method: "GET",
          redirect: "manual",
          headers: new Headers({
            "access_token": token,
          }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.setAttribute("download", filename);
          a.click();
          app.$bvToast.hide(id);
        } else {
          app.$bvToast.toast(res.statusText, {
            title: funI18n("generation_fail"),
            variant: "danger",
            solid: true,
          });
          return;
        }
      } catch (e) {
        app.$bvToast.toast(e, {
          title: funI18n("generation_fail"),
          variant: "danger",
          solid: true,
        });
      }
    };
  } else {
    throw new Error("Impossible");
  }
  return { handler, href };
};
