import Vue from "vue";

import { vueEmit } from "@/utils";
import { queryLocation } from "@/state/query";
import { router } from "@/modules";

export default Vue.component("UserViewLink", {
    functional: true,
    props: {
        uv: { type: Object, required: true },
    },
    render: (createElement, context) => {
        return createElement("a", {
            ...context.data,
            attrs: {
                href: router.resolve(queryLocation(context.props.uv)).href,
            },
            on: {
                click: (e: MouseEvent) => {
                    // Copied from router-link's guardEvent
                    // don't redirect with control keys
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
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
                    if ("click" in context.listeners) {
                        vueEmit(context, "click", context.props.uv);
                    } else {
                        router.push(queryLocation(context.props.uv));
                    }
                },
            },
        }, context.children);
    },
});
