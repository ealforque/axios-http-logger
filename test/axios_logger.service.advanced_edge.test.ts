import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");
(fs.appendFileSync as jest.Mock).mockImplementation(() => {});
(fs.readdirSync as jest.Mock).mockImplementation(() => [
  "axios-http-2026-02-01.log",
  "axios-http-2026-03-10.log",
  "axios-http-2026-03-11.log",
]);
(fs.unlinkSync as jest.Mock).mockImplementation(() => {});

const logger = new AxiosHttpLoggerService();

// Enable local time for testing
logger["useLocalTime"] = true;

describe("AxiosHttpLoggerService advanced edge case handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should redact sensitive fields in log", () => {
    const error = {
      response: {
        config: {
          url: "https://example.com/api",
          method: "post",
          params: { token: "abc", password: "123", foo: "bar" },
          data: { authorization: "secret", nested: { password: "hidden" } },
        },
        status: 200,
        headers: { authorization: "secret" },
        data: { token: "abc", password: "123", foo: "bar" },
      },
    };
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("[REDACTED]");
    expect(callArgs).not.toContain("abc"); // token value
    expect(callArgs).not.toContain("123"); // password value
    expect(callArgs).not.toContain("secret"); // authorization value
    expect(callArgs).toContain("Axios Error Response");
  });

  it("should log non-HTTP error with code, message, stack", () => {
    const error = {
      code: "ECONNREFUSED",
      message: "Network down",
      stack: "stacktrace",
    };
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Non-HTTP Error");
    expect(callArgs).toContain("ECONNREFUSED");
    expect(callArgs).toContain("Network down");
    expect(callArgs).toContain("stacktrace");
  });

  it("should use local time for log file and timestamp", () => {
    const error = {
      response: {
        config: {
          url: "https://example.com/api",
          method: "get",
          params: {},
          data: {},
        },
        status: 200,
        headers: {},
        data: {},
      },
    };
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain(new Date().toLocaleString().slice(0, 10));
  });

  it("should rotate logs and delete old log files", () => {
    logger.logError({ code: "ECONNREFUSED", message: "Network down" } as any);
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining("2026-02-01.log"),
    );
  });
});
