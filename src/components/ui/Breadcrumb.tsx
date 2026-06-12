import React from "react";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => (
  <div className="flex items-center gap-1">
    {items.map((item, idx) => (
      <React.Fragment key={idx}>
        {item.onClick ? (
          <button
            onClick={item.onClick}
            className="font-lato font-light text-ui-muted text-[15px] uppercase whitespace-nowrap opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          >
            {item.label}
          </button>
        ) : (
          <span className="font-lato font-light text-ui-muted text-[15px] uppercase whitespace-nowrap">
            {item.label}
          </span>
        )}
        {idx < items.length - 1 && (
          <div className="flex items-center justify-center w-[6px] h-[11px]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="7"
              height="12"
              viewBox="0 0 7 12"
              fill="none"
            >
              <path
                d="M0.253418 11.2764L6.25342 5.77652L0.253418 0.276367"
                stroke="#757575"
                strokeWidth="0.75"
              />
            </svg>
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

export default Breadcrumb;
