import React from "react";

/*
  AnimatedWaves (Theme-aware)
  - Uses CSS vars directly in fill: rgba(var(--glow-rgb), x)
  - No getComputedStyle (prevents theme mismatch glitch)
  - Self-contained keyframes + unique IDs
*/

export type WaveLayer = {
  y: number;
  duration: number; // seconds
  reverse?: boolean;

  // optional overrides
  opacity?: number; // used if fill not provided
  fill?: string; // hard override (optional)
};

export type AnimatedWavesProps = {
  className?: string;
  svgClassName?: string;
  height?: number | string;
  layers?: WaveLayer[];
  withWrapper?: boolean;
};

const DEFAULT_LAYERS: WaveLayer[] = [
  { y: 0, opacity: 0.10, duration: 10, reverse: false },
  { y: 3, opacity: 0.22, duration: 8, reverse: true },
  { y: 5, opacity: 0.34, duration: 6, reverse: false },
  { y: 7, opacity: 0.85, duration: 4, reverse: true },
];

export default function AnimatedWaves({
  className = "",
  svgClassName = "",
  height = 128,
  layers = DEFAULT_LAYERS,
  withWrapper = true,
}: AnimatedWavesProps) {
  const uid = React.useId().replace(/:/g, "");
  const waveKeyframesName = `wave-${uid}`;
  const pathId = `gentle-wave-${uid}`;

  // ✅ Build fill using CSS vars (always in sync with current theme)
  const getFill = (layer: WaveLayer, idx: number) => {
    if (layer.fill) return layer.fill;

    const isBase = idx === layers.length - 1;
    const opacity = layer.opacity ?? (isBase ? 0.85 : 0.2);

    // glow layers use --glow-rgb, last base layer uses --waves-base-rgb
    return isBase
      ? `rgba(var(--waves-base-rgb), ${opacity})`
      : `rgba(var(--glow-rgb), ${opacity})`;
  };

  const Svg = (
    <>
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
          <path
            id={pathId}
            d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
          />
        </defs>

        <g>
          {layers.map((layer, idx) => (
            <use
              key={idx}
              xlinkHref={`#${pathId}`}
              x={48}
              y={layer.y}
              fill={getFill(layer, idx)}
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

  if (withWrapper) {
    return (
      <div className={`absolute bottom-0 left-0 w-full overflow-hidden ${className}`}>
        {Svg}
      </div>
    );
  }

  return <div className={className}>{Svg}</div>;
}
