import { useEffect, useState } from "react";
import { useLoaderStore } from "../../store/loaderStore";
import { useLanguage } from "../../context/LanguageContext";
import "./spinner.css";

const Spinner = () => {
  const { isLoading, loadingMessage } = useLoaderStore();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(isLoading);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setFadeOut(false);
      setVisible(true);
    } else if (visible) {
      setFadeOut(true);
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!visible) return null;

  const messageMap: Record<string, string> = {
    "Ładowanie...": t.loading,
  };

  const label = messageMap[loadingMessage] ?? loadingMessage;

  return (
    <div className={`sp-overlay${fadeOut ? " sp-fade-out" : ""}`}>
      <div className="sp-box">
        <p className="sp-message">{label}</p>
        <div className="sp-bar-track">
          <div className="sp-bar-indeterminate" />
        </div>
      </div>
    </div>
  );
};

export default Spinner;
