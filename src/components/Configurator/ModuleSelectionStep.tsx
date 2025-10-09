import React, { useState, useEffect } from "react";
import {
  useConfigurator,
  availableModules,
  availableCompleteSets,
} from "../../context/ConfiguratorContext";

const ModuleSelectionStep: React.FC = () => {
  const {
    configurationType,
    selectedCompleteSet,
    setSelectedCompleteSet,
    setCurrentStep,
    addObjectToScene,
    clearScene,
  } = useConfigurator();

  // Local state for module counts (moduleId -> count)
  const [moduleCounts, setModuleCounts] = useState<Map<string, number>>(
    new Map(),
  );

  // Clear selection when modal opens
  useEffect(() => {
    setModuleCounts(new Map());
  }, []);

  // Clear scene when switching to module selection from complete set
  useEffect(() => {
    if (configurationType === "modules" && selectedCompleteSet) {
      clearScene();
      setSelectedCompleteSet(null);
    }
  }, [configurationType, selectedCompleteSet, clearScene, setSelectedCompleteSet]);

  const handleBack = () => {
    setCurrentStep("config-type");
    setModuleCounts(new Map()); // Clear on back
  };

  const handleClose = () => {
    setCurrentStep("scene");
    setModuleCounts(new Map()); // Clear on close
  };

  const handleCompleteSetSelect = (setId: string) => {
    setSelectedCompleteSet(setId);
    addObjectToScene(setId);
    setCurrentStep("scene");
  };

  const getModuleCount = (moduleId: string): number => {
    return moduleCounts.get(moduleId) || 0;
  };

  const incrementModule = (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModuleCounts((prev) => {
      const newCounts = new Map(prev);
      const currentCount = newCounts.get(moduleId) || 0;
      newCounts.set(moduleId, currentCount + 1);
      return newCounts;
    });
  };

  const decrementModule = (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModuleCounts((prev) => {
      const newCounts = new Map(prev);
      const currentCount = newCounts.get(moduleId) || 0;
      if (currentCount > 0) {
        if (currentCount === 1) {
          newCounts.delete(moduleId);
        } else {
          newCounts.set(moduleId, currentCount - 1);
        }
      }
      return newCounts;
    });
  };

  const toggleModule = (moduleId: string) => {
    const currentCount = getModuleCount(moduleId);
    if (currentCount === 0) {
      setModuleCounts((prev) => {
        const newCounts = new Map(prev);
        newCounts.set(moduleId, 1);
        return newCounts;
      });
    } else {
      setModuleCounts((prev) => {
        const newCounts = new Map(prev);
        newCounts.delete(moduleId);
        return newCounts;
      });
    }
  };

  const clearModules = () => {
    setModuleCounts(new Map());
  };

  const addModulesToScene = () => {
    // Add each module the specified number of times with unique IDs
    let counter = 0;
    moduleCounts.forEach((count, moduleId) => {
      for (let i = 0; i < count; i++) {
        // Generate unique ID by appending counter, timestamp and random string
        // Counter ensures uniqueness even if timestamp is the same
        const uniqueId = `${moduleId}-${counter}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        addObjectToScene(uniqueId);
        counter++;
      }
    });
    
    setCurrentStep("scene");
    setModuleCounts(new Map()); // Clear after adding
  };

  const isModuleSelected = (moduleId: string) => {
    return getModuleCount(moduleId) > 0;
  };

  if (configurationType === "complete") {
    return (
      <div className="fixed inset-0 bg-white/95 backdrop-blur-lg z-[1000] flex flex-col">
        <div className="flex-1 overflow-y-auto pt-8">
          <div className="max-w-6xl mx-auto px-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <button
                  onClick={handleBack}
                  className="cursor-pointer flex items-center px-4 py-2 text-black hover:bg-[#06402b]/10 rounded-lg transition-colors duration-200 mr-6"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Wstecz
                </button>
                <div>
                  <h1 className="text-lg font-bold text-black">
                    Wybierz Kompletny Zestaw
                  </h1>
                  <p className="text-sm text-gray-600">
                    Wybierz jeden z gotowych zestawów mebli
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="cursor-pointer p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Complete Sets Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCompleteSets.map((set) => (
                <div
                  key={set.id}
                  className={`bg-white rounded-xl border-2 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden cursor-pointer group ${
                    selectedCompleteSet === set.id
                      ? "border-[#06402b] ring-2 ring-[#06402b]/20"
                      : "border-gray-200 hover:border-[#06402b]/40"
                  }`}
                  onClick={() => handleCompleteSetSelect(set.id)}
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                    {set.thumbnail ? (
                      <img
                        src={set.thumbnail}
                        alt={set.displayName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <svg
                        className="w-16 h-16 text-gray-400 group-hover:text-black transition-colors duration-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 16v4h16v-4M4 16L2 8h20l-2 8M4 16h16M8 12V8m8 4V8"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2">
                      {set.displayName}
                    </h3>
                    <p className="text-sm text-gray-600">Kliknij, aby wybrać</p>
                  </div>
                  {selectedCompleteSet === set.id && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 bg-[#06402b] rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Module selection interface
  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-lg z-[1000] flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="cursor-pointer flex items-center px-4 py-2 text-black hover:bg-[#06402b]/10 rounded-lg transition-colors duration-200 mr-6"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Wstecz
              </button>
              <div>
                <h1 className="text-lg font-bold text-black">
                  Wybierz moduły (możesz wybrać wiele)
                </h1>
                <p className="text-sm text-gray-600">
                  Zbuduj własną konfigurację wybierając poszczególne moduły
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="cursor-pointer p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Main Content Area with Filters */}
          <div className="flex gap-8">
            {/* Modules Grid */}
            <div className="flex-1">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pb-20">
                {availableModules.map((module) => {
                  const count = getModuleCount(module.id);
                  const isSelected = isModuleSelected(module.id);
                  
                  return (
                    <div
                      key={module.id}
                      className={`bg-white rounded-xl border-2 transition-all duration-300 shadow-md hover:shadow-lg overflow-hidden cursor-pointer group relative ${
                        isSelected
                          ? "border-[#06402b] ring-2 ring-[#06402b]/20 scale-105"
                          : "border-gray-200 hover:border-[#06402b]/40 hover:scale-102"
                      }`}
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                        {module.thumbnail ? (
                          <img
                            src={module.thumbnail}
                            alt={module.displayName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <svg
                            className={`w-12 h-12 transition-colors duration-300 ${
                              isSelected
                                ? "text-black"
                                : "text-gray-400 group-hover:text-black"
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-bold text-gray-900 text-sm mb-1">
                          {module.displayName}
                        </h3>
                        <p className="text-xs text-gray-600">
                          Kliknij, aby wybrać
                        </p>
                      </div>
                      {isSelected && (
                        <>
                          <div className="absolute top-2 right-2">
                            <div className="w-6 h-6 bg-[#06402b] rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </div>
                          {/* Counter Controls */}
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-[#06402b]/20 p-1">
                            <button
                              onClick={(e) => decrementModule(module.id, e)}
                              className="cursor-pointer w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-600 rounded transition-colors duration-200"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M20 12H4"
                                />
                              </svg>
                            </button>
                            <span className="text-xs font-bold text-[#06402b] min-w-[20px] text-center">
                              {count}
                            </span>
                            <button
                              onClick={(e) => incrementModule(module.id, e)}
                              className="cursor-pointer w-6 h-6 flex items-center justify-center bg-[#06402b] hover:bg-[#06402b]/80 text-white rounded transition-colors duration-200"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter Section - Placeholder */}
            {/* <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtry</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Kategoria</label>
                    <div className="bg-gray-50 rounded-lg p-3 text-center text-gray-400 text-sm">
                      Filtry będą dostępne wkrótce
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Rozmiar</label>
                    <div className="bg-gray-50 rounded-lg p-3 text-center text-gray-400 text-sm">
                      Opcje rozmiaru
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Materiał</label>
                    <div className="bg-gray-50 rounded-lg p-3 text-center text-gray-400 text-sm">
                      Wybór materiału
                    </div>
                  </div>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      {/* Footer Controls - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-[1010]">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-3">
              <button
                onClick={addModulesToScene}
                disabled={moduleCounts.size === 0}
                className={`cursor-pointer px-12 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  moduleCounts.size > 0
                    ? "bg-[#06402b] text-white hover:bg-[#06402b]/90 active:scale-[0.98] shadow-lg hover:shadow-xl"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Dodaj do Sceny
              </button>
              <button
                onClick={clearModules}
                disabled={moduleCounts.size === 0}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  moduleCounts.size === 0
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600 cursor-pointer"
                }`}
                title="Wyczyść wybór"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="text-xs text-black/35">
              Wybrano: {Array.from(moduleCounts.values()).reduce((sum, count) => sum + count, 0)} modułów
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleSelectionStep;
