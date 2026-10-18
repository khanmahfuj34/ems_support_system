import type { AxiosError } from "axios";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { LoginValues, RegisterValues } from "@/features/auth/schemas/auth.schema";
import type { LoginResponse, RegisterResponse, UserProfile } from "@/features/auth/types/auth.types";
import { clearAccessToken, setAccessToken } from "@/features/auth/services/token";

type ApiErrorBody = {
  message?: string | string[];
};

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

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  const message = axiosError.response?.data?.message;

  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string" && message.trim()) return message;
  if (axiosError.code === "ERR_NETWORK") {
    return "The SupportDesk API could not be reached. Check that the backend is running.";
  }

  return fallback;
}
