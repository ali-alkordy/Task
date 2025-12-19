import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  name?: string;

  placeholder?: string;
  autoComplete?: string;

  hasError?: boolean;
  disabled?: boolean;
};

export default function PasswordInput({
  value,
  onChange,
  onBlur,
  name,
  placeholder = "••••••••",
  autoComplete = "current-password",
  hasError = false,
  disabled = false,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={[
          "w-full rounded-xl border bg-black/30 px-4 py-3 pr-12 text-white placeholder:text-white/30 outline-none",
          "focus:ring-2 focus:ring-blue-500/60",
          hasError ? "border-red-500/60" : "border-white/10",
          disabled ? "cursor-not-allowed opacity-70" : "",
        ].join(" ")}
      />

      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
