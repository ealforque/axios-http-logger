import fs from "fs";
import path from "path";

import AxiosLogger from "../src/axios_http_logger.service";

jest.mock("../src/config/axiox_http_logger.config", () => ({
  AXIOS_LOGGER_PATH: "path",
}));
jest.mock("fs");

describe("AxiosLogger", () => {
  const logDir = path.join(process.cwd(), "logs");
  const logFile = path.join(
    logDir,
    `axios-http-${new Date().toISOString().slice(0, 10)}.log`,
  );

  beforeEach(() => {
    (fs.unlinkSync as jest.Mock).mockClear();
    (fs.mkdirSync as jest.Mock).mockClear();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue("");
  });

  it("should create log directory if it does not exist", () => {
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const logger = new AxiosLogger();
    expect(fs.mkdirSync).toHaveBeenCalledWith("path", { recursive: true });
    expect(fs.existsSync("path")).toBeTruthy();
  });

  it("should log error responses to file", async () => {
    const instance = require("axios").create();
    const logger = new AxiosLogger();
    logger.attach(instance);

    (fs.readFileSync as jest.Mock).mockReturnValue(
      "[Axios Error Response] 404 error\n",
    );

    try {
      await instance.get("https://httpbin.org/status/404");
    } catch (e) {}

    const fileContent = fs.readFileSync(logFile, "utf8");

    expect(fileContent).toContain("Axios Error Response");
  });

  it("should log generic errors to file", async () => {
    const instance = require("axios").create();
    const logger = new AxiosLogger();
    logger.attach(instance);

    (fs.readFileSync as jest.Mock).mockReturnValue(
      "[Axios Error] generic error\n",
    );

    try {
      await instance.get("http://invalid.localhost");
    } catch (e) {}

    const fileContent = fs.readFileSync(logFile, "utf8");

    expect(fileContent).toContain("Axios Error");
  });

  it("should not log normal responses", async () => {
    const instance = require("axios").create();
    const logger = new AxiosLogger();
    logger.attach(instance);

    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await instance.get("https://httpbin.org/get");

    expect(fs.existsSync(logFile)).toBeFalsy();
  });
});
