import { useEffect } from "react";
import { useMaterial } from "../../context/MaterialContext";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";

interface ControlsInfoProps {
  onRecenter?: () => void;
  isAutoCenterEnabled?: boolean;
  onToggleAutoCenter?: (enabled: boolean) => void;
}

const ControlsInfo = ({
  onRecenter,
  isAutoCenterEnabled = true,
  onToggleAutoCenter,
}: ControlsInfoProps) => {
  const { selectedObjectId } = useMaterial();
  const { removeObjectById, tryRotateObject, isModuleConnected, duplicateObject, configurationType } =
    useConfigurator();
  const { t } = useLanguage();

  const hasSelection = selectedObjectId !== null;
  // Rotation is only allowed for free (unsnapped) modules.
  const canRotate =
    hasSelection && !isModuleConnected(selectedObjectId!);

  const handleRotate = (direction: "left" | "right") => {
    if (!selectedObjectId) return;
    tryRotateObject(selectedObjectId, direction);
  };

  const handleCopy = () => {
    if (!selectedObjectId) return;
    duplicateObject(selectedObjectId);
  };


  useEffect(() => {
    if (onToggleAutoCenter) {
      onToggleAutoCenter(true);
      if (onRecenter) onRecenter();
    }
  }, []);

  const handleViewReset = () => {
    if (onToggleAutoCenter) onToggleAutoCenter(!isAutoCenterEnabled);
    if (onRecenter) onRecenter();
  };

  const rotateHoverSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" fill="none" className="hidden group-hover:block">
      <path d="M7.05176 12.4644C7.05176 13.0256 7.19553 13.4546 7.48306 13.7514C7.77524 14.0435 8.18799 14.1896 8.72132 14.1896C8.99958 14.1896 9.2477 14.1456 9.46567 14.0575C9.68364 13.9693 9.86683 13.8488 10.0152 13.6957C10.1636 13.5427 10.2749 13.3618 10.3491 13.1531C10.428 12.9444 10.4674 12.7195 10.4674 12.4783C10.4674 12.2047 10.4257 11.9612 10.3422 11.7479C10.2587 11.5299 10.1405 11.3467 9.98741 11.1983C9.83437 11.0499 9.65118 10.9363 9.43784 10.8575C9.22915 10.7786 8.99958 10.7392 8.74915 10.7392C8.48944 10.7392 8.25523 10.7833 8.04654 10.8714C7.83784 10.9549 7.65929 11.0731 7.51089 11.2262C7.36248 11.3792 7.24886 11.5624 7.17002 11.7757C7.09118 11.9844 7.05176 12.214 7.05176 12.4644ZM9.3335 15.6018C9.41234 15.5044 9.48654 15.4093 9.55611 15.3166C9.62567 15.2238 9.69292 15.1311 9.75784 15.0383C9.52596 15.1867 9.27089 15.3004 8.99263 15.3792C8.71437 15.4534 8.42219 15.4905 8.1161 15.4905C7.76828 15.4905 7.42741 15.4302 7.0935 15.3096C6.75958 15.1891 6.46277 15.0082 6.20306 14.767C5.94335 14.5212 5.73234 14.2198 5.57002 13.8627C5.41234 13.5009 5.3335 13.0789 5.3335 12.5966C5.3335 12.1467 5.41697 11.7247 5.58393 11.3305C5.75089 10.9363 5.98509 10.5908 6.28654 10.294C6.58799 9.99717 6.94973 9.76297 7.37176 9.59138C7.79379 9.41978 8.25987 9.33398 8.77002 9.33398C9.2848 9.33398 9.74625 9.41514 10.1544 9.57746C10.5671 9.73978 10.9173 9.96703 11.2048 10.2592C11.497 10.5514 11.7196 10.9015 11.8726 11.3096C12.0303 11.7178 12.1091 12.1653 12.1091 12.6522C12.1091 12.963 12.0813 13.2575 12.0257 13.5357C11.9747 13.814 11.9005 14.083 11.8031 14.3427C11.7057 14.5978 11.5874 14.8482 11.4483 15.094C11.3091 15.3398 11.1538 15.5833 10.9822 15.8244L8.67958 19.1079C8.60074 19.2192 8.48248 19.3143 8.3248 19.3931C8.16712 19.4673 7.98857 19.5044 7.78915 19.5044H6.21002L9.3335 15.6018Z" fill="white"/>
      <path d="M20.5485 14.4749C20.5485 15.3514 20.4534 16.1143 20.2633 16.7635C20.0778 17.4082 19.8181 17.9415 19.4841 18.3635C19.1549 18.7856 18.763 19.1009 18.3085 19.3096C17.8586 19.5137 17.3717 19.6157 16.8476 19.6157C16.3236 19.6157 15.8366 19.5137 15.3868 19.3096C14.9415 19.1009 14.5543 18.7856 14.225 18.3635C13.8957 17.9415 13.6384 17.4082 13.4528 16.7635C13.2673 16.1143 13.1746 15.3514 13.1746 14.4749C13.1746 13.5937 13.2673 12.8308 13.4528 12.1862C13.6384 11.5415 13.8957 11.0082 14.225 10.5862C14.5543 10.1641 14.9415 9.85109 15.3868 9.64703C15.8366 9.43833 16.3236 9.33398 16.8476 9.33398C17.3717 9.33398 17.8586 9.43833 18.3085 9.64703C18.763 9.85109 19.1549 10.1641 19.4841 10.5862C19.8181 11.0082 20.0778 11.5415 20.2633 12.1862C20.4534 12.8308 20.5485 13.5937 20.5485 14.4749ZM18.7746 14.4749C18.7746 13.7467 18.7212 13.1438 18.6146 12.6662C18.5079 12.1885 18.3641 11.8082 18.1833 11.5253C18.007 11.2424 17.803 11.0453 17.5711 10.934C17.3392 10.818 17.0981 10.7601 16.8476 10.7601C16.6018 10.7601 16.363 10.818 16.1311 10.934C15.9039 11.0453 15.7021 11.2424 15.5259 11.5253C15.3497 11.8082 15.2082 12.1885 15.1015 12.6662C14.9995 13.1438 14.9485 13.7467 14.9485 14.4749C14.9485 15.203 14.9995 15.8059 15.1015 16.2835C15.2082 16.7612 15.3497 17.1415 15.5259 17.4244C15.7021 17.7073 15.9039 17.9067 16.1311 18.0227C16.363 18.134 16.6018 18.1896 16.8476 18.1896C17.0981 18.1896 17.3392 18.134 17.5711 18.0227C17.803 17.9067 18.007 17.7073 18.1833 17.4244C18.3641 17.1415 18.5079 16.7612 18.6146 16.2835C18.7212 15.8059 18.7746 15.203 18.7746 14.4749Z" fill="white"/>
      <path d="M24.0817 9.33398C24.4202 9.33398 24.7286 9.385 25.0069 9.48703C25.2851 9.58906 25.524 9.73514 25.7234 9.92529C25.9228 10.1108 26.0759 10.3404 26.1825 10.614C26.2938 10.883 26.3495 11.1867 26.3495 11.5253C26.3495 11.8685 26.2938 12.1792 26.1825 12.4575C26.0759 12.7311 25.9228 12.9653 25.7234 13.1601C25.524 13.3502 25.2851 13.4963 25.0069 13.5983C24.7286 13.7004 24.4202 13.7514 24.0817 13.7514C23.7431 13.7514 23.4324 13.7004 23.1495 13.5983C22.8712 13.4963 22.6301 13.3502 22.426 13.1601C22.2266 12.9653 22.0712 12.7311 21.9599 12.4575C21.8486 12.1792 21.793 11.8685 21.793 11.5253C21.793 11.1867 21.8486 10.883 21.9599 10.614C22.0712 10.3404 22.2266 10.1108 22.426 9.92529C22.6301 9.73514 22.8712 9.58906 23.1495 9.48703C23.4324 9.385 23.7431 9.33398 24.0817 9.33398ZM24.0817 12.7496C24.3924 12.7496 24.622 12.6522 24.7704 12.4575C24.9234 12.258 24.9999 11.952 24.9999 11.5392C24.9999 11.1264 24.9234 10.8227 24.7704 10.6279C24.622 10.4331 24.3924 10.3357 24.0817 10.3357C23.757 10.3357 23.5182 10.4331 23.3651 10.6279C23.2167 10.8227 23.1425 11.1264 23.1425 11.5392C23.1425 11.952 23.2167 12.258 23.3651 12.4575C23.5182 12.6522 23.757 12.7496 24.0817 12.7496Z" fill="white"/>
    </svg>
  );

  return (
    <div className="fixed left-[100px] bottom-[60px] z-50 flex flex-col gap-[10px]">
        <div className="flex flex-col gap-[10px]">
           <button
            onClick={() => handleRotate("left")}
            disabled={!canRotate}
            className="group bg-white drop-shadow-[0px_0.8px_2px_rgba(0,0,0,0.3)] flex items-center justify-center size-[40px] cursor-pointer hover:bg-ui-dark transition-colors disabled:hidden disabled:cursor-not-allowed disabled:hover:bg-white"
            title="Rotate left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className="block group-hover:hidden">
              <path d="M11.7695 0.436198C5.52053 0.436198 0.436198 5.52053 0.436198 11.7695C0.436198 18.0185 5.52053 23.1029 11.7695 23.1029C18.0185 23.1029 23.1029 18.0185 23.1029 11.7695H21.3593C21.3593 17.0752 17.0752 21.3593 11.7695 21.3593C6.46384 21.3593 2.17979 17.0752 2.17979 11.7695C2.17979 6.46384 6.46384 2.17979 11.7695 2.17979C15.1477 2.17979 18.1003 3.90976 19.8064 6.53876H15.2567V8.28235H22.2311V1.30799H20.4875V4.54998C18.4102 2.04357 15.2737 0.436198 11.7695 0.436198Z" fill="#454343"/>
              <path d="M22.2311 8.28235V1.30799H20.4875V4.54998C18.5399 2.20046 15.6613 0.640119 12.4219 0.454427L11.7695 0.436198C5.52053 0.436198 0.436198 5.52053 0.436198 11.7695L0.450521 12.3516C0.744701 18.1384 5.40065 22.7944 11.1875 23.0885L11.7695 23.1029C18.0185 23.1029 23.1029 18.0185 23.1029 11.7695H21.3593C21.3593 17.0752 17.0752 21.3593 11.7695 21.3593V20.9232C16.8345 20.9232 20.9232 16.8345 20.9232 11.7695V11.3333H23.5391V11.7695C23.5391 18.2593 18.2593 23.5391 11.7695 23.5391C5.27979 23.5391 0 18.2593 0 11.7695C0 5.27979 5.27979 0 11.7695 0C14.9997 0 17.927 1.31626 20.0521 3.42969V0.872396H22.6667V8.71875H14.8203V6.10286H18.9544C17.2828 3.97662 14.6954 2.61589 11.7695 2.61589C6.70458 2.61589 2.61589 6.70458 2.61589 11.7695C2.61589 16.8345 6.70458 20.9232 11.7695 20.9232V21.3593L11.2747 21.3464C6.3639 21.0981 2.44097 17.1752 2.19271 12.2643L2.17979 11.7695C2.17979 6.46384 6.46384 2.17979 11.7695 2.17979L12.0846 2.1849C15.3309 2.28875 18.1535 3.99183 19.8064 6.53876H15.2567V8.28235H22.2311Z" fill="#454343"/>
            </svg>
            {rotateHoverSvg}
          </button>
          <button
            onClick={() => handleRotate("right")}
            disabled={!canRotate}
            className="group bg-white drop-shadow-[0px_0.8px_2px_rgba(0,0,0,0.3)] flex items-center justify-center size-[40px] cursor-pointer hover:bg-ui-dark transition-colors disabled:hidden disabled:cursor-not-allowed disabled:hover:bg-white"
            title="Rotate right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className="block group-hover:hidden">
              <path d="M11.7695 0.436198C18.0185 0.436198 23.1029 5.52053 23.1029 11.7695C23.1029 18.0185 18.0185 23.1029 11.7695 23.1029C5.52053 23.1029 0.436197 18.0185 0.436197 11.7695H2.17979C2.17979 17.0752 6.46384 21.3593 11.7695 21.3593C17.0752 21.3593 21.3593 17.0752 21.3593 11.7695C21.3593 6.46384 17.0752 2.17979 11.7695 2.17979C8.39133 2.17979 5.4388 3.90976 3.73267 6.53876H8.28235V8.28235H1.30799V1.30799H3.05158V4.54998C5.1289 2.04357 8.26532 0.436198 11.7695 0.436198Z" fill="#454343"/>
              <path d="M1.30799 8.28235V1.30799H3.05158V4.54998C4.99911 2.20046 7.87778 0.640119 11.1172 0.454427L11.7695 0.436198C18.0185 0.436198 23.1029 5.52053 23.1029 11.7695L23.0885 12.3516C22.7944 18.1384 18.1384 22.7944 12.3516 23.0885L11.7695 23.1029C5.52053 23.1029 0.436197 18.0185 0.436197 11.7695H2.17979C2.17979 17.0752 6.46384 21.3593 11.7695 21.3593V20.9232C6.70458 20.9232 2.61588 16.8345 2.61588 11.7695V11.3333H0V11.7695C0 18.2593 5.27979 23.5391 11.7695 23.5391C18.2593 23.5391 23.5391 18.2593 23.5391 11.7695C23.5391 5.27979 18.2593 0 11.7695 0C8.5394 0 5.61204 1.31626 3.48698 3.42969V0.872396H0.872395V8.71875H8.71875V6.10286H4.58463C6.2563 3.97662 8.84362 2.61589 11.7695 2.61589C16.8345 2.61589 20.9232 6.70458 20.9232 11.7695C20.9232 16.8345 16.8345 20.9232 11.7695 20.9232V21.3593L12.2643 21.3464C17.1752 21.0981 21.0981 17.1752 21.3464 12.2643L21.3593 11.7695C21.3593 6.46384 17.0752 2.17979 11.7695 2.17979L11.4544 2.1849C8.2082 2.28875 5.38554 3.99183 3.73267 6.53876H8.28235V8.28235H1.30799Z" fill="#454343"/>
            </svg>
            {rotateHoverSvg}
          </button> 
      

          <button
            onClick={handleCopy}
            disabled={!hasSelection}
            className={`group bg-white drop-shadow-[0px_0.8px_2px_rgba(0,0,0,0.3)] flex items-center justify-center size-[40px] cursor-pointer hover:bg-ui-dark transition-colors disabled:hidden disabled:cursor-not-allowed disabled:hover:bg-white${configurationType === "complete" ? " hidden" : ""}`}
            title="Copy"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="23"
              height="27"
              viewBox="0 0 23 27"
              fill="none"
            >
              <path
                d="M1.2 2.8C1.2 1.91634 1.91634 1.2 2.8 1.2H14.8C15.6837 1.2 16.4 1.91634 16.4 2.8V18C16.4 18.8837 15.6837 19.6 14.8 19.6H2.8C1.91634 19.6 1.2 18.8837 1.2 18V2.8Z"
              className="fill-white group-hover:fill-ui-dark transition-colors"
              />
              <path
                className="fill-ui-dark group-hover:fill-white transition-colors"
                d="M15.2 2.8C15.2 2.57909 15.0209 2.4 14.8 2.4H2.8C2.57909 2.4 2.4 2.57909 2.4 2.8V18C2.4 18.2209 2.57909 18.4 2.8 18.4H14.8C15.0209 18.4 15.2 18.2209 15.2 18V2.8ZM17.6 18C17.6 19.5464 16.3464 20.8 14.8 20.8H2.8C1.2536 20.8 0 19.5464 0 18V2.8C0 1.2536 1.2536 0 2.8 0H14.8C16.3464 0 17.6 1.2536 17.6 2.8V18Z"
              />
              <path
                d="M6 8.4C6 7.51634 6.71634 6.8 7.6 6.8H19.6C20.4837 6.8 21.2 7.51634 21.2 8.4V23.6C21.2 24.4837 20.4837 25.2 19.6 25.2H7.6C6.71634 25.2 6 24.4837 6 23.6V8.4Z"
              className="fill-white group-hover:fill-ui-dark transition-colors"
              />
              <path
                className="fill-ui-dark group-hover:fill-white transition-colors"
                d="M20 8.4C20 8.17909 19.8209 8 19.6 8H7.6C7.37909 8 7.2 8.17909 7.2 8.4V23.6C7.2 23.8209 7.37909 24 7.6 24H19.6C19.8209 24 20 23.8209 20 23.6V8.4ZM22.4 23.6C22.4 25.1464 21.1464 26.4 19.6 26.4H7.6C6.0536 26.4 4.8 25.1464 4.8 23.6V8.4C4.8 6.8536 6.0536 5.6 7.6 5.6H19.6C21.1464 5.6 22.4 6.8536 22.4 8.4V23.6Z"
              />
            </svg>
          </button>

            <button className="bg-white drop-shadow-[0px_0.8px_2px_rgba(0,0,0,0.3)] flex items-center justify-center size-[40px] cursor-pointer hover:bg-ui-dark group transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="6"
              height="19"
              viewBox="0 0 6 19"
              fill="none"
            >
              <path
                className="fill-ui-dark group-hover:fill-white transition-colors"
                d="M4.7884 5.67013V18.4H1.64916V7.6H0V5.67013H1.64916H4.7884ZM5.21878 1.96035C5.21878 2.22504 5.16393 2.47318 5.05422 2.70479C4.94452 2.93639 4.79684 3.13904 4.61118 3.31274C4.43397 3.48645 4.223 3.62706 3.97827 3.73459C3.73355 3.83385 3.47194 3.88348 3.19346 3.88348C2.92342 3.88348 2.66604 3.83385 2.42131 3.73459C2.18502 3.62706 1.97827 3.48645 1.80106 3.31274C1.62384 3.13904 1.48038 2.93639 1.37068 2.70479C1.26941 2.47318 1.21878 2.22504 1.21878 1.96035C1.21878 1.68739 1.26941 1.43097 1.37068 1.1911C1.48038 0.951225 1.62384 0.744437 1.80106 0.570735C1.97827 0.397033 2.18502 0.260553 2.42131 0.161295C2.66604 0.0537649 2.92342 0 3.19346 0C3.47194 0 3.73355 0.0537649 3.97827 0.161295C4.223 0.260553 4.43397 0.397033 4.61118 0.570735C4.79684 0.744437 4.94452 0.951225 5.05422 1.1911C5.16393 1.43097 5.21878 1.68739 5.21878 1.96035Z"
              />
            </svg>
          </button>
        </div>


      {/* Camera + utility buttons */}
      <div className="flex gap-[10px]">
        <div className="relative">
      
                <button
            onClick={() => removeObjectById(selectedObjectId!)}
            className="group bg-white drop-shadow-[0px_0.8px_2px_rgba(0,0,0,0.3)] flex items-center justify-center size-[40px] cursor-pointer hover:bg-[#EE4848] transition-colors"
            title="Delete"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="24"
              viewBox="0 0 20 24"
              fill="none"
            >
              <path d="M2.21538 3.58194H5.90769H9.6H13.2923H16.9846V22.9254H13.2923H9.6H5.90769H2.21538V3.58194Z" />
              <path
                className="fill-ui-dark group-hover:fill-white transition-colors"
                d="M18.0923 2.50731V24H1.10769V2.50731H18.0923ZM14.4 21.8507H15.8769V4.65658H14.4V21.8507ZM10.7077 21.8507H12.1846V4.65658H10.7077V21.8507ZM7.01538 21.8507H8.49231V4.65658H7.01538V21.8507ZM3.32308 21.8507H4.8V4.65658H3.32308V21.8507Z"
              />
              <path
                className="fill-ui-dark group-hover:fill-white transition-colors"
                d="M11.6185 0V2.50748H19.2V3.94033H0V2.50748H7.58149V0H11.6185ZM9.05841 2.50748H10.1416V1.43285H9.05841V2.50748Z"
              />
            </svg>
          </button>
          {/* 
          {isTooltipVisible && (
            <div className="absolute bottom-[48px] left-0 w-[280px] bg-white drop-shadow-[0px_1px_2.5px_rgba(0,0,0,0.3)] p-[15px] pointer-events-none z-10">
              <p className="font-lato font-light text-[11px] text-ui-dark leading-[1.4]">
                {t.clickToSelect}
              </p>
              <p className="font-lato font-light text-[11px] text-ui-dark leading-[1.4] mt-[5px]">
                {t.mouseWheelZoom}
              </p>
              <p className="font-lato font-light text-[11px] text-ui-dark leading-[1.4] mt-[5px]">
                {t.dragToRotate}
              </p>
            </div>
          )} */}
        </div>

              <button className="bg-white w-full drop-shadow-[0px_0.8px_2px_rgba(0,0,0,0.3)] flex h-[40px] items-center cursor-pointer hover:bg-[#D4CCBC] group transition-colors">
        <div className="size-[40px] shrink-0 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="18"
            viewBox="0 0 14 18"
            fill="none"
          >
            <path
              className="fill-ui-dark group-hover:fill-black transition-colors"
              d="M6.8 15.1556L13.6 8.15738L12.2402 6.77474L7.76163 11.3285V8.54815e-08L5.83837 0L5.83836 11.3285L1.35981 6.77474L0 8.15738L6.8 15.1556Z"
            />
            <path
              className="fill-ui-dark group-hover:fill-black transition-colors"
              d="M0.0685544 15.6444H13.5314V17.6H0.0685544V15.6444Z"
            />
          </svg>
        </div>
        <span className="flex-1 font-lato font-light text-[20px] text-ui-dark group-hover:text-black transition-colors uppercase text-center">
          pdf 
        </span>
      </button>
      </div>

      {/* PDF download */}
     
        {onRecenter && (
          <button
            onClick={handleViewReset}
            className="bg-white drop-shadow-[0px_0.8px_2px_rgba(0,0,0,0.3)] flex h-[40px] px-2 gap-2 items-center cursor-pointer hover:bg-ui-dark group transition-colors"
          >
            <div className="size-[40px] shrink-0 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="19"
                viewBox="0 0 24 19"
                fill="none"
              >
                <path
                  className="fill-ui-dark group-hover:fill-white transition-colors"
                  d="M21.8788 5.68969V2.04604H18.1016V0H21.7045C22.3244 0 22.8619 0.219549 23.3171 0.658658C23.7723 1.09776 24 1.61627 24 2.21421V5.68969H21.8788ZM0 5.68969V2.21421C0 1.61627 0.227599 1.09776 0.682807 0.658658C1.13802 0.219549 1.67554 0 2.29539 0H5.89829V2.04604H2.12106V5.68969H0ZM18.1016 18.6667V16.6206H21.8788V12.977H24V16.4525C24 17.0503 23.7723 17.5689 23.3171 18.008C22.8619 18.4471 22.3244 18.6667 21.7045 18.6667H18.1016ZM2.29539 18.6667C1.67554 18.6667 1.13802 18.4471 0.682807 18.008C0.227599 17.5689 0 17.0503 0 16.4525V12.977H2.12106V16.6206H5.89829V18.6667H2.29539ZM3.8644 14.9389V3.72773H20.1355V14.9389H3.8644ZM5.98546 12.8929H18.0144V5.77377H5.98546V12.8929Z"
                />
              </svg>
            </div>
            <span className="flex-1 font-lato font-light text-[20px] text-ui-dark group-hover:text-white transition-colors uppercase text-center">
              {t.recenter}
            </span>
          </button>
        )}
    </div>
  );
};

export default ControlsInfo;
