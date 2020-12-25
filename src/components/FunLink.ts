import Vue from "vue";

import { vueEmit } from "@/utils";
import { Link, linkHandler } from "@/links";
import { IQuery } from "@/state/query";

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

    const emit = (action: string, query: IQuery) => {
      vueEmit(context, action, query);
    };

    if (link === null) {
      return context.children;
    }

    const { handler, href } = linkHandler(context.parent.$store, emit, link);

    const onHandlers = { click: (e: MouseEvent) => {
      if (!redirectClick(e, href === null)) {
        return;
      }
      vueEmit(context, "click");
      void handler();
    } };

    if (!context.props.noHref && href !== null) {
      return createElement("a", {
        ...context.data,
        attrs: {
          href,
        },
        on: onHandlers,
      }, context.children);
    } else {
      return createElement("span", {
        ...context.data,
        on: onHandlers,
      }, context.children);
    }
  },
});
