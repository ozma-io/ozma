import Vue from "vue";
import { redirectClick } from "ozma-api";

import { vueEmit } from "@/utils";
import { Link, linkHandler, ILinkHandlerParams } from "@/links";
import { IQuery } from "@/state/query";

export default Vue.component("FunLink", {
  functional: true,
  props: {
    link: { type: Object, default: null },
    noHref: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  render: (createElement, context) => {
    const link = context.props.link as Link | null;

    if (link === null) {
      return createElement("span", {
        ...context.data,
      }, context.children);
    }

    const emit = (query: IQuery) => {
      vueEmit(context, "goto", query);
    };

    const openQRCodeScanner = (qrLink: Link) => {
      context.parent.$root.$emit("open-qrcode-scanner", qrLink);
    };

    const linkHandlerParams: ILinkHandlerParams = {
      store: context.parent.$store,
      goto: emit,
      openQRCodeScanner,
      link,
    };

    const handler = linkHandler(linkHandlerParams);

    const onHandlers = { click: (e: MouseEvent) => {
      if (context.props.disabled || !redirectClick(e, handler.href === null)) {
        return;
      }
      e.preventDefault();
      vueEmit(context, "click");
      void handler.handler();
    } };

    if (!context.props.noHref && handler.href !== null) {
      return createElement("a", {
        ...context.data,
        attrs: {
          href: handler.href,
          target: handler.target,
          rel: "noopener",
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
