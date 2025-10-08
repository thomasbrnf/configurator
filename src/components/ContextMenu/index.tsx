import React, { useState, useRef, useEffect } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onRotate: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onDelete,
  onClose,
}) => {
  const [position, setPosition] = useState({ x, y });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, menuX: 0, menuY: 0 });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      menuX: position.x,
      menuY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.menuX + deltaX,
        y: dragStartRef.current.menuY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className="fixed z-[300] bg-white/95 backdrop-blur-lg rounded-lg shadow-xl border border-[#06402b]/15 overflow-hidden min-w-[160px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "default",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Drag Handle */}
      <div
        className="px-4 py-2 bg-[#06402b]/5 border-b border-[#06402b]/10 flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleDragStart}
      >
        <svg
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 12 12"
          width="16"
          height="16"
          className="text-[#06402b]/40"
        >
          <path
            d="M6 11.325 3.793 9.118l.72-.72.992.986v-2.89H2.616l.923.93-.72.72L.675 6l2.157-2.157.72.72-.936.942h2.889V2.609l-.93.93-.72-.72L6 .675l2.144 2.144-.72.72-.93-.93v2.896h2.897l-.93-.93.72-.72L11.324 6 9.18 8.144l-.72-.72.93-.93H6.496v2.89l.992-.986.72.72L6 11.325Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="py-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            onClose();
          }}
          className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 flex items-center gap-3"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span className="font-medium">Usuń</span>
        </button>
      </div>
    </div>
  );
};
