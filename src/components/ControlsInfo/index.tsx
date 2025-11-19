import { useLanguage } from "../../context/LanguageContext";
import { useEffect } from "react";

interface ControlsInfoProps {
  onRecenter?: () => void;
  isAutoCenterEnabled?: boolean;
  onToggleAutoCenter?: (enabled: boolean) => void;
}

const ControlsInfo = ({ onRecenter, isAutoCenterEnabled = true, onToggleAutoCenter }: ControlsInfoProps) => {
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    if (onToggleAutoCenter) {
      onToggleAutoCenter(true);
           if (onRecenter) {
      onRecenter();
    }

    }
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === "pl" ? "en" : "pl");
  };

  const toggleAutoCenter = () => {
    if (onToggleAutoCenter) {
      onToggleAutoCenter(!isAutoCenterEnabled);
    }
    // Also trigger recenter when toggling
    if (onRecenter) {
      onRecenter();
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {/* Language Switcher */}
      <button
        onClick={toggleLanguage}
        className="w-10 h-10 bg-white border border-[#06402b]/20 hover:bg-[#06402b]/5 hover:border-[#06402b]/40 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-300 shadow-lg"
        title={language === "pl" ? "Switch to English" : "Przełącz na Polski"}
      >
        <span className="text-xs font-bold text-[#06402b]">{language.toUpperCase()}</span>
      </button>

      <div className="flex items-center gap-3">
        <div className="relative group/info">
          <div className="w-10 h-10 bg-[#06402b] rounded-full flex items-center justify-center cursor-pointer group-hover/info:scale-110 transition-all duration-300 shadow-lg">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div className="absolute bottom-12 left-0 w-80 opacity-0 group-hover/info:opacity-100 translate-y-2 group-hover/info:translate-y-0 transition-all duration-300 pointer-events-none group-hover/info:pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-xl border border-[#06402b]/15 rounded-xl shadow-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-4 h-4 text-black/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <strong className="text-xs font-semibold text-black uppercase tracking-wide">
                  {t.controls}
                </strong>
              </div>
              <div className="space-y-2 text-xs text-black/70 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-black/40 text-[10px] mt-0.5">●</span>
                  <span>{t.clickToSelect}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-black/40 text-[10px] mt-0.5">●</span>
                  <span>{t.mouseWheelZoom}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-black/40 text-[10px] mt-0.5">●</span>
                  <span>{t.dragToRotate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {onRecenter && (
          <button
            onClick={toggleAutoCenter}
            className={`w-auto h-10 px-3 border rounded-full flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all duration-300 shadow-lg ${
              isAutoCenterEnabled 
                ? 'bg-[#06402b] border-[#06402b] text-white hover:bg-[#06402b]/90' 
                : 'bg-white border-[#06402b]/20 text-[#06402b]/60 hover:bg-[#06402b]/5 hover:border-[#06402b]/40'
            }`}
            title={isAutoCenterEnabled ? t.recenterCamera : t.recenterCamera}
          >
            <svg
              className="w-5 h-5"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20.5 8.74999V5.49999H17.25V3.67499H20.35C20.8834 3.67499 21.3459 3.87082 21.7375 4.26249C22.1292 4.65415 22.3251 5.11665 22.3251 5.64999V8.74999H20.5ZM1.67505 8.74999V5.64999C1.67505 5.11665 1.87088 4.65415 2.26255 4.26249C2.65422 3.87082 3.11672 3.67499 3.65005 3.67499H6.75005V5.49999H3.50005V8.74999H1.67505ZM17.25 20.325V18.5H20.5V15.25H22.3251V18.35C22.3251 18.8833 22.1292 19.3458 21.7375 19.7375C21.3459 20.1292 20.8834 20.325 20.35 20.325H17.25ZM3.65005 20.325C3.11672 20.325 2.65422 20.1292 2.26255 19.7375C1.87088 19.3458 1.67505 18.8833 1.67505 18.35V15.25H3.50005V18.5H6.75005V20.325H3.65005ZM5.00005 17V6.99999H19V17H5.00005ZM6.82505 15.175H17.175V8.82499H6.82505V15.175ZM6.82505 15.175V8.82499V15.175Z"
                fill="currentColor"
              />
            </svg>
            <span className="text-xs font-bold whitespace-nowrap">
              {isAutoCenterEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
export default ControlsInfo;
