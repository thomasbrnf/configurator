import React from "react";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";
import ConfiguratorHeader from "./ConfiguratorHeader";

const SOFA_IMAGE_SRC = `${import.meta.env.BASE_URL}poster.png`;

const WelcomeStep: React.FC = () => {
  const { setCurrentStep } = useConfigurator();
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-white z-[1000] overflow-hidden">
      <ConfiguratorHeader showLabel />

      <div className="absolute top-[95px] left-0 right-0 bottom-0 flex">
        {/* Left column: title, subtitle, CTA */}
        <div className="w-1/2 flex flex-col text-start justify-center pl-[130px] pr-8">
          <h1 className="font-lato font-light text-ui-dark text-[72px] leading-[87%] mb-6 w-[580px]">
            {t.welcome}
          </h1>
          <p className="font-lato font-thin text-ui-dark text-[39px] leading-none mb-10 w-[580px]">
            {t.welcomeSubtitle}
          </p>
          <button
            onClick={() => setCurrentStep("config-type")}
            className="flex items-center bg-white border-[3px] border-ui-dark hover:border-[#D4CCBC] h-[70px] w-[460px] cursor-pointer hover:bg-[#D4CCBC] "
          >
            <span className="flex-1 font-lato font-light text-[25px] text-black uppercase text-center">
              {t.startConfiguration}
            </span>
            <div className="size-[70px] shrink-0 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="29"
                height="34"
                viewBox="0 0 29 34"
                fill="none"
              >
                <path
                  d="M28.9775 16.7305L2.92525e-06 33.4609L0 0L28.9775 16.7305Z"
                  fill="black"
                />
              </svg>{" "}
            </div>
          </button>
        </div>

        {/* Right column: sofa illustration */}
        <div className="w-1/2 relative -ml-20 overflow-hidden">
          <img
            src={SOFA_IMAGE_SRC}
            alt="Sofa preview"
            className="absolute object-contain"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default WelcomeStep;
