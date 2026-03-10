import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");

(fs.appendFileSync as jest.Mock).mockImplementation(() => {});

const logger = new AxiosHttpLoggerService();

describe("AxiosHttpLoggerService circular reference error handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log error with [Circular] for circular references", () => {
    const error: any = { message: "Circular error" };
    error.self = error; // Circular reference
    logger.logError(error);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error (Malformed)");
    expect(callArgs).toContain("[Circular]");
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
    };
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];

    expect(callArgs).toContain("[object Object]");
  });
});
