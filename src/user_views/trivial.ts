import {
  IUserViewHandler,
} from "@/user_views/combined";

export const emptyUserViewHandlerFunctions = {
  updateValue() { },
  updateAddedValue() { },
  updateEmptyValue() { },
  deleteRow() { },
  undeleteRow() { },
  deleteAddedRow() { },
  undeleteAddedRow() { },
  postInitUserView() { },
  postInitRow() { },
  postInitAddedRow() { },
  postInitEmptyRow() { },
  commitAddedRow() { },
};

export const emptyUserViewHandler: IUserViewHandler<undefined, undefined, undefined> = {
  createLocalUserView() {
    return undefined;
  },
  createLocalRow() {
    return undefined;
  },
  createLocalValue() {
    return undefined;
  },
  createAddedLocalValue() {
    return undefined;
  },
  createEmptyLocalRow() {
    return undefined;
  },
  createAddedLocalRow() {
    return undefined;
  },
  createEmptyLocalValue() {
    return undefined;
  },
  ...emptyUserViewHandlerFunctions,
};
