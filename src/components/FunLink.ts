import Vue from "vue";

import { vueEmit } from "@/utils";
import { queryLocation, IQueryState } from "@/state/query";
import { Link } from "@/links";
import { RawLocation } from "vue-router";
import { saveAndRunAction } from "@/state/actions";

export default Vue.component("FunLink", {
  functional: true,
  props: {
    link: { type: Object },
  },
  render: (createElement, context) => {
    const link = context.props.link as Link | undefined;

    let href: string | null = null;
    let handler: (() => void) | null = null;

    if (link) {
      if ("query" in link) {
        href = context.parent.$router.resolve(queryLocation(link.query)).href;
      } else if ("href" in link) {
        href = link.href;
      }

      if ("query" in link) {
        if (link.target === "modal") {
          handler = () => {
            context.parent.$store.dispatch("query/addWindow", link.query);
          };
        } else if (link.target === "root") {
          handler = () => {
            vueEmit(context, "goto", link.query);
          };
        } else if (link.target === "top") {
          handler = () => {
            context.parent.$store.dispatch("query/pushRoot", link.query);
          };
        } else if (link.target === "blank") {
          handler = () => {
            window.open(href!, '_blank');
          };
        } else if (link.target === "modal-auto") {
          handler = () => {
            const queryState = context.parent.$store.state.query as IQueryState;
            if (queryState.current?.windows.length === 0) {
              context.parent.$store.dispatch("query/addWindow", link.query);
            } else {
              vueEmit(context, "goto", link.query);
            }
          }
        }
      } else if ("action" in link) {
        handler = () => {
          saveAndRunAction(context.parent.$store, link.action, link.args);
        };
      }
    }

    const onHandlers = handler === null ? {} : { click: (e: MouseEvent) => {
      // Copied from router-link's guardEvent
      // don't redirect with control keys
      if (href !== null && (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)) {
        return;
      }
      // don't redirect when preventDefault called
      if (e.defaultPrevented) {
        return;
      }
      // don't redirect on right click
      if (e.button !== undefined && e.button !== 0) {
        return;
      }

      e.preventDefault();
      vueEmit(context, "click");
      handler!();
    } };

    if (href !== null) {
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
