import fs from "fs";

import AxiosHttpLoggerService from "../src/axios_http_logger.service";

jest.mock("fs");
(fs.appendFileSync as jest.Mock).mockImplementation(() => {});

const logger = new AxiosHttpLoggerService();

describe("AxiosHttpLoggerService non-HTTP error logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log non-HTTP error with code, message, stack", () => {
    const error = {
      code: "ECONNREFUSED",
      message: "Network down",
      stack: "stacktrace",
    };
    logger.logError(error as any);
    const callArgs = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
    expect(callArgs).toContain("Axios Non-HTTP Error");
    expect(callArgs).toContain("ECONNREFUSED");
    expect(callArgs).toContain("Network down");
    expect(callArgs).toContain("stacktrace");
  });
});
