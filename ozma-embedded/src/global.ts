import * as Index from "./index";
import { IHrefLinkOpts, Link } from "./types";

/* eslint-disable vars-on-top, no-var */

declare global {
  var Ozma: Index.OzmaEmbeddedClient;
  var OzmaEmbeddedError: typeof Index.OzmaEmbeddedError;

  function hrefClick(opts?: IHrefLinkOpts | Link): (event: MouseEvent) => void;
  function hrefClick(event: MouseEvent): void;
}

const Ozma = new Index.OzmaEmbeddedClient();

export default Ozma;

window.Ozma = Ozma;
window.OzmaEmbeddedError = Index.OzmaEmbeddedError;