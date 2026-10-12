import React from "react";

export interface ShareIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Share icon: three connected rings (same look as the supplied sample).
 * Drawn with currentColor so every theme can colour it like its other icons.
 */
export const ShareIcon: React.FC<ShareIconProps> = ({ className = "", strokeWidth = 2, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`lucide lucide-share-rings ${className}`}
    aria-hidden="true"
    {...rest}
  >
    <circle cx="5" cy="12" r="2.75" />
    <circle cx="18.5" cy="5.5" r="2.75" />
    <circle cx="18.5" cy="18.5" r="2.75" />
    <line x1="7.48" y1="10.81" x2="16.03" y2="6.69" />
    <line x1="7.48" y1="13.19" x2="16.03" y2="17.31" />
  </svg>
);

export default ShareIcon;
