import React from "react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-white shadow-2xl">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-center items-center">
        <p className="text-center text-sm sm:text-base md:text-lg font-semibold text-gray-800 leading-relaxed">
          {t("footer.copyright")}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
