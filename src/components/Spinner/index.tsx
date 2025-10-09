import { useLoaderStore } from '../../store/loaderStore';
import './spinner.css';

const Spinner = () => {
  const { isLoading, loadingMessage } = useLoaderStore();

  if (!isLoading) return null;

  return (
    <div className="spin-loader">
      <div className="spinner"></div>
      <div className="loader-text">{loadingMessage}</div>
    </div>
  );
};

export default Spinner;
