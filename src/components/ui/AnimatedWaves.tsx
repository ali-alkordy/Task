import React from "react";

/*
  AnimatedWaves
  - Reusable SVG wave animation you can drop into any page
  - Self-contained: includes its own keyframes and unique IDs to avoid collisions
  - Works in CRA / Vite / Next.js
*/

export type WaveLayer = {
  y: number;
  fill: string;
  duration: number; // seconds
  reverse?: boolean;
};

export type AnimatedWavesProps = {
  className?: string;
  svgClassName?: string;
  height?: number | string;
  layers?: WaveLayer[];
  withWrapper?: boolean;
};

const DEFAULT_LAYERS: WaveLayer[] = [
  { y: 0, fill: "rgba(56, 189, 248, 0.10)", duration: 10, reverse: false }, // sky glow
  { y: 3, fill: "rgba(59, 130, 246, 0.30)", duration: 8, reverse: true },  // blue
  { y: 5, fill: "rgba(14, 165, 233, 0.45)", duration: 6, reverse: false }, // cyan
  { y: 7, fill: "rgba(15, 23, 42, 0.85)", duration: 4, reverse: true },    // slate/dark base
];

export default function AnimatedWaves({
  className = "",
  svgClassName = "",
  height = 128,
  layers = DEFAULT_LAYERS,
  withWrapper = true,
}: AnimatedWavesProps) {
  // Unique IDs so multiple wave components won't conflict on the same page
  const uid = React.useId().replace(/:/g, "");
  const waveKeyframesName = `wave-${uid}`;
  const pathId = `gentle-wave-${uid}`;

  const Svg = (
    <>
      {/* Keyframes defined in normal <style> for portability across projects */}
      <style>
        {`
          @keyframes ${waveKeyframesName} {
            0%, 100% { transform: translateX(0px); }
            50% { transform: translateX(-25px); }
          }
        `}
      </style>

      <svg
        className={`relative block w-full ${svgClassName}`}
        style={{ height }}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 24 150 28"
        preserveAspectRatio="none"
        shapeRendering="auto"
      >
        <defs>
          {/* Path used by all wave layers */}
          <path
            id={pathId}
            d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
          />
        </defs>

        {/* Each layer reuses the same path with different fill and animation speed */}
        <g>
          {layers.map((layer, idx) => (
            <use
              key={idx}
              xlinkHref={`#${pathId}`}
              x={48}
              y={layer.y}
              fill={layer.fill}
              style={
                {
                  animationName: waveKeyframesName,
                  animationDuration: `${layer.duration}s`,
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationDirection: layer.reverse ? "reverse" : "normal",
                } as React.CSSProperties
              }
            />
          ))}
        </g>
      </svg>
    </>
  );

  // Optional wrapper that matches your page layout usage (bottom full width)
  if (withWrapper) {
    return (
      <div className={`absolute bottom-0 left-0 w-full overflow-hidden ${className}`}>
        {Svg}
      </div>
    );
  }

  // If you want to control positioning outside the component
  return <div className={className}>{Svg}</div>;
}
