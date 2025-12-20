import AnimatedWaves from "./AnimatedWaves";

type FullPageLoaderProps = {
  title?: string;
  subtitle?: string;
};

export default function FullPageLoader({
  title = "Checking session...",
  subtitle = "Please wait a moment",
}: FullPageLoaderProps) {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Theme glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top, rgba(var(--glow-rgb), 0.16), transparent 55%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div
          className="w-full max-w-sm rounded-2xl p-6 text-center"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--panel-border)",
            boxShadow: "var(--shadow-lg)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Spinner */}
          <div
            className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              borderTopColor: "var(--primary)",
            }}
          />

          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            {title}
          </h2>

          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {subtitle}
          </p>
        </div>
      </div>

      <AnimatedWaves height={140} />
    </div>
  );
}
