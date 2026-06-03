import React from "react";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";

const WelcomeStep: React.FC = () => {
  const { setCurrentStep, setConfigurationType, clearScene } = useConfigurator();
  const { t, language, setLanguage } = useLanguage();

  const handleStartConfiguration = () => {
    clearScene();
    setConfigurationType("complete");
    setCurrentStep("module-selection");
  };

  const toggleLanguage = () => {
    setLanguage(language === "pl" ? "en" : "pl");
  };

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-lg z-[1000] flex items-center justify-center">
      {/* Language Switcher */}
      <button
        onClick={toggleLanguage}
        className="cursor-pointer absolute top-8  px-4 py-2 bg-white/80 hover:bg-white text-black font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200"
      >
        {language === "pl" ? "EN" : " PL"}
      </button>

      <div className="max-w-2xl mx-auto text-center px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-4">
            {t.welcome}
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            {t.welcomeSubtitle}
          </p>
        </div>

        <button
          onClick={handleStartConfiguration}
          className="cursor-pointer inline-flex items-center px-8 py-4 bg-[#06402b] text-white text-lg font-semibold rounded-xl hover:bg-[#06402b]/90 active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <span>{t.startConfiguration}</span>
          <svg
            className="ml-3 w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;
