import type { AxiosError } from "axios";

type ApiErrorBody = {
  message?: string | string[];
};

/**
 * Shared error-message extraction for the SupportDesk API contract
 * (array messages, prefixed network errors, and fallbacks).
 */
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
