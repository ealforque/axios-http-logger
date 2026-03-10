import fs from "fs";

import AxiosHttpLogger from "../src/axios_http_logger.service";

jest.mock("../src/config/axiox_http_logger.config", () => ({
  AXIOS_LOGGER_PATH: "path",
}));
jest.mock("fs");

describe("AxiosLogger (logDir exists branch)", () => {
  beforeEach(() => {
    (fs.unlinkSync as jest.Mock).mockClear();
    (fs.mkdirSync as jest.Mock).mockClear();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it("should not create log directory if it already exists", () => {
    new AxiosHttpLogger();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
});
