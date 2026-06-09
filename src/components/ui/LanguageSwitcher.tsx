import React from "react";
import { useLanguage } from "../../context/LanguageContext";

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const toggle = () => setLanguage(language === "pl" ? "en" : "pl");

  return (
    <button
      onClick={toggle}
      className="shrink-0 flex h-[30px] w-[100px] border-2 border-ui-mid overflow-hidden cursor-pointer"
      aria-label="Switch language"
    >
      <div
        className={`flex-1 flex items-center justify-center text-[15px] font-lato font-bold transition-colors ${language === "pl" ? "bg-ui-mid text-white" : "bg-white text-ui-mid"}`}
      >
        PL
      </div>
      <div
        className={`flex-1 flex items-center justify-center text-[15px] font-lato font-normal transition-colors ${language === "en" ? "bg-ui-mid text-white" : "bg-white text-ui-mid"}`}
      >
        EN
      </div>
    </button>
  );
};

export default LanguageSwitcher;
