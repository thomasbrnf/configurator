import React, { useState } from "react";

interface ItemCardProps {
  name: string;
  subtitle: string;
  thumbnail?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  overlay?: React.ReactNode;
  imageAspect?: "video" | "square";
}

const ItemCard: React.FC<ItemCardProps> = ({
  name,
  subtitle,
  thumbnail,
  selected = false,
  disabled = false,
  onClick,
  overlay,
  imageAspect = "video",
}) => {
  const [hovered, setHovered] = useState(false);

  const borderColor = selected
    ? "border-ui-dark"
    : disabled
      ? "border-ui-border opacity-50"
      : "border-ui-border hover:border-ui-dark";

  const aspectClass =
    imageAspect === "square" ? "aspect-square" : "aspect-video";

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={disabled ? undefined : () => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex flex-col  w-full h-full p-[clamp(12px,1.04vw,20px)] border-t-[3px] transition-colors ${borderColor} ${
        disabled ? "cursor-not-allowed" : onClick ? "cursor-pointer" : ""
      }`}
      style={{
        background:
          selected || hovered
            ? "linear-gradient(180deg, #D4CCBC 0%, #FFF 100%)"
            : "linear-gradient(180deg, #f3f3f3 0%, #FFF 100%)",
      }}
    >
      <div className="flex justify-between">
        <div className="flex flex-col leading-normal min-w-0">
          <span className="font-lato font-light text-[clamp(15px,1.3vw,25px)] text-black uppercase">
            {name}
          </span>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`${selected ? "opacity-100" : "opacity-0"} pt-1.5 shrink-0`}
          width="30"
          height="30"
          viewBox="0 0 30 30"
          fill="none"
        >
          <circle cx="15" cy="15" r="15" fill="#7E7870" />
          <path
            d="M24.1992 9.82031L14.0332 21.835L7.13672 15.4297L8.86328 13.5703L13.8115 18.165L22.2617 8.17969L24.1992 9.82031Z"
            fill="white"
          />
        </svg>
      </div>

      <span className="font-lato mt-auto mb-5 font-normal text-[clamp(11px,0.78vw,15px)] text-ui-dark">
        {subtitle}
      </span>

      <div className={`relative w-full ${aspectClass}  bg-white`}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={name}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-100" />
        )}
        {overlay}
      </div>
    </div>
  );
};

export default ItemCard;
