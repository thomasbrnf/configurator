import React from "react";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";

const WelcomeStep: React.FC = () => {
  const { setCurrentStep } = useConfigurator();
  const { t, language, setLanguage } = useLanguage();

  const handleStartConfiguration = () => {
    setCurrentStep("config-type");
  };

  const toggleLanguage = () => {
    setLanguage(language === "pl" ? "en" : "pl");
  };

  const BASE = import.meta.env.BASE_URL;

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-lg z-[1000] flex flex-col">
      {/* Language Switcher — top right corner */}
      <button
        onClick={toggleLanguage}
        className="cursor-pointer absolute top-8 right-8 px-4 py-2 bg-white/80 hover:bg-white text-black font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200 z-10"
      >
        {language === "pl" ? "EN" : "PL"}
      </button>

      <div className="flex-1 flex flex-col lg:flex-row items-center">
        {/* Left — welcome content */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16">
          <div className="max-w-xl text-center lg:text-left">
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

        {/* Right — preview image */}
        <div className="flex-[2.4] flex items-center justify-center px-2 lg:px-4 py-2">
          <img
            src={`${BASE}Dull Preview from Onvirtue.webp`}
            alt={t.welcome}
            className="w-full max-h-[98vh] object-contain rounded-2xl "
          />
        </div>
      </div>
    </div>
  );
};

export default WelcomeStep;
