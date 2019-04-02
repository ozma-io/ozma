// Dynamic title tag
const titleNode: HTMLTitleElement | null = document.head.querySelector("title[app-managed]")
if (titleNode === null) {
    throw Error("head.title not found")
}

export const setHeadTitle = (titleString: string) => {
    titleNode.text = titleString
}
