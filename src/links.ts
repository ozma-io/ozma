import { IQuery, setIdSelf, setIdRef, attrToRef, IAttrToQueryOpts, attrToRecord, attrObjectToQuery } from "@/state/query";
import { IValueInfo } from "@/state/user_view";
import { IActionRef } from "ozma-api/src";

export interface IHrefLink {
  href: string;
}

export type ITargetType = "top-level" | "root" | "modal";

interface IQueryLink {
  query: IQuery;
  target: ITargetType;
}

interface IActionLink {
  action: IActionRef;
  args: Record<string, any>;
}

export type Link = IHrefLink | IQueryLink | IActionLink;

export interface IAttrToLinkOpts extends IAttrToQueryOpts {
  queryTypeByDefault?: ITargetType;
}

const attrToQueryLink = (linkedAttr: any, opts?: IAttrToLinkOpts): IQueryLink | null => {
  const query = attrObjectToQuery(linkedAttr, opts);
  if (query === null) {
    return null;
  }

  const targetAttr = linkedAttr["target"];
  let target: ITargetType;
  if (targetAttr === "top-level" || targetAttr === "root" || targetAttr === "modal") {
    target = targetAttr;
  } else if (opts?.queryTypeByDefault) {
    target = opts.queryTypeByDefault;
  } else {
    target = "modal";
  }

  return { query, target };
};

export const attrToActionLink = (linkedAttr: any, opts?: IAttrToLinkOpts): IActionLink | null => {
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

export const attrToLink = (linkedAttr: any, opts?: IAttrToLinkOpts): Link | null => {
  if (typeof linkedAttr !== "object" || linkedAttr === null) {
    return null;
  }

  const query = attrToQueryLink(linkedAttr, opts);
  if (query !== null) {
    return query;
  }

  const href = linkedAttr["href"];
  if (typeof href === "string") {
    return { href };
  }

  const action = attrToActionLink(linkedAttr, opts);
  if (action !== null) {
    return action;
  }

  return null;
};

// Set 'id' argument to the value id.
export const attrToLinkSelf = (linkedAttr: any, update?: IValueInfo, opts?: IAttrToLinkOpts): Link | null => {
  if (typeof linkedAttr !== "object") {
    return null;
  }

  const ret = attrToLink(linkedAttr, opts);
  if (ret !== null && update) {
    let args: Record<string, any>
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
export const attrToLinkRef = (linkedAttr: any, value: any, opts?: IAttrToLinkOpts): Link | null => {
  const ret = attrToLink(linkedAttr, opts);
  if (ret !== null && value !== null && value !== undefined) {
    let args: Record<string, any>
    if ("args" in ret) {
      args = ret.args;
    } else if ("query" in ret) {
      args = ret.query.args;
    } else {
      return ret;
    }
    setIdRef(args, value);
  }
  return ret;
};