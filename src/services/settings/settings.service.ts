import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "../../api/firebase";
export function getCurrentUserEmail() {
  return auth.currentUser?.email ?? null;
}

/**
 * Change password for current user.
 * - Re-authenticates using current password (recommended + avoids requires-recent-login issues).
 */
export async function changePasswordWithCurrentPassword(params: {
  currentPassword: string;
  newPassword: string;
}) {
  const { currentPassword, newPassword } = params;

  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user.");

  const email = user.email;
  if (!email) throw new Error("Your account has no email (cannot re-authenticate).");

  // ✅ re-auth first (required for sensitive operations)
  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  // ✅ update
  await updatePassword(user, newPassword);
}
