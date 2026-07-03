import axios, { AxiosError, type AxiosRequestConfig } from "axios";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const http = axios.create({ baseURL: API_BASE });

const errorDetail = (detail: unknown): string | null => {
  if (typeof detail === "string") return detail;
  if (!Array.isArray(detail)) return null;
  return detail.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "msg" in item) return String(item.msg);
    return null;
  }).filter(Boolean).join(", ") || null;
};

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: unknown }>) => {
    const message = errorDetail(error.response?.data?.detail) || (error.response ? "Ошибка запроса" : "Сервер недоступен");
    return Promise.reject(new ApiError(error.response?.status ?? 0, message));
  },
);

export async function apiRequest<T>(path: string, options: AxiosRequestConfig = {}): Promise<ApiResponse<T>> {
  const response = await http.request<ApiResponse<T>>({ url: path, ...options });
  return response.data;
}
