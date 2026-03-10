import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");

(fs.appendFileSync as jest.Mock).mockImplementation(() => {});

const logger = new AxiosHttpLoggerService();

describe("AxiosHttpLoggerService large responseData handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should truncate large responseData in log", () => {
    const bigData = "A".repeat(15000); // 15KB string
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
        data: bigData,
      },
    };
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error Response");
    expect(callArgs).toContain("...[truncated");
    expect(callArgs.length).toBeLessThan(20000); // log entry is not huge
  });

  it("should log normal responseData if small", () => {
    const smallData = "OK";
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
        data: smallData,
      },
    };
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Error Response");
    expect(callArgs).toContain("OK");
    expect(callArgs).not.toContain("...[truncated");
  });

  it("should log '[unloggable responseData]' if serialization fails", () => {
    const originalByteLength = Buffer.byteLength;
    Buffer.byteLength = () => {
      throw new Error("fail");
    };
    const error = {
      response: {
        config: {
          url: "https://example.com/api",
          method: "get",
          params: {},
          data: {},
        },
        status: 500,
        headers: {},
        data: "A".repeat(15000),
      },
    };
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("[unloggable responseData]");
    Buffer.byteLength = originalByteLength;
  });
});
