// Dynamic style tag.
const styleNode = document.createElement("style")
document.body.appendChild(styleNode)

export const setBodyStyle = (styleString: string) => {
    styleNode.innerHTML = styleString
}
