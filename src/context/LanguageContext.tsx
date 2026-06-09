import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type Language = "pl" | "en";

interface Translations {
  // Controls Info
  controls: string;
  clickToSelect: string;
  mouseWheelZoom: string;
  dragToRotate: string;
  recenterCamera: string;

  // Configurator
  welcome: string;
  welcomeSubtitle: string;
  startConfiguration: string;
  chooseConfigType: string;
  configTypeSubtitle: string;
  completeSets: string;
  completeSetsDesc: string;
  modules: string;
  modulesDesc: string;
  selectModules: string;
  selectModulesSubtitle: string;
  addToScene: string;
  backToMenu: string;
  back: string;
  close: string;

  // Module Selection
  selectCompleteSet: string;
  selectCompleteSetSubtitle: string;
  clickToSelect2: string;
  alreadyInScene: string;
  selectModulesMultiple: string;
  buildOwnConfiguration: string;
  clearSelection: string;
  selected: string;
  modulesCount: string;

  // Control Panel
  controlPanel: string;
  materials: string;
  club: string;
  granit: string;
  addObject: string;
  changeConfigType: string;
  addModule: string;
  addCompleteSet: string;
  material: string;

  // Header
  sofaConfigurator: string;

  // Buttons
  recenter: string;

  // Breadcrumbs
  home: string;
  moduleSelect: string;
  editor: string;

  // Context Menu
  delete: string;
  rotate: string;

  // Rotation Control
  finishRotation: string;

  // Loader
  loadingObject: string;
  loadingMaterial: string;
  changingMaterial: string;
  loading: string;

  // Complete Set Names
  "Sofa 1": string;
  "Sofa 2": string;
  "Sofa 3": string;
  "Sofa 4": string;
}

const translations: Record<Language, Translations> = {
  pl: {
    // Controls Info
    controls: "Sterowanie",
    clickToSelect: "Kliknij obiekt, aby zaznaczyć",
    mouseWheelZoom: "Kółko myszy – przybliż/oddal",
    dragToRotate: "Przeciągnij w pustym miejscu – obróć kamerę",
    recenterCamera: "Wyśrodkuj kamerę",

    // Configurator
    welcome: "Witamy w konfiguratorze",
    welcomeSubtitle: "Zaprojektuj swoją wymarzoną sofę",
    startConfiguration: "Rozpocznij Konfigurację",
    chooseConfigType: "Jak chciałbyś skonfigurować \n swoją sofę?",
    configTypeSubtitle: "Jak chciałbyś skonfigurować swoją sofę?",
    completeSets: "Zestawy",
    completeSetsDesc: "Wybierz gotowe rozwiązanie",
    modules: "Moduły",
    modulesDesc: "Zaprojektuj swój układ",
    selectModules: "Wybierz Moduły",
    selectModulesSubtitle: "Wybierz moduły, które chcesz dodać do swojej sofy",
    addToScene: "STWÓRZ SOFE",
    backToMenu: "Wróć do Menu",
    back: "Wstecz",
    close: "Zamknij",

    // Module Selection
    selectCompleteSet: "Wybierz Kompletny Zestaw",
    selectCompleteSetSubtitle: "Wybierz jeden z gotowych zestawów mebli",
    clickToSelect2: "Kliknij, aby wybrać",
    alreadyInScene: "Już dodany do sceny",
    selectModulesMultiple: "Zbuduj własną konfigurację, wybierając poszczególne moduły",
    buildOwnConfiguration:
      "Zbuduj własną konfigurację wybierając poszczególne moduły",
    clearSelection: "Wyczyść wybór",
    selected: "Wybrano",
    modulesCount: "modułów",

    // Control Panel
    controlPanel: "Panel Sterowania",
    materials: "Materiały",
    club: "Club",
    granit: "Granit",
    addObject: "Dodaj Obiekt",
    changeConfigType: "Typ Konfiguracji",
    addModule: "Dodaj Moduł",
    addCompleteSet: "Dodaj Zestaw",
    material: "Materiał",

    // Header
    sofaConfigurator: "Sofa Konfigurator",

    // Buttons
    recenter: "Wyśrodkuj",

    // Breadcrumbs
    home: "Start",
    moduleSelect: "Wybór modułów",
    editor: "Edytor",

    // Context Menu
    delete: "Usuń",
    rotate: "Obróć",

    // Rotation Control
    finishRotation: "Zakończ Obracanie",

    // Loader
    loadingObject: "Ładowanie obiektu...",
    loadingMaterial: "Ładowanie materiału...",
    changingMaterial: "Zmienianie materiału...",
    loading: "Ładowanie...",

    // Complete Set Names
    "Sofa 1": "Kompletna Sofa",
    "Sofa 2": "Kompletna Sofa 2",
    "Sofa 3": "Kompletna Sofa 3",
    "Sofa 4": "Kompletna Sofa 4",
  },
  en: {
    // Controls Info
    controls: "Controls",
    clickToSelect: "Click object to select",
    mouseWheelZoom: "Mouse wheel – zoom in/out",
    dragToRotate: "Drag in empty space – rotate camera",
    recenterCamera: "Recenter Camera",

    // Header
    sofaConfigurator: "Sofa Configurator",

    // Configurator
    welcome: "Welcome to the configurator",
    welcomeSubtitle: "Design your dream sofa",
    startConfiguration: "Start Configuration",
    chooseConfigType: "How would you like to configure \n your sofa?",
    configTypeSubtitle: "How would you like to configure your sofa?",
    completeSets: "Complete Sets",
    completeSetsDesc: "Choose a ready-made solution",
    modules: "Modules",
    modulesDesc: "Design your own layout",
    selectModules: "Select Modules",
    selectModulesSubtitle: "Choose modules to add to your sofa",
    addToScene: "CREATE SOFA",
    backToMenu: "Back to Menu",
    back: "Back",
    close: "Close",

    // Module Selection
    selectCompleteSet: "Select Complete Set",
    selectCompleteSetSubtitle: "Choose one of the ready-made furniture sets",
    clickToSelect2: "Click to select",
    alreadyInScene: "Already in scene",
    selectModulesMultiple: "Build your own configuration by selecting individual modules",
    buildOwnConfiguration:
      "Build your own configuration by selecting individual modules",
    clearSelection: "Clear selection",
    selected: "Selected",
    modulesCount: "modules",

    // Control Panel
    controlPanel: "Control Panel",
    materials: "Materials",
    club: "Club",
    granit: "Granit",
    addObject: "Add Object",
    changeConfigType: "Configuration Type",
    addModule: "Add Module",
    addCompleteSet: "Add Set",
    material: "Material",

    // Buttons
    recenter: "Recenter",

    // Breadcrumbs
    home: "Home",
    moduleSelect: "Module Select",
    editor: "Editor",

    // Context Menu
    delete: "Delete",
    rotate: "Rotate",

    // Rotation Control
    finishRotation: "Finish Rotation",

    // Loader
    loadingObject: "Loading object...",
    loadingMaterial: "Loading material...",
    changingMaterial: "Changing material...",
    loading: "Loading...",

    // Complete Set Names
    "Sofa 1": "Sofa 1",
    "Sofa 2": "Sofa 2",
    "Sofa 3": "Sofa 3",
    "Sofa 4": "Sofa 4",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Initialize language from localStorage, fallback to "pl"
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem("configurator-language");
    return savedLanguage === "pl" || savedLanguage === "en"
      ? savedLanguage
      : "pl";
  });

  // Update localStorage whenever language changes
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("configurator-language", lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
