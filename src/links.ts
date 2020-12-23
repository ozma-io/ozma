import { queryLocation, IQueryState, IQuery, setIdSelf, setIdRef, attrToRef, IAttrToQueryOpts, attrToRecord, attrObjectToQuery } from "@/state/query";
import { IValueInfo } from "@/state/user_view";
import { IActionRef } from "ozma-api/src";
import { RenderContext } from "vue";
import { vueEmit } from "@/utils";
import { saveAndRunAction } from "@/state/actions";
import { Store } from "vuex";
import { router } from "@/modules";

export interface IHrefLink {
  href: string;
}

export type ITargetType = "top" | "root" | "modal" | "blank" | "modal-auto";

export interface IQueryLink {
  query: IQuery;
  target: ITargetType;
}

export interface IActionLink {
  action: IActionRef;
  args: Record<string, unknown>;
}

export type Link = IHrefLink | IQueryLink | IActionLink;

export interface IAttrToLinkOpts extends IAttrToQueryOpts {
  queryTypeByDefault?: ITargetType;
}

const attrToQueryLink = (linkedAttr: Record<string, unknown>, opts?: IAttrToLinkOpts): IQueryLink | null => {
  const query = attrObjectToQuery(linkedAttr, opts);
  if (query === null) {
    return null;
  }

  const targetAttr = linkedAttr["target"];
  let target: ITargetType;
  if (targetAttr === "top" || targetAttr === "root" || targetAttr === "modal" || targetAttr === "blank" || targetAttr === "modal-auto") {
    target = targetAttr;
  } else if (opts?.queryTypeByDefault) {
    target = opts.queryTypeByDefault;
  } else {
    target = "modal-auto";
  }

  return { query, target };
};

export const attrToActionLink = (linkedAttr: Record<string, unknown>, opts?: IAttrToLinkOpts): IActionLink | null => {
  if (typeof linkedAttr["action"] !== "object") {
    return null;
  }
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

  return null;
};

// Set 'id' argument to the value id.
export const attrToLinkSelf = (linkedAttr: unknown, update?: IValueInfo, opts?: IAttrToLinkOpts): Link | null => {
  if (typeof linkedAttr !== "object") {
    return null;
  }

  const ret = attrToLink(linkedAttr, opts);
  if (ret !== null && update) {
    let args: Record<string, unknown>;
    if ("args" in ret) {
      args = ret.args;
    } else if ("query" in ret && ret.query.args.args) {
      args = ret.query.args.args;
    } else {
      return ret;
    }
    setIdSelf(args, update);
  }
  return ret;
};

// Set 'id' argument to the id of the referenced value.
export const attrToLinkRef = (linkedAttr: unknown, value: unknown, opts?: IAttrToLinkOpts): Link | null => {
  const ret = attrToLink(linkedAttr, opts);
  if (ret !== null && value !== null && value !== undefined) {
    let args: Record<string, unknown>;
    if ("args" in ret) {
      args = ret.args;
    } else if ("query" in ret && ret.query.args.args) {
      args = ret.query.args.args;
    } else {
      return ret;
    }
    setIdRef(args, value);
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
  handler: (() => void) | null;
  href: string | null;
}

export const linkHandler = (store: Store<any>, emit: ((action: string, query: IQuery) => void), link: Link | null): ILinkHandler => {
  let handler: (() => void) | null = null;
  let href: string | null = null;

  if (link) {
    if ("query" in link) {
      href = router.resolve(queryLocation(link.query)).href;
    } else if ("href" in link) {
      href = link.href;
    }
  }

  if (link) {
    if ("query" in link) {
      if (link.target === "modal") {
        handler = () => {
          void store.dispatch("query/addWindow", link.query);
        };
      } else if (link.target === "root") {
        handler = () => {
          emit("goto", link.query);
        };
      } else if (link.target === "top") {
        handler = () => {
          void store.dispatch("query/pushRoot", link.query);
        };
      } else if (link.target === "blank") {
        handler = () => {
          window.open(href!, "_blank");
        };
      } else if (link.target === "modal-auto") {
        handler = () => {
          const queryState = store.state.query as IQueryState;
          if (queryState.current?.windows.length === 0) {
            void store.dispatch("query/addWindow", link.query);
          } else {
            emit("goto", link.query);
          }
        };
      } else {
        throw new Error("Impossible");
      }
    } else if ("action" in link) {
      handler = () => {
        void saveAndRunAction(store, link.action, link.args);
      };
    }
  }

  return { handler, href };
};
