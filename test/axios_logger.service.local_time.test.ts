import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");
(fs.appendFileSync as jest.Mock).mockImplementation(() => {});

const logger = new AxiosHttpLoggerService();

// Enable local time for testing
logger["useLocalTime"] = true;

describe("AxiosHttpLoggerService local time handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
