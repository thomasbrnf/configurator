import { useLoaderStore } from '../../store/loaderStore';
import { useLanguage } from '../../context/LanguageContext';
import './spinner.css';

const Spinner = () => {
  const { isLoading, loadingMessage } = useLoaderStore();
  const { language } = useLanguage();

  if (!isLoading) return null;

  // Map Polish messages to English
  const translateMessage = (message: string) => {
    if (language === 'en') {
      const translations: Record<string, string> = {
        'Ładowanie obiektu...': 'Loading object...',
        'Ładowanie materiału...': 'Loading material...',
        'Zmienianie materiału...': 'Changing material...',
        'Ładowanie...': 'Loading...',
      };
      return translations[message] || message;
    }
    return message;
  };

  return (
    <div className="spin-loader">
      <div className="spinner"></div>
      <div className="loader-text">{translateMessage(loadingMessage)}</div>
    </div>
  );
};

export default Spinner;
