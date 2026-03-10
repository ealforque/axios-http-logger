import fs from "fs";
import path from "path";

import AxiosHttpLogger from "../src/axios_http_logger.service";

jest.mock("../src/config/axiox_http_logger.config", () => ({
  AXIOS_LOGGER_PATH: "",
}));
jest.mock("fs");

describe("AxiosLogger (logsDir branch)", () => {
  beforeEach(() => {
    (fs.unlinkSync as jest.Mock).mockClear();
    (fs.mkdirSync as jest.Mock).mockClear();
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
  });

  it("should use logsDir if AXIOS_LOGGER_PATH is empty", async () => {
    const logsDir = path.join(process.cwd(), "logs");

    new AxiosHttpLogger();

    expect(fs.mkdirSync).toHaveBeenCalledWith(logsDir, { recursive: true });
    expect(fs.existsSync(logsDir)).toBeTruthy();
  });
});
