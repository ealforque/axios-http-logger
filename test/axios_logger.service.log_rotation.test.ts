import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");
(fs.appendFileSync as jest.Mock).mockImplementation(() => {});
(fs.readdirSync as jest.Mock).mockImplementation(() => [
  "axios-http-2026-02-01.log",
  "axios-http-2026-03-10.log",
  "axios-http-2026-03-11.log",
  `axios-http-${new Date().toISOString().slice(0, 10)}.log`,
]);
(fs.unlinkSync as jest.Mock).mockImplementation(() => {});

const logger = new AxiosHttpLoggerService();

describe("AxiosHttpLoggerService log rotation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should rotate logs and delete old log files", () => {
    logger.logError({ code: "ECONNREFUSED", message: "Network down" } as any);
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining("2026-02-01.log"),
    );
  });

  it("should not delete recent log files", () => {
    logger.logError({ code: "ECONNREFUSED", message: "Network down" } as any);
    const today = new Date().toISOString().slice(0, 10);
    expect(fs.unlinkSync).not.toHaveBeenCalledWith(
      expect.stringContaining(today),
    );
  });
});
