import React from "react";

type GlitchSize = "sm" | "md" | "lg" | "xl" | "2xl";

const sizeMap: Record<GlitchSize, string> = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl",
  xl: "text-7xl",
  "2xl": "text-9xl",
};

const DigitalNoiseGlitch = ({ text, size = "lg" }: { text: string; size?: GlitchSize }) => {
  const fontSize = sizeMap[size];

  return (
    <div className="group relative cursor-default">
      {/* Main Text Layer */}
      <h1 className={`${fontSize} relative z-10 font-black uppercase tracking-tighter text-white`}>
        {text}

        {/* Noise Layer 1 - High Contrast Ghost */}
        <span
          className={`absolute left-0 top-0 -z-10 h-full w-full ${fontSize} animate-noise-1 select-none text-gray-400 opacity-50 group-hover:block`}
        >
          {text}
        </span>

        {/* Noise Layer 2 - Sliced White Jitter */}
        <span
          className={`absolute left-0 top-0 -z-20 h-full w-full ${fontSize} animate-noise-2 select-none text-white opacity-80 group-hover:block`}
        >
          {text}
        </span>
      </h1>

      {/* Optional: Subtle scanline overlay for the whole container */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,118,0.03))] bg-[length:100%_2px,3px_100%]" />
    </div>
  );
};

export default DigitalNoiseGlitch;
