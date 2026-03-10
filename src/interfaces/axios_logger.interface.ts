import type { AxiosError, AxiosInstance } from "axios";

export interface AxiosLoggerServiceInterface {
  logError: (error: AxiosError) => void;
  attach: (axiosInstance: AxiosInstance) => void;
}
