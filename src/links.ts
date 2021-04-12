import { queryLocation, IQueryState, IQuery, attrToRef, IAttrToQueryOpts, attrToRecord, attrObjectToQuery, selfIdArgs, refIdArgs } from "@/state/query";
import { IActionRef } from "ozma-api";
import { gotoHref } from "@/utils";
import { saveAndRunAction } from "@/state/actions";
import { Store } from "vuex";
import { router } from "@/modules";
import { IValueInfo } from "@/user_views/combined";

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

export type Link = IHrefLink | IQueryLink | IActionLink | IQRCodeLink;

export interface IAttrToLinkOpts extends IAttrToQueryOpts {
  defaultTarget?: TargetType;
}

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
  goto: ((query: IQuery) => void);
  link: Link;
  openQRCodeScanner: ((name: string, link: Link) => void);
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
    const action = params.link.action;
    const args = params.link.args;

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
  } else {
    throw new Error("Impossible");
  }
  return { handler, href };
};
