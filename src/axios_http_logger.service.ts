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
      } catch (err) {
        throw new Error(
          `AxiosHttpLogger: Unable to create log directory at ${this.logDir}. Reason: ${(err as Error).message}`,
        );
      }
    }

    try {
      fs.accessSync(this.logDir, fs.constants.W_OK);
    } catch (err) {
      throw new Error(
        `AxiosHttpLogger: Log directory at ${this.logDir} is not writable. Reason: ${(err as Error).message}`,
      );
    }
  }

  private getLogFilePath(): string {
    const date = new Date();
    const day = date.toISOString().slice(0, 10);
    return path.join(this.logDir, `axios-http-${day}.log`);
  }

  private writeLog(message: string): void {
    const logFilePath = this.getLogFilePath();
    const lockFilePath = logFilePath + ".lock";
    let waited = 0;
    while (fs.existsSync(lockFilePath)) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
      waited += 50;
      if (waited > 2000) {
        throw new Error(
          `AxiosHttpLogger: Log file lock timeout at ${logFilePath}`,
        );
      }
    }
    try {
      fs.writeFileSync(lockFilePath, "lock");
      fs.appendFileSync(logFilePath, message + "\n", { encoding: "utf8" });
      fs.unlinkSync(lockFilePath);
    } catch {
      if (fs.existsSync(lockFilePath)) fs.unlinkSync(lockFilePath);
      throw new Error(
        `AxiosHttpLogger: Unable to write log file at ${logFilePath}`,
      );
    }
  }

  logError(error: AxiosError): void {
    const resp = (error as AxiosError)?.response;
    if (
      typeof error === "object" &&
      error !== null &&
      resp &&
      typeof resp === "object" &&
      resp.config &&
      typeof resp.config === "object"
    ) {
      const errResp = resp as AxiosResponse;
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
        type: "Axios Error (Malformed)",
        error: typeof error === "object" ? error : String(error),
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
