import React from "react";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";

const ConfigTypeStep: React.FC = () => {
  const { setCurrentStep, setConfigurationType } = useConfigurator();
  const { t } = useLanguage();

  const handleCompleteSetSelection = () => {
    setConfigurationType("complete");
    setCurrentStep("module-selection");
  };

  const handleModuleSelection = () => {
    setConfigurationType("modules");
    setCurrentStep("module-selection");
  };

  const handleBack = () => {
    setCurrentStep("welcome");
  };

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-lg z-[1000] flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center px-8">
        <button
          onClick={handleBack}
          className="cursor-pointer absolute top-8 left-8 flex items-center px-4 py-2 text-black hover:bg-[#06402b]/10 rounded-lg transition-colors duration-200"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Wstecz
        </button>

        <div className="mb-12">
          <h1 className="text-3xl font-bold text-black mb-4">
            {t.chooseConfigType}
          </h1>
          <p className="text-lg text-gray-600">
            {t.configTypeSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Complete Set Option */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 hover:border-[#06402b]/40 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden group">
            <div className="p-8 h-full flex flex-col justify-between items-stretch">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#06402b] to-[#0a5a38] rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t.completeSets}
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {t.completeSetsDesc}
              </p>
              <button
                onClick={handleCompleteSetSelection}
                className="mt-auto cursor-pointer w-full px-6 py-3 bg-[#06402b] text-white font-semibold rounded-lg hover:bg-[#06402b]/90 active:scale-[0.98] transition-all duration-200"
              >
                {t.completeSets}
              </button>
            </div>
          </div>

          {/* Module Selection Option */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 hover:border-[#06402b]/40 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden group">
            <div className="p-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#06402b] to-[#0a5a38] rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t.modules}
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {t.modulesDesc}
              </p>
              <button
                onClick={handleModuleSelection}
                className="cursor-pointer w-full px-6 py-3 bg-[#06402b] text-white font-semibold rounded-lg hover:bg-[#06402b]/90 active:scale-[0.98] transition-all duration-200"
              >
                {t.modules}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigTypeStep;
