import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");

const logger = new AxiosHttpLoggerService();
const logFilePath = logger["getLogFilePath"]();
const lockFilePath = logFilePath + ".lock";

// Helper to simulate lock file
let lockExists = false;
(fs.existsSync as jest.Mock).mockImplementation((file) => {
  if (file === lockFilePath) return lockExists;
  if (file === logFilePath) return true;
  return false;
});
(fs.writeFileSync as jest.Mock).mockImplementation((file) => {
  if (file === lockFilePath) lockExists = true;
});
(fs.unlinkSync as jest.Mock).mockImplementation((file) => {
  if (file === lockFilePath) lockExists = false;
});
(fs.appendFileSync as jest.Mock).mockImplementation(() => {});

// Atomics.wait is not available in Node.js, so mock it
(global as any).Atomics = { wait: jest.fn() };

describe("AxiosHttpLoggerService concurrent write handling", () => {
  beforeEach(() => {
    lockExists = false;
    jest.clearAllMocks();
  });

  it("should wait for lock file and then write log", () => {
    // Simulate lock file present for first 3 checks, then released
    let callCount = 0;
    (fs.existsSync as jest.Mock).mockImplementation((file) => {
      if (file === lockFilePath) {
        callCount++;
        return callCount < 4; // lock present for 3 checks
      }
      if (file === logFilePath) return true;
      return false;
    });
    logger["writeLog"]("test message");
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      logFilePath,
      "test message\n",
      { encoding: "utf8" },
    );
  });

  it("should throw timeout error if lock file persists", () => {
    // Simulate lock file always present
    (fs.existsSync as jest.Mock).mockImplementation((file) => {
      if (file === lockFilePath) return true;
      if (file === logFilePath) return true;
      return false;
    });
    let waited = 0;
    (global as any).Atomics.wait = () => {
      waited += 50;
    };
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    expect(() => logger["writeLog"]("test message")).toThrow(
      /Log file lock timeout/,
    );
    expect(waited).toBeGreaterThan(2000);
  });

  it("should throw error if appendFileSync fails", () => {
    // Simulate lock file not present
    (fs.existsSync as jest.Mock).mockImplementation((file) => {
      if (file === lockFilePath) return false;
      if (file === logFilePath) return true;
      return false;
    });
    (fs.appendFileSync as jest.Mock).mockImplementation(() => {
      throw new Error("Disk full");
    });
    expect(() => logger["writeLog"]("test message")).toThrow(
      /Unable to write log file/,
    );
  });

  it("should remove lock file if error occurs and lock exists", () => {
    // Simulate lock file created in try block, present in catch block
    let lockCreated = false;
    (fs.existsSync as jest.Mock).mockImplementation((file) => {
      if (file === lockFilePath) return lockCreated;
      if (file === logFilePath) return true;
      return false;
    });
    (fs.writeFileSync as jest.Mock).mockImplementation((file) => {
      if (file === lockFilePath) lockCreated = true;
    });
    (fs.appendFileSync as jest.Mock).mockImplementation(() => {
      throw new Error("Disk full");
    });
    const unlinkMock = fs.unlinkSync as jest.Mock;
    expect(() => logger["writeLog"]("test message")).toThrow(
      /Unable to write log file/,
    );
    expect(unlinkMock).toHaveBeenCalledWith(lockFilePath);
  });
});
