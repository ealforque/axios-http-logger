import "dotenv/config";

export const AXIOS_LOGGER_PATH: string = process.env
  .AXIOS_LOGGER_PATH as unknown as string;

export const SLACK_TOKEN: string = process.env.SLACK_TOKEN as unknown as string;
