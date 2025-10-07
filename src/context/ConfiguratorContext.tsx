import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type ConfigurationStep = 'welcome' | 'config-type' | 'module-selection' | 'scene';
export type ConfigurationType = 'complete' | 'modules' | null;

export interface ModuleDefinition {
  id: string;
  name: string;
  displayName: string;
  modelPath: string;
  thumbnail?: string;
  category?: string;
}

export interface CompleteSetDefinition {
  id: string;
  name: string;
  displayName: string;
  modelPath: string;
  thumbnail?: string;
}

// Available models based on the GLB files provided
export const availableModules: ModuleDefinition[] = [
  {
    id: "1-80-bb",
    name: "[1(80)BB]",
    displayName: "[1(80)BB]",
    modelPath: "/models/[1(80)BB].glb",
  },
  {
    id: "1-80-l",
    name: "[1(80)L]",
    displayName: "[1(80)L]",
    modelPath: "/models/[1(80)L].glb",
  },
  {
    id: "1-80-p",
    name: "[1(80)P]",
    displayName: "[1(80)P]",
    modelPath: "/models/gala_collezione_KARATO [1(80)P].glb",
  },
  {
    id: "1d-5-sl",
    name: "[1D(5)SL]",
    displayName: "[1D(5)SL]",
    modelPath: "/models/[1D(5)SL].glb",
  },
  {
    id: "1d-5-sp",
    name: "[1D(5)SP]",
    displayName: "[1D(5)SP]",
    modelPath: "/models/gala_collezione_KARATO [1D(5)SP].glb",
  },
  {
    id: "3qf-bb",
    name: "[3QFBB]",
    displayName: "[3QFBB]",
    modelPath: "/models/gala_collezione_KARATO [3QFBB].glb",
  },
  {
    id: "3qf-l",
    name: "[3QFL]",
    displayName: "[3QFL]",
    modelPath: "/models/gala_collezione_KARATO [3QFL].glb",
  },
  {
    id: "3qf-p",
    name: "[3QFP]",
    displayName: "[3QFP]",
    modelPath: "/models/gala_collezione_KARATO [3QFP].glb",
  },
  {
    id: "en-2",
    name: "[EN(2)]",
    displayName: "[EN(2)]",
    modelPath: "/models/gala_collezione_KARATO [EN(2)].glb",
  },
  {
    id: "poduszka",
    name: "[PODUSZKA]",
    displayName: "[PODUSZKA]",
    modelPath: "/models/gala_collezione_KARATO [PODUSZKA].glb",
  },
];

export const availableCompleteSets: CompleteSetDefinition[] = [
  {
    id: "complete-sofa-1",
    name: "Complete Sofa",
    displayName: "Kompletna Sofa",
    modelPath: "/models/complete sofa.glb",
  },
  {
    id: "complete-sofa-2",
    name: "Complete Sofa 2",
    displayName: "Kompletna Sofa 2",
    modelPath: "/models/complete sofa 2.glb",
  },
  {
    id: "complete-sofa-3",
    name: "Complete Sofa 3",
    displayName: "Kompletna Sofa 3",
    modelPath: "/models/complete sofa 3.glb",
  },
];

interface ConfiguratorContextType {
  // Step management
  currentStep: ConfigurationStep;
  setCurrentStep: (step: ConfigurationStep) => void;
  
  // Configuration type
  configurationType: ConfigurationType;
  setConfigurationType: (type: ConfigurationType) => void;
  
  // Module selection (for modular configuration)
  selectedModules: Set<string>;
  toggleModule: (moduleId: string) => void;
  clearModules: () => void;
  addModulesToScene: () => void;
  
  // Complete set selection
  selectedCompleteSet: string | null;
  setSelectedCompleteSet: (setId: string | null) => void;
  
  // Scene objects (what's currently displayed)
  sceneObjects: string[];
  addObjectToScene: (objectId: string) => void;
  removeObjectFromScene: (objectId: string) => void;
  clearScene: () => void;
  
  // Reset configurator
  resetConfigurator: () => void;
}

const ConfiguratorContext = createContext<ConfiguratorContextType | undefined>(
  undefined,
);

export const ConfiguratorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentStep, setCurrentStep] = useState<ConfigurationStep>('welcome');
  const [configurationType, setConfigurationType] = useState<ConfigurationType>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [selectedCompleteSet, setSelectedCompleteSet] = useState<string | null>(null);
  const [sceneObjects, setSceneObjects] = useState<string[]>([]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const clearModules = () => {
    setSelectedModules(new Set());
  };

  const addModulesToScene = () => {
    const moduleIds = Array.from(selectedModules);
    setSceneObjects(prev => [...prev, ...moduleIds]);
    setCurrentStep('scene');
  };

  const addObjectToScene = (objectId: string) => {
    setSceneObjects(prev => [...prev, objectId]);
  };

  const removeObjectFromScene = (objectId: string) => {
    setSceneObjects(prev => prev.filter(id => id !== objectId));
  };

  const clearScene = () => {
    setSceneObjects([]);
  };

  const resetConfigurator = () => {
    setCurrentStep('welcome');
    setConfigurationType(null);
    setSelectedModules(new Set());
    setSelectedCompleteSet(null);
    setSceneObjects([]);
  };

  return (
    <ConfiguratorContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        configurationType,
        setConfigurationType,
        selectedModules,
        toggleModule,
        clearModules,
        addModulesToScene,
        selectedCompleteSet,
        setSelectedCompleteSet,
        sceneObjects,
        addObjectToScene,
        removeObjectFromScene,
        clearScene,
        resetConfigurator,
      }}
    >
      {children}
    </ConfiguratorContext.Provider>
  );
};

export const useConfigurator = () => {
  const context = useContext(ConfiguratorContext);
  if (!context) {
    throw new Error("useConfigurator must be used within a ConfiguratorProvider");
  }
  return context;
};