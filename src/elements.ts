// Dynamic title and meta tags
if (document.head === null) {
  throw new Error("head not found");
}

export const setHeadTitle = (titleString: string) => {
  const titleNode: HTMLTitleElement | null = document.head.querySelector("title[app-managed]");
  if (titleNode === null) {
    document.head.insertAdjacentHTML("afterbegin", `<title app-managed>${titleString}</title>`);
  } else {
    titleNode.text = titleString;
  }
};
export const setHeadMeta = (paramKey: string, paramValue: string, contentString: string) => {
  const metaNode: HTMLMetaElement | null = document.head.querySelector(`meta[${paramKey}="${paramValue}"]`);
  if (metaNode === null) {
    document.head.insertAdjacentHTML("beforeend", `<meta ${paramKey}="${paramValue}" content="${contentString}">`);
  } else {
    metaNode.content = contentString;
  }
};
