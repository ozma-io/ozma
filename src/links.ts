import { queryLocation, IQueryState, IQuery, attrToRef, IAttrToQueryOpts, attrToRecord, attrObjectToQuery, selfIdArgs, refIdArgs } from "@/state/query";
import { IActionRef } from "ozma-api/src";
import { EventBus, gotoHref } from "@/utils";
import { saveAndRunAction } from "@/state/actions";
import { Store } from "vuex";
import { router } from "@/modules";
import { IValueInfo } from "@/user_views/combined";

export interface IHrefLink {
  href: string;
}

export type TargetType = "top" | "root" | "modal" | "blank" | "modal-auto";

const isTargetType = (rawType: unknown): rawType is TargetType => {
  return rawType === "top" || rawType === "root" || rawType === "modal" || rawType === "blank" || rawType === "modal-auto";
};

export interface IQueryLink {
  query: IQuery;
  target: TargetType;
}

export interface IActionLink {
  action: IActionRef;
  args: Record<string, unknown>;
}

export interface ICompositeLink {
  links: Record<string, Record<string, Link>>;
}

export type Link = IHrefLink | IQueryLink | IActionLink | ICompositeLink;

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

  return { query, target };
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
  return { action, args };
};

export const attrToCompositeLink = (linkedAttr: Record<string, unknown>, opts?: IAttrToLinkOpts): ICompositeLink | null => {
  const compositeLink: ICompositeLink = {
    links: {},
  };

  const linksObj = linkedAttr.links as Record<string, unknown>;
  for (const schema in linksObj) {
    if (linksObj[schema]) {
      const actionObj = linksObj[schema] as Record<string, unknown>;
      for (const name in actionObj) {
        if (actionObj[name]) {
          const link = attrToLink(actionObj[name], opts);
          if (link !== null) {
            if (!compositeLink.links[schema]) {
              compositeLink.links[schema] = {};
            }
            compositeLink.links[schema][name] = link;
          }
        }
      }
    }
  }

  return compositeLink;
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
    return { href };
  }

  const action = attrToActionLink(linkedAttrObj, opts);
  if (action !== null) {
    return action;
  }

  const composite = attrToCompositeLink(linkedAttrObj, opts);
  if (composite !== null) {
    return composite;
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

export const linkHandler = (store: Store<any>, goto: ((query: IQuery) => void), link: Link): ILinkHandler => {
  let handler: () => Promise<void>;
  let href: string | null = null;

  if ("query" in link) {
    if (link.target === "modal") {
      handler = async () => {
        await store.dispatch("query/addWindow", link.query);
      };
    } else if (link.target === "root") {
      // eslint-disable-next-line @typescript-eslint/require-await
      handler = async () => {
        goto(link.query);
      };
    } else if (link.target === "top") {
      handler = async () => {
        await store.dispatch("query/pushRoot", link.query);
      };
    } else if (link.target === "blank") {
      // eslint-disable-next-line @typescript-eslint/require-await
      handler = async () => {
        window.open(href!, "_blank");
      };
    } else if (link.target === "modal-auto") {
      handler = async () => {
        const queryState = store.state.query as IQueryState;
        if (queryState.current?.windows.length === 0) {
          await store.dispatch("query/addWindow", link.query);
        } else {
          goto(link.query);
        }
      };
    } else {
      throw new Error("Impossible");
    }

    href = router.resolve(queryLocation(link.query)).href;
  } else if ("href" in link) {
    const curHref = link.href;
    handler = async () => {
      await gotoHref(curHref);
    };
    href = curHref;
  } else if ("action" in link) {
    handler = async () => {
      const ret = await saveAndRunAction(store, link.action, link.args);
      const retLink = attrToLink(ret.result, { defaultTarget: "root" });
      if (retLink !== null) {
        await linkHandler(store, goto, retLink).handler();
      }
    };
  } else if ("links" in link) {
    // eslint-disable-next-line @typescript-eslint/require-await
    handler = async () => {
      EventBus.$emit("open-qrcode-scanner", link);
    };
  } else {
    throw new Error("Impossible");
  }

  return { handler, href };
};
