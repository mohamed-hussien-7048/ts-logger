# T.S Logger System

A Node.js service for collecting attendance records from a ZKTeco-compatible fingerprint device. It stores records in SQLite, exposes an HTTP API, and sends real-time attendance and status events through Socket.IO.

## Features

- Connect to a fingerprint device through `node-zklib`.
- Load the device's user list and use it to enrich attendance records with employee names.
- Import historical attendance logs when a device connects.
- Listen for real-time attendance events when supported by the installed device library.
- Poll the device as a fallback every two seconds.
- Store attendance records in SQLite with database-level duplicate prevention.
- Expose attendance and system status endpoints.
- Broadcast attendance and device/system status through Socket.IO.
- Shut down device, polling, HTTP, Socket.IO, and SQLite resources cleanly.

## Stack

- Node.js 18+
- Express
- Socket.IO
- SQLite through `better-sqlite3`
- `node-zklib`

## Requirements

- Node.js 18 or later.
- Network access from the server to the fingerprint device.
- A ZKTeco-compatible device supported by the installed `node-zklib` package.

## Installation

```bash
npm install
```

## Configuration

Configuration is read from environment variables. Defaults are:

| Variable | Default | Purpose |
|---|---:|---|
| `PORT` | `5000` | HTTP and Socket.IO port |
| `HOST` | `0.0.0.0` | Interface to bind |
| `DATABASE_PATH` | `data/attendance.db` | SQLite database file |
| `DEVICE_PORT` | `4370` | Default device port |
| `DEVICE_CONNECTION_TIMEOUT` | `10000` | Device connection timeout in milliseconds |
| `DEVICE_INACTIVITY_TIMEOUT` | `4000` | Device inactivity timeout in milliseconds |
| `POLLING_INTERVAL` | `2000` | Fallback polling interval in milliseconds |
| `SOCKET_CORS_ORIGIN` | `*` | Socket.IO allowed origin |

Set `SOCKET_CORS_ORIGIN` to the exact frontend origin before deploying beyond a trusted local network. The default wildcard is retained for compatibility with the supplied server behavior.

## Run

```bash
npm start
```

The default local URL is `http://localhost:5000/`.

## HTTP API

The source currently implements the following endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Server, database, and device status |
| `GET` | `/api/status` | Combined system status |
| `GET` | `/api/attendance` | All saved attendance records |
| `GET` | `/api/attendance/today` | Records for the server's local calendar date |
| `GET` | `/api/attendance/date/:date` | Records for a given date |

Date parameters should use `YYYY-MM-DD`.

Successful attendance query responses use `success`, `count`, and `data`; date-scoped responses also include `date`. Errors return HTTP 500 with `success: false` and an `error` message.

## Socket.IO Events

### Client to server

| Event | Purpose |
|---|---|
| `setup-device` | Connect to a device using `ip` and optional `port` |
| `get-device-status` | Request device status and current system status |
| `get-system-status` | Request current system status |
| `refresh-attendance` | Run the fallback attendance polling operation |

### Server to client

| Event | Purpose |
|---|---|
| `system-status` | Server, database, and device status |
| `device-status` | Device connection and monitoring status |
| `new-attendance` | A newly saved attendance record |

The `new-attendance` payload contains `date`, `userId`, `userName`, `time`, `timeOriginal`, `status`, and `deviceIp`.

## Data integrity

The `attendance` table includes a unique constraint on:

```text
(device_ip, user_id, attendance_time)
```

The insert uses SQLite `INSERT OR IGNORE`, so the database remains the final guard against duplicate records. Preserve this constraint when modifying persistence logic.

## Project structure

```text
src/
  api/
    controllers/
    routes/
  attendance/
  config/
  database/
  devices/
  realtime/
  app.js
  server.js
tests/
```

- `attendance/` normalizes user and attendance data and contains attendance processing logic.
- `database/` initializes SQLite and implements attendance persistence and queries.
- `devices/` handles device connection, initial synchronization, real-time listening, and fallback polling.
- `api/` registers HTTP endpoints and response handling.
- `realtime/` broadcasts attendance and builds system status.
- `app.js` composes dependencies and registers HTTP/Socket.IO behavior.
- `server.js` starts the process and handles termination signals.

## Tests

Run unit tests with:

```bash
npm test
```

The included tests cover date formatting and attendance/user normalization. Before production use, also test the actual hardware integration and compare API responses and Socket.IO payloads against the existing frontend.

## Important compatibility notes

This refactor is based on the supplied `server.js`. The supplied source currently connects to one active device at a time, despite the multi-device wording in its header. The implementation therefore keeps the one-active-device workflow rather than claiming simultaneous multi-device management.

The refactor keeps the HTTP endpoints and Socket.IO event names present in the supplied source. It also preserves the SQLite table's columns and uniqueness key. It has not been run against a physical device in this environment, so hardware compatibility and exact parity with the connected frontend still require integration testing.

Before exposing this service outside a trusted network, add suitable authentication and authorization for device-setup events and administrative endpoints, restrict CORS, validate inputs, and avoid logging unnecessary employee information.
