import { Home, ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="
        min-h-screen
        flex items-center justify-center p-6
        bg-[radial-gradient(circle_at_top,rgba(var(--glow-rgb),0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(var(--glow-rgb),0.10),transparent_60%),linear-gradient(135deg,rgba(var(--bg-rgb),1),rgba(var(--bg-rgb),0.92),rgba(var(--bg-rgb),1))]
      "
    >
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          {/* 404 Number with theme glow gradient */}
          <h1 className="text-9xl font-black bg-[linear-gradient(90deg,rgba(var(--glow-rgb),1),rgba(var(--glow-rgb),0.82),rgba(var(--glow-rgb),0.62))] bg-clip-text text-transparent mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
            404
          </h1>

          {/* Alert icon */}
          <div className="flex justify-center mb-6">
            <AlertCircle
              className="w-16 h-16 text-(--danger-text)"
              strokeWidth={1.5}
            />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-(--text) mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Page Not Found
          </h2>

          <p className="text-(--muted) text-lg mb-2 animate-in fade-in duration-700 delay-200">
            The page you're looking for doesn't exist.
          </p>

          <p className="text-(--muted)/80x-w-md mx-auto animate-in fade-in duration-700 delay-300">
            It may have been moved or deleted. Let's get you back on track.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
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
