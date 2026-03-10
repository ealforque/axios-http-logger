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
npm install axios-http-logger
```

## Usage

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

## Example Log Entry

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

## Testing

This package uses Jest for unit tests. Run tests with:

```bash
npm test
```

## Supply Chain Security

This package runs `npm audit` in its CI workflow to check for vulnerabilities in dependencies before publishing. Automated dependency updates and vulnerability checks are enabled for maximum supply chain security.

Example GitHub Actions step:

```yaml
- name: Audit dependencies
  run: npm audit --audit-level=high
```
