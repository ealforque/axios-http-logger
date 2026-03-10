# Axios HTTP Logger

![npm version](https://img.shields.io/npm/v/axios-http-logger)
![build](https://github.com/ealforque/axios-http-logger/actions/workflows/release.yaml/badge.svg)
![license](https://img.shields.io/badge/license-MIT-green)
[![Socket Badge](https://badge.socket.dev/npm/package/axios-http-logger)](https://badge.socket.dev/npm/package/axios-http-logger)

## Description

A TypeScript utility that logs every Axios HTTP request and response automatically. It attaches to an Axios instance and writes logs to a file for each day, capturing request/response details and errors for easy debugging and auditing.

## Features

- **Automatic logging of HTTP errors and responses**
- **File-based log output**: Logs are written to daily log files in a configurable directory
- **Configurable log directory**: Set via `AXIOS_LOGGER_PATH` environment variable
- **Easy integration with Axios**: Attach to any Axios instance
- **Captures request, response, and error details**
- **Test-driven development with Jest**
- **Handles malformed input and file operations gracefully**

## Installation

```bash
npm install @ealforque/axios-http-logger
```

## Usage (Correct Example)

```typescript
import axios from "axios";
import AxiosHttpLogger from "axios-http-logger";

const axiosInstance = axios.create();
const logger = new AxiosHttpLogger();
logger.attach(axiosInstance);

// Now, all HTTP errors/responses will be logged automatically to a file
axiosInstance.get("https://example.com/api").catch((err) => {
  // Error is logged automatically
});
```

### Log Directory Configuration

By default, logs are written to a `logs/` directory in your project root. To customize the log directory, set the `AXIOS_LOGGER_PATH` environment variable:

```env
AXIOS_LOGGER_PATH=/custom/log/path
```

### Example Log Entry

```json
{
  "type": "Axios Error Response",
  "url": "https://example.com/api",
  "method": "get",
  "status": 404,
  "headers": { ... },
  "responseData": { ... },
  "timestamp": "2026-03-10T12:34:56.789Z"
}
```

## Edge Case Handling

### Log Directory Creation Failure

This package handles errors when writing logs to disk. If `fs.appendFileSync` fails (e.g., disk full, permission denied), a custom error is thrown.

```typescript
import AxiosHttpLogger from "./src/axios_http_logger.service";

const logger = new AxiosHttpLogger();

try {
  // This will attempt to write to the log file
  logger["writeLog"]("Test log message");
} catch (err) {
  // Error is thrown; handle as needed (e.g., alert, retry, etc.)
  // Example: display error message or take corrective action
}
```

If an error occurs, you will see an error like:

```
AxiosHttpLogger: Unable to write log file at /path/to/logfile.log
```

The error is thrown, so you can handle it in your application logic.

### Log File Write Failure

If `fs.appendFileSync` fails (e.g., disk full, permission denied), the logger throws a custom error. This ensures that file write errors are not silently ignored and can be handled in your application logic.

```typescript
import AxiosHttpLogger from "./src/axios_http_logger.service";

const logger = new AxiosHttpLogger();

try {
  // This will attempt to write to the log file
  logger["writeLog"]("Test log message");
} catch (err) {
  // Handle log file write errors
  if (err.message.includes("Unable to write log file")) {
    // Log file write failed (e.g., disk full, permission denied)
    // Example: alert, retry, or log to alternative location
  }
}
```

Example error:

```
AxiosHttpLogger: Unable to write log file at /path/to/logfile.log
```

The error is thrown, so you can handle it in your application logic.

### Concurrent Writes

This package uses a file lock mechanism to prevent race conditions and file corruption when multiple processes write logs simultaneously. If a lock file is present, log writes wait for up to 2 seconds before timing out.

```typescript
import AxiosHttpLogger from "./src/axios_http_logger.service";

const logger = new AxiosHttpLogger();

try {
  // This will attempt to write to the log file, waiting if another process is writing
  logger["writeLog"]("Test log message");
} catch (err) {
  // If the lock file persists, a timeout error is thrown
  if (err.message.includes("Log file lock timeout")) {
    // Handle log write contention (e.g., retry, alert)
  } else {
    // Handle other log write errors (e.g., disk full)
  }
}
```

If an error occurs, you may see:

```
AxiosHttpLogger: Log file lock timeout at /path/to/logfile.log
AxiosHttpLogger: Unable to write log file at /path/to/logfile.log
```

The error is thrown, so you can handle it in your application logic.

## AXIOS_LOGGER_PATH Invalid

If `AXIOS_LOGGER_PATH` is set to a non-existent or invalid path, directory creation may fail or the directory may not be writable. The logger will throw a clear error and will not fallback silently.

```typescript
import AxiosHttpLogger from "./src/axios_http_logger.service";

process.env.AXIOS_LOGGER_PATH = "/invalid/path";

try {
  const logger = new AxiosHttpLogger();
  logger["writeLog"]("Test log message");
} catch (err) {
  // Handle log directory errors
  if (err.message.includes("Unable to create log directory")) {
    // Directory creation failed (e.g., permission denied)
  } else if (err.message.includes("is not writable")) {
    // Directory exists but is not writable
  }
}
```

Example errors:

```
AxiosHttpLogger: Unable to create log directory at /invalid/path. Reason: EACCES: permission denied
AxiosHttpLogger: Log directory at /invalid/path is not writable. Reason: EACCES: permission denied
```

The error is thrown, so you can handle it in your application logic.

### Malformed Error Object Handling

If the error object passed to the logger does not conform to `AxiosError` (e.g., missing `response`, malformed structure), the logger will log a minimal entry to avoid misleading information.

```typescript
import AxiosHttpLogger from "./src/axios_http_logger.service";

const logger = new AxiosHttpLogger();

// Example: error missing response
const malformedError = { message: "Something went wrong" };
logger.logError(malformedError as any);

// Example: completely malformed error
logger.logError("not an object" as any);
```

Example log entries:

```json
{
  "type": "Axios Error (Malformed)",
  "error": { "message": "Something went wrong" },
  "timestamp": "2026-03-11T12:34:56.789Z"
}
{
  "type": "Axios Error (Malformed)",
  "error": "not an object",
  "timestamp": "2026-03-11T12:34:56.789Z"
}
```

For valid `AxiosError` objects, the logger will log full request/response details. For malformed errors, only minimal information is logged, so you can handle or investigate as needed.

### Circular References in Error Object

If the error object contains circular references, `JSON.stringify` will normally throw and the log will not be written. This logger uses a safe serialization method that replaces circular references with `[Circular]` so logs are always written.

```typescript
import AxiosHttpLogger from "./src/axios_http_logger.service";

const logger = new AxiosHttpLogger();

// Example: error with circular reference
const circularError: any = { message: "Circular error" };
circularError.self = circularError;
logger.logError(circularError);

// Example: valid AxiosError with circular response data
const data: any = { msg: "fail" };
data.self = data;
const error = {
  response: {
    config: {
      url: "https://example.com/api",
      method: "get",
      params: {},
      data: {},
    },
    status: 404,
    headers: {},
    data,
  },
};
logger.logError(error as any);
```

Example log entries:

```json
{
  "type": "Axios Error (Malformed)",
  "error": { "message": "Circular error", "self": "[Circular]" },
  "timestamp": "2026-03-11T12:34:56.789Z"
}
{
  "type": "Axios Error Response",
  "url": "https://example.com/api",
  "method": "get",
  "params": {},
  "data": {},
  "status": 404,
  "headers": {},
  "responseData": { "msg": "fail", "self": "[Circular]" },
  "timestamp": "2026-03-11T12:34:56.789Z"
}
```

Circular references are replaced with `[Circular]` so logs are always written and readable.

## Large Response Data Handling

Logging large `responseData` may cause performance issues or excessively large log files. This logger automatically truncates `responseData` to 10KB and indicates truncation in the log entry.

```typescript
import AxiosHttpLogger from "./src/axios_http_logger.service";

const logger = new AxiosHttpLogger();

// Example: error with large responseData
const bigData = "A".repeat(15000); // 15KB string
const error = {
  response: {
    config: {
      url: "https://example.com/api",
      method: "get",
      params: {},
      data: {},
    },
    status: 404,
    headers: {},
    data: bigData,
  },
};
logger.logError(error as any);
```

Example log entry:

```json
{
  "type": "Axios Error Response",
  "url": "https://example.com/api",
  "method": "get",
  "params": {},
  "data": {},
  "status": 404,
  "headers": {},
  "responseData": "AAAAAAAAAA...[truncated, 4990 bytes omitted]",
  "timestamp": "2026-03-11T12:34:56.789Z"
}
```

If `responseData` exceeds 10KB, it is truncated and the log entry indicates how many bytes were omitted. This keeps logs performant and readable.

### Non-HTTP Errors

Errors not related to HTTP (e.g., network errors, timeouts without a response) are logged with type `Axios Non-HTTP Error`, including `code`, `message`, and `stack` fields.

```typescript
const error = {
  code: "ECONNREFUSED",
  message: "Network down",
  stack: "stacktrace",
};
logger.logError(error);
// Log entry will include type, code, message, stack, and timestamp
```

### Timezone Handling

Log file naming and timestamps use UTC by default. To use local time, set `logger.useLocalTime = true`.

```typescript
logger.useLocalTime = true;
logger.logError(error);
// Log file and timestamp will use local time
```

### Log Rotation

Old log files are automatically deleted based on a configurable retention period (default: 30 days).

```typescript
// To customize retention period:
logger.rotateLogs(7); // Keep logs for 7 days
```

### Sensitive Data Redaction

Sensitive fields (e.g., password, token, authorization) are automatically redacted from logs. You can customize the fields:

```typescript
logger.sensitiveFields = ["password", "token", "authorization", "secret"];
logger.logError(error);
// Log entry will redact these fields recursively, including nested and circular references
```

### Example Log Entry (Sensitive Data Redacted)

```json
{
  "type": "Axios Error Response",
  "url": "https://example.com/api",
  "method": "post",
  "params": { "token": "[REDACTED]", "password": "[REDACTED]", "foo": "bar" },
  "data": {
    "authorization": "[REDACTED]",
    "nested": { "password": "[REDACTED]" }
  },
  "status": 200,
  "headers": { "authorization": "[REDACTED]" },
  "responseData": {
    "token": "[REDACTED]",
    "password": "[REDACTED]",
    "foo": "bar"
  },
  "timestamp": "2026-03-11T12:34:56.789Z"
}
```

## Dependency Audit

This package runs `npm audit` in its CI workflow to check for vulnerabilities in dependencies before publishing. Automated dependency updates and vulnerability checks are enabled.

Example GitHub Actions step:

```yaml
- name: Audit dependencies
  run: npm audit --audit-level=high
```
