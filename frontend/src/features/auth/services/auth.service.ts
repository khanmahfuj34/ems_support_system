import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { LoginValues, RegisterValues } from "@/features/auth/schemas/auth.schema";
import type { LoginResponse, RegisterResponse, UserProfile } from "@/features/auth/types/auth.types";
import { clearAccessToken, setAccessToken } from "@/features/auth/services/token";

export async function registerAccount(values: Pick<RegisterValues, "fullName" | "email" | "password">) {
  const { data } = await apiClient.post<RegisterResponse>(API_ENDPOINTS.auth.register, {
    name: values.fullName,
    email: values.email,
    password: values.password,
  });

  return data;
}

export async function login(credentials: Pick<LoginValues, "email" | "password">) {
  const { data } = await apiClient.post<LoginResponse>(API_ENDPOINTS.auth.login, credentials);
  setAccessToken(data.accessToken);
  return data.user;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<UserProfile>(API_ENDPOINTS.auth.me);
  return data;
}

export function logout() {
  clearAccessToken();
}
