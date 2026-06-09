import React from "react";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";
import ConfiguratorHeader from "./ConfiguratorHeader";

const SOFA_IMAGE_SRC = `${import.meta.env.BASE_URL}poster.webp`;

const WelcomeStep: React.FC = () => {
  const { setCurrentStep } = useConfigurator();
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-white z-[1000] overflow-hidden">
      <ConfiguratorHeader showLabel />

      <div className="absolute top-[95px] left-0 right-0 bottom-0 flex">
        {/* Left column: title, subtitle, CTA */}
        <div className="relative z-10 w-1/2 flex flex-col text-start justify-center px-[100px]">
          <h1 className="font-lato font-light text-ui-dark text-[clamp(40px,3.75vw,72px)] leading-[87%] mb-[clamp(12px,1.25vw,24px)]">
            {t.welcome}
          </h1>
          <p className="font-lato font-thin text-ui-dark text-[clamp(22px,2.03vw,39px)] leading-none mb-[clamp(20px,2.08vw,40px)]">
            {t.welcomeSubtitle}
          </p>
          <button
            onClick={() => setCurrentStep("config-type")}
            className="flex items-center bg-white border-[3px] border-ui-dark hover:border-[#D4CCBC] h-[clamp(52px,3.65vw,70px)] w-[clamp(300px,24vw,460px)] cursor-pointer hover:bg-[#D4CCBC]"
          >
            <span className="flex-1 font-lato font-light text-[clamp(16px,1.3vw,25px)] text-black uppercase text-center">
              {t.startConfiguration}
            </span>
            <div className="size-[clamp(52px,3.65vw,70px)] py-[clamp(14px,3.65vw,13px)] shrink-0 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="100%"
                height="100%"
                viewBox="0 0 29 34"
                fill="none"
              >
                <path
                  d="M28.9775 16.7305L2.92525e-06 33.4609L0 0L28.9775 16.7305Z"
                  fill="#454343"
                />
              </svg>{" "}
            </div>
          </button>
        </div>

        {/* Right column: sofa illustration */}
        <div className="relative z-0 w-1/2 right-[58px] overflow-hidden">
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
