import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");

describe("AxiosHttpLoggerService writeLog error handling", () => {
  const logger = new AxiosHttpLoggerService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should catch and rethrow custom error from fs.appendFileSync", () => {
    (fs.appendFileSync as jest.Mock).mockImplementation(() => {
      throw new Error("Disk full");
    });
    expect(() => logger["writeLog"]("test message")).toThrow(
      /AxiosHttpLogger: Unable to write log file/,
    );
  });

  it("should throw custom error when fs.appendFileSync fails", () => {
    const error = new Error("Permission denied");
    (fs.appendFileSync as jest.Mock).mockImplementation(() => {
      throw error;
    });
    expect(() => logger["writeLog"]("test message")).toThrow(
      /AxiosHttpLogger: Unable to write log file/,
    );
  });
});
