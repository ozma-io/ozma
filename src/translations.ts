import Vue from "vue";
import { z } from "zod";

import { i18n } from "./modules";

const userString = z.union([z.string(), z.record(z.string(), z.string())]);

export type Language = string;

export interface ITranslatedString {
  default: Language;
  strings: Record<Language, string>;
}

export type UserString = string | ITranslatedString;

export const translateUserString = (str: UserString): string => {
  if (typeof str === "string") {
    return str;
  } else {
    const currentLocale = i18n.locale;
    if (currentLocale in str.strings) {
      return str.strings[currentLocale];
    } else {
      return str.default;
    }
  }
};

Vue.mixin({
  methods: {
    $ust: translateUserString,
  },
});

declare module "vue/types/vue" {
  // eslint-disable-next-line no-shadow
  interface Vue {
    $ust: (str: UserString) => string;
  }
}

export const rawToUserString = (raw: unknown): UserString | null => {
  const ret = userString.safeParse(raw);
  if (!ret.success) {
    return null;
  } else if (typeof ret.data === "string") {
    return ret.data;
  } else {
    let defaultLang: Language | undefined;
    if ("default" in ret.data) {
      const defLang = ret.data["default"];
      if (defLang in ret.data) {
        delete ret.data[defLang];
        defaultLang = defLang;
      }
    }
    if ("en" in ret.data) {
      defaultLang = "en";
    }
    const variants = Object.keys(ret.data);
    if (variants.length === 1) {
      defaultLang = variants[0];
    }

    if (defaultLang) {
      return {
        default: defaultLang,
        strings: ret.data,
      };
    } else {
      return null;
    }
  }
};
