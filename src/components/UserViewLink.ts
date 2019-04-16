import Vue from "vue"

import { queryLocation } from "@/state/query"
import { router } from "@/modules"

export default Vue.component("UserViewLink", {
    functional: true,
    props: {
        uv: { type: Object, required: true },
    },
    render: (createElement, context) => {
        return createElement("a", {
            attrs: {
                href: router.resolve(queryLocation(context.props.uv)).href,
            },
            on: {
                click: (e: MouseEvent) => {
                    e.preventDefault()
                    router.push(queryLocation(context.props.uv))
                },
            },
        }, context.children)
    },
})
