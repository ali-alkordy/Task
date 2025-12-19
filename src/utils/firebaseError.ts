const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/user-not-found": "No user found with this email.",
  "auth/wrong-password": "Wrong password.",
  "auth/email-already-in-use": "This email is already registered.",
  "auth/weak-password": "Password is too weak (min 6 characters).",
  "auth/invalid-email": "Invalid email format.",
};

export function firebaseAuthErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string };

  if (e?.code && FIREBASE_AUTH_MESSAGES[e.code]) return FIREBASE_AUTH_MESSAGES[e.code];

  // fallback (don’t show the whole firebase technical message)
  return "Something went wrong. Please try again.";
}
