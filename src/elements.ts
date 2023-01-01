// Dynamic title tag
if (document.head === null) {
  throw new Error("head not found");
}
const titleNode: HTMLTitleElement | null = document.head.querySelector("title[app-managed]");
if (titleNode === null) {
  throw new Error("head.title not found");
}
const descriptionNode: HTMLMetaElement | null = document.head.querySelector("meta[name=\"description\"]");
if (descriptionNode === null) {
  throw new Error("head.description not found");
}

export const setHeadTitle = (titleString: string) => {
  titleNode.text = titleString;
};
export const setHeadDescription = (descriptionString: string) => {
  descriptionNode.content = descriptionString;
};
