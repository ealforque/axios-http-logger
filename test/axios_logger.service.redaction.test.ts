import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");
(fs.appendFileSync as jest.Mock).mockImplementation(() => {});

const logger = new AxiosHttpLoggerService();

// Enable local time for testing
logger["useLocalTime"] = true;

describe("AxiosHttpLoggerService sensitive data redaction", () => {
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
});
