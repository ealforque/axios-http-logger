import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");

(fs.appendFileSync as jest.Mock).mockImplementation(() => {});

const logger = new AxiosHttpLoggerService();

describe("AxiosHttpLoggerService circular reference error handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log error with message for circular references", () => {
    const error: any = { message: "Circular error" };
    error.self = error; // Circular reference
    logger.logError(error);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Non-HTTP Error");
    expect(callArgs).toContain("Circular error");
  });

  it("should log valid AxiosError with circular response data", () => {
    const data: any = { msg: "fail" };
    data.self = data;
    const error = {
      response: {
        config: {
          url: "https://example.com/api",
          method: "get",
          params: {},
          data: {},
        },
        status: 404,
        headers: {},
        data,
      },
    };
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error Response");
    expect(callArgs).toContain("[Circular]");
  });

  it("should fallback to String(obj) if JSON.stringify throws", () => {
    const error = {
      toJSON() {
        throw new Error("fail");
      },
      message: "Fallback error",
    };
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Non-HTTP Error");
    expect(callArgs).toContain("Fallback error");
  });

  it("should cover safeStringify fallback to String(obj)", () => {
    const logger = new AxiosHttpLoggerService();
    // Object that throws in JSON.stringify
    const error = {
      toJSON() {
        throw new Error("fail");
      },
      message: "Fallback coverage",
    };
    // This triggers the catch and fallback to String(obj)
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Fallback coverage");
    expect(callArgs).toContain("Axios Non-HTTP Error");
  });

  it("should cover safeStringify fallback for primitive values", () => {
    const logger = new AxiosHttpLoggerService();
    const result = logger["safeStringify"]("plain string");
    expect(result).toBe(JSON.stringify("plain string"));
  });

  it("should cover safeStringify catch block for object that throws", () => {
    const logger = new AxiosHttpLoggerService();
    const error = {
      toJSON() {
        throw new Error("fail");
      },
      message: "Catch coverage",
    };
    const result = logger["safeStringify"](error);
    expect(result).toBe(String(error));
  });

  it("should cover redact circular reference", () => {
    const logger = new AxiosHttpLoggerService();
    const obj: any = {};
    obj.self = obj;
    const result = logger["redact"](obj);
    expect(result.self).toBe("[Circular]");
  });

  it("should cover rotateLogs catch block", () => {
    const logger = new AxiosHttpLoggerService();
    const original = fs.readdirSync;
    (fs.readdirSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error("fail");
    });
    // Should not throw
    expect(() => logger["rotateLogs"]()).not.toThrow();
    (fs.readdirSync as jest.Mock).mockImplementation(original);
  });

  it("should cover truncateData catch block", () => {
    const logger = new AxiosHttpLoggerService();
    const original = Buffer.byteLength;
    Buffer.byteLength = jest.fn(() => {
      throw new Error("fail");
    });
    const result = logger["truncateData"]({});
    expect(result).toBe("[unloggable responseData]");
    Buffer.byteLength = original;
  });

  it("should cover logError malformed error branch", () => {
    const logger = new AxiosHttpLoggerService();
    logger.logError("not an object");
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error (Malformed)");
    expect(callArgs).toContain("not an object");
  });

  it("should cover redact for array input", () => {
    const logger = new AxiosHttpLoggerService();
    const arr: any[] = [1, { password: "secret" }, 3];
    const result = logger["redact"](arr);
    expect(Array.isArray(result)).toBe(true);
    expect(result[1].password).toBe("[REDACTED]");
  });

  it("should cover safeStringify circular reference branch", () => {
    const logger = new AxiosHttpLoggerService();
    const obj: any = {};
    obj.self = obj;
    const result = logger["safeStringify"](obj);
    expect(result).toContain("[Circular]");
  });

  it("should cover logError malformed error object branch", () => {
    const logger = new AxiosHttpLoggerService();
    logger.logError({ foo: "bar" });
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Non-HTTP Error");
  });

  it("should cover logError malformed error string branch", () => {
    const logger = new AxiosHttpLoggerService();
    logger.logError("just a string error");
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error (Malformed)");
    expect(callArgs).toContain("just a string error");
  });

  it("should cover rotateLogs file pattern branches", () => {
    const logger = new AxiosHttpLoggerService();
    // Only one file matches pattern
    (fs.readdirSync as jest.Mock).mockImplementationOnce(() => [
      "axios-http-2022-01-01.log",
      "not-a-log.txt",
      "axios-http-2022-01-01.txt",
      "random.log",
    ]);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    logger["rotateLogs"](0); // maxDays = 0, should trigger unlink for matching log
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining("axios-http-2022-01-01.log"),
    );
    // Should not call unlink for non-matching files
    expect(fs.unlinkSync).not.toHaveBeenCalledWith(
      expect.stringContaining("not-a-log.txt"),
    );
    expect(fs.unlinkSync).not.toHaveBeenCalledWith(
      expect.stringContaining("axios-http-2022-01-01.txt"),
    );
    expect(fs.unlinkSync).not.toHaveBeenCalledWith(
      expect.stringContaining("random.log"),
    );
  });

  it("should cover logError malformed error with object and primitive", () => {
    const logger = new AxiosHttpLoggerService();
    logger.logError({ foo: "bar" });
    let callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Non-HTTP Error");
    jest.clearAllMocks();
    logger.logError(123);
    callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error (Malformed)");
    expect(callArgs).toContain("123");
  });

  it("should cover logError timestamp branch for useLocalTime true/false", () => {
    const logger = new AxiosHttpLoggerService();
    logger["useLocalTime"] = true;
    logger.logError("local time test");
    let callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error (Malformed)");
    expect(callArgs).toMatch(/timestamp.*\d{1,2}\/\d{1,2}\/\d{4}/); // locale string
    jest.clearAllMocks();
    logger["useLocalTime"] = false;
    logger.logError("utc time test");
    callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error (Malformed)");
    expect(callArgs).toMatch(/timestamp.*\d{4}-\d{2}-\d{2}T/); // ISO string
  });

  it("should cover logError malformed error with null and undefined", () => {
    const logger = new AxiosHttpLoggerService();
    logger.logError(null);
    let callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error (Malformed)");
    expect(callArgs).toContain("null");
    jest.clearAllMocks();
    logger.logError(undefined);
    callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error (Malformed)");
    expect(callArgs).toContain("undefined");
  });
});
