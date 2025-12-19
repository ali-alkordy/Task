import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import PasswordInput from "../../components/ui/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../utils/toast";
import { firebaseAuthErrorMessage } from "../../utils/firebaseError";
import { cn } from "../../utils/cn";

import {
  changePasswordWithCurrentPassword,
  getCurrentUserEmail,
} from "../../services/settings/settings.service";

const schema = z
  .object({
    currentPassword: z.string().min(6, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmNewPassword: z.string().min(6, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

type FormValues = z.infer<typeof schema>;

function shouldShowFieldError(opts: { touched?: boolean; dirty?: boolean; submitCount: number }) {
  const { touched, dirty, submitCount } = opts;
  return submitCount > 0 || (touched && dirty);
}

export default function SettingsPage() {
  const { user } = useAuth();

  const email = useMemo(() => user?.email ?? getCurrentUserEmail() ?? "—", [user?.email]);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const fs = form.formState;

  const showCurrentError = shouldShowFieldError({
    touched: !!fs.touchedFields.currentPassword,
    dirty: !!fs.dirtyFields.currentPassword,
    submitCount: fs.submitCount,
  });

  const showNewError = shouldShowFieldError({
    touched: !!fs.touchedFields.newPassword,
    dirty: !!fs.dirtyFields.newPassword,
    submitCount: fs.submitCount,
  });

  const showConfirmError = shouldShowFieldError({
    touched: !!fs.touchedFields.confirmNewPassword,
    dirty: !!fs.dirtyFields.confirmNewPassword,
    submitCount: fs.submitCount,
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);

    try {
      await changePasswordWithCurrentPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      toast.success("Password updated ✅");
      form.reset();
    } catch (err: unknown) {
      const msg = firebaseAuthErrorMessage(err);
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold text-(--text)">Settings</h1>

      {/* Account card */}
      <div className="mb-4 rounded-2xl border border-(--panel-border) bg-(--panel) p-5">
        <div className="text-sm font-semibold text-(--text)">Account</div>
        <div className="mt-2 text-sm text-(--muted)">Signed in as</div>
        <div className="mt-1 rounded-xl border border-(--panel-border) bg-(--input-bg) px-4 py-3 text-sm text-(--text)">
          {email}
        </div>
      </div>

      {/* Password card */}
      <div className="rounded-2xl border border-(--panel-border) bg-(--panel) p-5">
        <div className="mb-1 text-sm font-semibold text-(--text)">Change password</div>
        <p className="mb-4 text-sm text-(--muted)">
          For security, enter your current password first.
        </p>

        {serverError && (
          <div className="mb-4 rounded-xl border border-(--danger-border) bg-(--danger-bg) px-4 py-3 text-sm text-(--danger-text)">
            {serverError}
          </div>
        )}

        <form noValidate className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Field
            label="Current password"
            error={showCurrentError ? fs.errors.currentPassword?.message : undefined}
          >
            <Controller
              name="currentPassword"
              control={form.control}
              render={({ field }) => (
                <PasswordInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  autoComplete="current-password"
                  placeholder="Current password"
                  hasError={!!fs.errors.currentPassword}
                  disabled={submitting}
                />
              )}
            />
          </Field>

          <Field
            label="New password"
            error={showNewError ? fs.errors.newPassword?.message : undefined}
          >
            <Controller
              name="newPassword"
              control={form.control}
              render={({ field }) => (
                <PasswordInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  autoComplete="new-password"
                  placeholder="New password"
                  hasError={!!fs.errors.newPassword}
                  disabled={submitting}
                />
              )}
            />
          </Field>

          <Field
            label="Confirm new password"
            error={showConfirmError ? fs.errors.confirmNewPassword?.message : undefined}
          >
            <Controller
              name="confirmNewPassword"
              control={form.control}
              render={({ field }) => (
                <PasswordInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  hasError={!!fs.errors.confirmNewPassword}
                  disabled={submitting}
                />
              )}
            />
          </Field>

          <button
            type="submit"
            disabled={!fs.isValid || submitting}
            className={cn(
              "w-full rounded-xl px-4 py-3 font-semibold transition border",
              "border-(--panel-border)",
              "bg-(--primary) text-white",
              "hover:bg-(--primary-hover) active:bg-(--primary-active)",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
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
      <label className="mb-1 block text-sm font-medium text-(--text)">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
