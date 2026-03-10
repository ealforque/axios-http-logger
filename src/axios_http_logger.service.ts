import { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import fs from "fs";
import path from "path";

import { AXIOS_LOGGER_PATH } from "./config/axiox_http_logger.config";
import { AxiosLoggerServiceInterface } from "./interfaces/axios_logger.interface";

class AxiosHttpLogger implements AxiosLoggerServiceInterface {
  private logDir: string;

  constructor() {
    const logsDir = path.join(process.cwd(), "logs");
    this.logDir =
      AXIOS_LOGGER_PATH && AXIOS_LOGGER_PATH.trim() !== ""
        ? AXIOS_LOGGER_PATH
        : logsDir;
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch {
        throw new Error(
          `AxiosHttpLogger: Unable to create log directory at ${this.logDir}`,
        );
      }
    }
  }

  private getLogFilePath(): string {
    const date = new Date();
    const day = date.toISOString().slice(0, 10);
    return path.join(this.logDir, `axios-http-${day}.log`);
  }

  private writeLog(message: string): void {
    const logFilePath = this.getLogFilePath();
    fs.appendFileSync(logFilePath, message + "\n", { encoding: "utf8" });
  }

  logError(error: AxiosError): void {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      (error as AxiosError).response
    ) {
      const errResp = (error as AxiosError).response as AxiosResponse;
      const logMsg = JSON.stringify({
        type: "Axios Error Response",
        url: errResp.config.url,
        method: errResp.config.method,
        params: errResp.config.params,
        data: errResp.config.data,
        status: errResp.status,
        headers: errResp.headers,
        responseData: errResp.data,
        timestamp: new Date().toISOString(),
      });
      this.writeLog(logMsg);
    } else {
      const logMsg = JSON.stringify({
        type: "Axios Error",
        error,
        timestamp: new Date().toISOString(),
      });
      this.writeLog(logMsg);
    }
  }

  attach(axiosInstance: AxiosInstance): void {
    axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        this.logError(error);
        return Promise.reject(error);
      },
    );
  }
}

export default AxiosHttpLogger;
