import Vue from "vue";

export interface IModalTab {
  title: string;
  order?: number;
  content: any;
  uid: string;
}

export interface IModalTabsProp {
  [key: number]: IModalTab;
}
