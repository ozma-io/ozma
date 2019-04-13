// Dynamic title tag
if (document.head === null) {
    throw Error("head not found")
}
const titleNode: HTMLTitleElement | null = document.head.querySelector("title[app-managed]")
if (titleNode === null) {
    throw Error("head.title not found")
}

export const setHeadTitle = (titleString: string) => {
    titleNode.text = titleString
}
