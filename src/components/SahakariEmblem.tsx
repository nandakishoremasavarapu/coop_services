import React from "react";

interface SahakariEmblemProps {
  className?: string;
  size?: number;
  rounded?: boolean;
}

export function SahakariEmblem({ className = "w-8 h-8", size, rounded = true }: SahakariEmblemProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <rect width="200" height="200" rx={rounded ? "44" : "0"} fill="#134E3F" />
      {/* Interlocking hands / civic shield cooperative emblem */}
      <path
        d="M100 32 L152 56 V108 C152 142 128 166 100 176 C72 166 48 142 48 108 V56 Z"
        fill="none"
        stroke="#D97706"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="85" r="18" fill="#F8FAF9" />
      <path
        d="M72 135 C72 115 84 105 100 105 C116 105 128 115 128 135"
        fill="none"
        stroke="#F8FAF9"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Two supportive curved cooperative wings */}
      <path
        d="M60 102 C60 82 72 70 82 66"
        fill="none"
        stroke="#34D399"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M140 102 C140 82 128 70 118 66"
        fill="none"
        stroke="#34D399"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default SahakariEmblem;
