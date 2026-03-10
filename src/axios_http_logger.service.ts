import { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import fs from "fs";
import path from "path";

import { AXIOS_LOGGER_PATH } from "./config/axiox_http_logger.config";
import { AxiosLoggerServiceInterface } from "./interfaces/axios_logger.interface";

class AxiosHttpLogger implements AxiosLoggerServiceInterface {
  private logDir: string;

  private sensitiveFields = ["password", "token", "authorization"];
  private useLocalTime = false;

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

  // Redact sensitive fields from an object, handles circular refs
  private redact(obj: any, seen = new WeakSet()): any {
    if (typeof obj !== "object" || obj === null) return obj;
    if (seen.has(obj)) return "[Circular]";
    seen.add(obj);
    const clone: Record<string, any> = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      if (this.sensitiveFields.includes(key.toLowerCase())) {
        clone[key] = "[REDACTED]";
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        clone[key] = this.redact(obj[key], seen);
      } else {
        clone[key] = obj[key];
      }
    }
    return clone;
  }

  private rotateLogs(maxDays = 30): void {
    const logDir = this.logDir;
    try {
      const files = fs.readdirSync(logDir);
      const now = Date.now();
      files.forEach((file) => {
        if (file.startsWith("axios-http-") && file.endsWith(".log")) {
          const dateStr = file.slice(11, 21); // YYYY-MM-DD
          const fileDate = new Date(dateStr).getTime();
          if (now - fileDate > maxDays * 86400000) {
            fs.unlinkSync(path.join(logDir, file));
          }
        }
      });
    } catch {}
  }

  private getLogFilePath(): string {
    const date = this.useLocalTime
      ? new Date()
      : new Date(new Date().toUTCString());
    const day = this.useLocalTime
      ? date.toISOString().slice(0, 10)
      : new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10);
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

  private safeStringify(obj: any): string {
    const seen = new WeakSet();
    try {
      return JSON.stringify(obj, function (key, value) {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }
        return value;
      });
    } catch {
      return String(obj);
    }
  }

  private truncateData(data: any, maxBytes = 10240): any {
    try {
      const str = typeof data === "string" ? data : this.safeStringify(data);
      if (Buffer.byteLength(str, "utf8") > maxBytes) {
        return (
          str.slice(0, maxBytes) +
          `...[truncated, ${Buffer.byteLength(str, "utf8") - maxBytes} bytes omitted]`
        );
      }
      return data;
    } catch {
      return "[unloggable responseData]";
    }
  }

  logError(error: AxiosError | any): void {
    this.rotateLogs(); // Clean up old logs
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
      const logMsg = this.safeStringify({
        type: "Axios Error Response",
        url: errResp.config.url,
        method: errResp.config.method,
        params: this.redact(errResp.config.params),
        data: this.redact(errResp.config.data),
        status: errResp.status,
        headers: this.redact(errResp.headers),
        responseData: this.truncateData(this.redact(errResp.data)),
        timestamp: this.useLocalTime
          ? new Date().toLocaleString()
          : new Date().toISOString(),
      });
      this.writeLog(logMsg);
    } else if (typeof error === "object" && error !== null) {
      // Network error, timeout, etc.
      const logMsg = this.safeStringify({
        type: "Axios Non-HTTP Error",
        code: error.code,
        message: error.message,
        stack: error.stack,
        timestamp: this.useLocalTime
          ? new Date().toLocaleString()
          : new Date().toISOString(),
      });
      this.writeLog(logMsg);
    } else {
      // Malformed or non-conforming error object
      const logMsg = this.safeStringify({
        type: "Axios Error (Malformed)",
        error: typeof error === "object" ? error : String(error),
        timestamp: this.useLocalTime
          ? new Date().toLocaleString()
          : new Date().toISOString(),
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
