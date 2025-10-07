const ControlsInfo = () => {
  return (
    <div className="fixed bottom-6 left-6 z-50 group">
      <div className="w-10 h-10 bg-[#06402b] rounded-full flex items-center justify-center cursor-pointer group-hover:scale-110 transition-all duration-300">
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

      <div className="absolute bottom-12 left-0 w-80 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
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
              Sterowanie
            </strong>
          </div>
          <div className="space-y-2 text-xs text-black/70 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="text-black/40 text-[10px] mt-0.5">●</span>
              <span>Kliknij obiekt, aby zaznaczyć</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-black/40 text-[10px] mt-0.5">●</span>
              <span>Kółko myszy – przybliż/oddal</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-black/40 text-[10px] mt-0.5">●</span>
              <span>Przeciągnij w pustym miejscu – obróć kamerę</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ControlsInfo;
