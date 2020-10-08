import { LocalUserView } from "@/local_user_view";

export default class LocalEmptyUserView extends LocalUserView<undefined, undefined, undefined> {
  createLocalUserView() {
    return undefined;
  }
  createLocalRow() {
    return undefined;
  }
  createLocalValue() {
    return undefined;
  }
  createAddedLocalValue() {
    return undefined;
  }
  createEmptyLocalRow() {
    return undefined;
  }
  createAddedLocalRow() {
    return undefined;
  }
  createEmptyLocalValue() {
    return undefined;
  }
}
