import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");

(fs.appendFileSync as jest.Mock).mockImplementation(() => {});

const logger = new AxiosHttpLoggerService();

describe("AxiosHttpLoggerService malformed error object handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log minimal entry for error missing response", () => {
    const error = { message: "Something went wrong" };
    logger.logError(error as any);
    const logMsg = JSON.stringify({
      type: "Axios Error (Malformed)",
      error,
      timestamp: expect.any(String),
    });
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("Axios Error (Malformed)"),
      { encoding: "utf8" },
    );
  });

  it("should log minimal entry for completely malformed error", () => {
    logger.logError("not an object" as any);
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("Axios Error (Malformed)"),
      { encoding: "utf8" },
    );
  });

  it("should log full entry for valid AxiosError", () => {
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
        data: { msg: "fail" },
      },
    };
    logger.logError(error as any);
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("Axios Error Response"),
      { encoding: "utf8" },
    );
  });
});
