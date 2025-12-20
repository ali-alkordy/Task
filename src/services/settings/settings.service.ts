// src/services/settings/settings.service.ts
import { axiosInstance, functionsConfig } from "../../api/axios";
import * as AuthService from "../Auth/auth.service"; 

export function getCurrentUserEmail(): string | null {
  const session = AuthService.getSession();
  return session?.user?.email ?? null;
}

export async function changePasswordWithCurrentPassword(params: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const session = AuthService.getSession();
  if (!session?.accessToken) {
    throw new Error("Not authenticated");
  }

  // axios interceptor will attach Authorization: Bearer <accessToken>
  await axiosInstance.post(
    "/changePassword",
    {
      currentPassword: params.currentPassword,
      newPassword: params.newPassword,
    },
    functionsConfig()
  );
}
