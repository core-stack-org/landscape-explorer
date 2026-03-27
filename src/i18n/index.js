import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import ta from "./locales/ta.json";
import bn from "./locales/bn.json";
import mr from "./locales/mr.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      bn: { translation: bn },
      mr: { translation: mr },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
