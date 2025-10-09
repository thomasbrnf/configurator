import { create } from 'zustand';

interface LoaderStore {
  isLoading: boolean;
  loadingMessage: string;
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

export const useLoaderStore = create<LoaderStore>((set) => ({
  isLoading: false,
  loadingMessage: 'Loading...',
  showLoader: (message = 'Loading...') => set({ isLoading: true, loadingMessage: message }),
  hideLoader: () => set({ isLoading: false }),
}));
