import { create } from "zustand";

function sessionHasSceneObjects(): boolean {
  try {
    const step = sessionStorage.getItem("cfg_step");
    const objects = sessionStorage.getItem("cfg_sceneObjects");
    if (!step || !objects) return false;
    const parsedStep = JSON.parse(step);
    const parsedObjects = JSON.parse(objects);
    return parsedStep === "scene" && Array.isArray(parsedObjects) && parsedObjects.length > 0;
  } catch {
    return false;
  }
}

interface LoaderStore {
  isLoading: boolean;
  loadingMessage: string;
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

export const useLoaderStore = create<LoaderStore>((set) => ({
  isLoading: sessionHasSceneObjects(),
  loadingMessage: "Ładowanie...",
  showLoader: (message = "Ładowanie...") =>
    set({ isLoading: true, loadingMessage: message }),
  hideLoader: () => set({ isLoading: false }),
}));
