// Dynamic style tag.
const styleNode: HTMLStyleElement | null = document.head.querySelector("style[app-managed]")
if (styleNode === null) {
    throw Error("head.style not found")
}

export const setBodyStyle = (styleString: string) => {
    styleNode.innerHTML = styleString
}

// Dynamic title tag
const titleNode: HTMLTitleElement | null = document.head.querySelector("title[app-managed]")
if (titleNode === null) {
    throw Error("head.title not found")
}

export const setHeadTitle = (titleString: string) => {
    titleNode.text = titleString
}
