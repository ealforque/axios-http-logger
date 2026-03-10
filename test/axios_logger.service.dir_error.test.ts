import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");

const invalidPath = "/invalid/path";
process.env.AXIOS_LOGGER_PATH = invalidPath;

// Helper: always return false for existsSync, simulate mkdirSync error
(fs.existsSync as jest.Mock).mockImplementation(() => false);

describe("AxiosHttpLoggerService log directory error handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AXIOS_LOGGER_PATH = invalidPath;
  });

  it("should throw error if log directory creation fails", () => {
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });
    expect(() => new AxiosHttpLoggerService()).toThrow(
      /Unable to create log directory/,
    );
  });

  it("should throw error if log directory is not writable", () => {
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.accessSync as jest.Mock).mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });
    expect(() => new AxiosHttpLoggerService()).toThrow(/is not writable/);
  });
});
