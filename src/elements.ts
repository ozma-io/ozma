// Dynamic title tag
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
export const setHeadMeta = (name: string, contentString: string) => {
  const metaNode: HTMLMetaElement | null = document.head.querySelector(`meta[name="${name}"]`);
  if (metaNode === null) {
    document.head.insertAdjacentHTML("beforeend", `<meta name="${name}" content="${contentString}">`);
  } else {
    metaNode.content = contentString;
  }
};
