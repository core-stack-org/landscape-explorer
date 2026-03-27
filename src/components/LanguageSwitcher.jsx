import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "EN", name: "English" },
  { code: "hi", label: "हि", name: "हिन्दी" },
  { code: "ta", label: "த", name: "தமிழ்" },
  { code: "bn", label: "বাং", name: "বাংলা" },
  { code: "mr", label: "म", name: "मराठी" },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-1 border border-purple-200 rounded-lg overflow-hidden">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          title={lang.name}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`px-3 py-2 text-sm font-medium transition-colors duration-150 ${
            i18n.language === lang.code
              ? "bg-purple-600 text-white"
              : "text-purple-700 hover:bg-purple-50"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
