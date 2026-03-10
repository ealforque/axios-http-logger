import fs from "fs";
import path from "path";

// Use require to avoid hoisting issues with mocks
const AxiosHttpLogger = require("../src/axios_http_logger.service.ts").default;

describe("AxiosHttpLogger log directory creation failure", () => {
  const logDir = path.join(process.cwd(), "logs-mock-fail");
  let originalMkdirSync: typeof fs.mkdirSync;
  let originalExistsSync: typeof fs.existsSync;

  beforeAll(() => {
    originalMkdirSync = fs.mkdirSync;
    originalExistsSync = fs.existsSync;
    jest.spyOn(fs, "existsSync").mockImplementation(() => false);
    jest.spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw new Error("Mock mkdir failure");
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should throw error if log directory creation fails", () => {
    expect(() => {
      new AxiosHttpLogger();
    }).toThrow(/Unable to create log directory/);
  });
});
