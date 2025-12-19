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
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_55%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[color:var(--primary)]" />
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-white/60">{subtitle}</p>
        </div>
      </div>

      <AnimatedWaves height={140} />
    </div>
  );
}
