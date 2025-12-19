import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import AnimatedWaves from "../../components/ui/AnimatedWaves";
import PasswordInput from "../../components/ui/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../utils/toast";
import { firebaseAuthErrorMessage } from "../../utils/firebaseError";
import { cn } from "../../utils/cn";

type Mode = "login" | "register";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema
  .extend({
    confirmPassword: z.string().min(6, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function shouldShowFieldError(opts: {
  touched?: boolean;
  dirty?: boolean;
  submitCount: number;
}) {
  const { touched, dirty, submitCount } = opts;
  return submitCount > 0 || (touched && dirty);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    const from = (location.state as any)?.from;
    if (typeof from === "string") return from;
    if (from?.pathname) return from.pathname + (from.search ?? "");
    return "/tasks";
  }, [location.state]);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onLogin = async (values: LoginValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast.success("Signed in successfully ");
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      const msg = firebaseAuthErrorMessage(err);
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (values: RegisterValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await register(values.email, values.password);
      toast.success("Account created ");
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      const msg = firebaseAuthErrorMessage(err);
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // errors visibility
  const lf = loginForm.formState;
  const rf = registerForm.formState;

  const showLoginEmailError = shouldShowFieldError({
    touched: !!lf.touchedFields.email,
    dirty: !!lf.dirtyFields.email,
    submitCount: lf.submitCount,
  });
  const showLoginPasswordError = shouldShowFieldError({
    touched: !!lf.touchedFields.password,
    dirty: !!lf.dirtyFields.password,
    submitCount: lf.submitCount,
  });

  const showRegEmailError = shouldShowFieldError({
    touched: !!rf.touchedFields.email,
    dirty: !!rf.dirtyFields.email,
    submitCount: rf.submitCount,
  });
  const showRegPasswordError = shouldShowFieldError({
    touched: !!rf.touchedFields.password,
    dirty: !!rf.dirtyFields.password,
    submitCount: rf.submitCount,
  });
  const showRegConfirmError = shouldShowFieldError({
    touched: !!rf.touchedFields.confirmPassword,
    dirty: !!rf.dirtyFields.confirmPassword,
    submitCount: rf.submitCount,
  });

  const panelClass =
    "rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur";

  const inputBase =
    "w-full rounded-xl border bg-[color:var(--input-bg)] px-4 py-3 text-[color:var(--text)] placeholder:text-white/30 outline-none";

  const inputFocus = "focus:ring-2 focus:ring-[color:var(--ring)]";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--bg)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(var(--glow-rgb),0.16),transparent_55%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className={panelClass}>
            <div className="mb-5">
              <h1 className="text-2xl font-semibold text-[color:var(--text)]">
                Team Tasks
              </h1>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {mode === "login"
                  ? "Sign in to continue"
                  : "Create your account to start"}
              </p>
            </div>

            {/* Tabs */}
            <div className="mb-6 grid grid-cols-2 rounded-xl border border-[color:var(--panel-border)] bg-black/20 p-1">
              <button
                type="button"
                onClick={() => {
                  setServerError(null);
                  setMode("login");
                }}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  mode === "login"
                    ? "bg-white/10 text-[color:var(--text)] shadow"
                    : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
                )}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => {
                  setServerError(null);
                  setMode("register");
                }}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  mode === "register"
                    ? "bg-white/10 text-[color:var(--text)] shadow"
                    : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
                )}
              >
                Register
              </button>
            </div>

            {/* Inline server error */}
            {serverError && (
              <div className="mb-4 rounded-xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
                {serverError}
              </div>
            )}

            {/* LOGIN */}
            {mode === "login" && (
              <form noValidate className="space-y-4" onSubmit={loginForm.handleSubmit(onLogin)}>
                <Field label="Email" error={showLoginEmailError ? lf.errors.email?.message : undefined}>
                  <Controller
                    name="email"
                    control={loginForm.control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        disabled={submitting}
                        className={cn(
                          inputBase,
                          inputFocus,
                          lf.errors.email ? "border-red-500/60" : "border-[color:var(--input-border)]",
                          submitting && "cursor-not-allowed opacity-70"
                        )}
                      />
                    )}
                  />
                </Field>

                <Field
                  label="Password"
                  error={showLoginPasswordError ? lf.errors.password?.message : undefined}
                >
                  <Controller
                    name="password"
                    control={loginForm.control}
                    render={({ field }) => (
                      <PasswordInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        hasError={!!lf.errors.password}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        disabled={submitting}
                      />
                    )}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={!lf.isValid || submitting}
                  className={cn(
                    "w-full rounded-xl px-4 py-3 font-semibold text-white transition",
                    "bg-[color:var(--primary)] hover:bg-[color:var(--primary-hover)] active:bg-[color:var(--primary-active)]",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    submitting && "opacity-80"
                  )}
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
            )}

            {/* REGISTER */}
            {mode === "register" && (
              <form noValidate className="space-y-4" onSubmit={registerForm.handleSubmit(onRegister)}>
                <Field label="Email" error={showRegEmailError ? rf.errors.email?.message : undefined}>
                  <Controller
                    name="email"
                    control={registerForm.control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        disabled={submitting}
                        className={cn(
                          inputBase,
                          inputFocus,
                          rf.errors.email ? "border-red-500/60" : "border-[color:var(--input-border)]",
                          submitting && "cursor-not-allowed opacity-70"
                        )}
                      />
                    )}
                  />
                </Field>

                <Field
                  label="Password"
                  error={showRegPasswordError ? rf.errors.password?.message : undefined}
                >
                  <Controller
                    name="password"
                    control={registerForm.control}
                    render={({ field }) => (
                      <PasswordInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        hasError={!!rf.errors.password}
                        autoComplete="new-password"
                        placeholder="Min 6 characters"
                        disabled={submitting}
                      />
                    )}
                  />
                </Field>

                <Field
                  label="Confirm password"
                  error={showRegConfirmError ? rf.errors.confirmPassword?.message : undefined}
                >
                  <Controller
                    name="confirmPassword"
                    control={registerForm.control}
                    render={({ field }) => (
                      <PasswordInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        hasError={!!rf.errors.confirmPassword}
                        autoComplete="new-password"
                        placeholder="Repeat password"
                        disabled={submitting}
                      />
                    )}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={!rf.isValid || submitting}
                  className={cn(
                    "w-full rounded-xl px-4 py-3 font-semibold text-white transition",
                    "bg-[color:var(--primary)] hover:bg-[color:var(--primary-hover)] active:bg-[color:var(--primary-active)]",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    submitting && "opacity-80"
                  )}
                >
                  {submitting ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <AnimatedWaves height={140} />
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[color:var(--muted)]">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
