import Vue from "vue";

import { vueEmit } from "@/utils";
import { Link, linkHandler } from "@/links";
import { queryLocation, IQuery } from "@/state/query";

export const redirectClick = (e: MouseEvent, allowControlKeys?: boolean): boolean => {
  // Copied from router-link's guardEvent
  // don't redirect with control keys
  if (!allowControlKeys && (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)) {
    return false;
  }
  // don't redirect when preventDefault called
  if (e.defaultPrevented) {
    return false;
  }
  // don't redirect on right click
  if (e.button !== undefined && e.button !== 0) {
    return false;
  }

  e.preventDefault();
  return true;
};

export default Vue.component("FunLink", {
  functional: true,
  props: {
    link: { type: Object, default: null },
    noHref: { type: Boolean, default: false },
  },
  render: (createElement, context) => {
    const link = context.props.link as Link | null;

    let href: string | null = null;
    let handler: (() => void) | null = null;

    if (link) {
      if ("query" in link) {
        href = context.parent.$router.resolve(queryLocation(link.query)).href;
      } else if ("href" in link) {
        href = link.href;
      }
    }

    const emit = (action: string, query: IQuery) => {
      vueEmit(context, action, query);
    }

    handler = linkHandler(context.parent.$store, emit, link, href);

    const onHandlers = handler === null ? {} : { click: (e: MouseEvent) => {
      if (!redirectClick(e, href === null)) {
        return;
      }
      vueEmit(context, "click");
      handler!();
    } };

    if (!context.props.noHref && href !== null) {
      return createElement("a", {
        ...context.data,
        attrs: {
          href,
        },
        on: onHandlers as any,
      }, context.children);
    } else if (handler !== null) {
      return createElement("span", {
        ...context.data,
        on: onHandlers as any,
      }, context.children);
    } else {
      return context.children;
    }
  },
});
