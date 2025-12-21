import { Home, ArrowLeft, Ban } from "lucide-react";

export default function Forbidden() {
  return (
    <div
      className="
        min-h-screen flex items-center justify-center p-6
        bg-[radial-gradient(circle_at_top,rgba(var(--glow-rgb),0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(var(--glow-rgb),0.10),transparent_60%),linear-gradient(135deg,rgba(var(--bg-rgb),1),rgba(var(--bg-rgb),0.92),rgba(var(--bg-rgb),1))]
      "
    >
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-7xl md:text-8xl font-black bg-[linear-gradient(90deg,rgba(var(--glow-rgb),1),rgba(var(--glow-rgb),0.82),rgba(var(--glow-rgb),0.62))] bg-clip-text text-transparent mb-4">
            403
          </h1>

          <div className="flex justify-center mb-6">
            <Ban className="w-16 h-16 text-(--danger-text)" strokeWidth={1.5} />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-(--text) mb-3">
            Forbidden
          </h2>

          <p className="text-(--muted) text-lg mb-2">
            You don’t have permission to view this page.
          </p>

          <p className="text-(--muted)/80 text-sm max-w-md mx-auto">
            Try a different account or request access from your administrator.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => window.history.back()}
            className="
              group flex items-center gap-2
              bg-(--panel) hover:bg-(--panel-hover)
              text-(--text) font-medium py-3 px-6 rounded-xl
              border border-(--panel-border)
              transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              backdrop-blur-sm shadow-(--shadow-sm)
            "
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            className="
              group flex items-center gap-2
              text-(--text) font-medium py-3 px-6 rounded-xl
              border border-(--panel-border)
              transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              shadow-(--shadow-sm)
              bg-[linear-gradient(90deg,var(--primary),var(--primary-hover))]
              hover:bg-[linear-gradient(90deg,var(--primary-hover),var(--primary-active))]
              hover:shadow-[0_16px_40px_rgba(var(--glow-rgb),0.18)]
            "
          >
            <Home className="w-5 h-5" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
