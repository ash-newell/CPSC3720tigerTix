# TigerTix — Local Dev README

This repository contains several small Express microservices and a React frontend used for the TigerTix project. The goal of this README is to help other developers build and run the project locally on Windows (PowerShell) and troubleshoot common native build / OneDrive issues.

## Prerequisites
- Node.js (16+; 18 or 20/22 recommended). Confirm with `node -v`.
- npm (bundled with Node)
- Python 3.11 (for node-gyp native builds). We recommend installing Python 3.11 and using it for rebuilds if newer Python versions lack `distutils` on your machine.
- Visual Studio Build Tools (C++ workload) for building native addons on Windows.

Optional (but recommended):
- Add Python 3.11 to your PATH or set `npm_config_python` to the python.exe path before rebuilding native modules.

## Quick start (one terminal)
1. From repo root, install dependencies:

```powershell
npm install
```

2. Rebuild sqlite3 native addon (if you get a Win32 binary error):

```powershell
# If you need to force a specific Python for node-gyp
$env:npm_config_python = 'C:\Users\<you>\AppData\Local\Programs\Python\Python311\python.exe'

# rebuild in each backend folder that depends on sqlite3
cd backend/llm-booking-service
npm rebuild sqlite3 --build-from-source
cd ..\user-authentication
npm rebuild sqlite3 --build-from-source
# repeat for any other folders that include sqlite3
```

3. Start all services in one terminal (added convenience script):

```powershell
npm run start:all
```

This uses the `concurrently` tool and will start the following (logs are interleaved):
- `backend/admin-service` (port 5001)
- `backend/client-service` (port 6001)
- `backend/llm-booking-service` (port 7001)
- `backend/user-authentication` (port 4001)
- `frontend` (React dev server, port 3000)

If a port is in use you will see `EADDRINUSE` for that service. See Troubleshooting below.

## Start an individual service
From the repo root you can also start services individually. Examples:

```powershell
# Admin
cd backend/admin-service
node server.js

# Client
cd ../client-service
node server.js

# LLM booking service
cd ../llm-booking-service
node server.js

# Auth
cd ../user-authentication
npm start

# Frontend
cd ../../frontend
npm start
```

## Tests
Run the Jest test suite from the repo root (the repo config runs tests in-band):

```powershell
npm test
```

Note: tests run with `NODE_ENV=test` which uses an in-memory DB to avoid native sqlite bindings. This keeps CI and local tests fast and portable.

## Seed the database
If you want the sample events/tickets inserted into the DB used in developer mode (LOCALAPPDATA), run:

```powershell
node backend/seed_db.cjs
```

The services create and use the SQLite database in `%LOCALAPPDATA%/TigerTix/database.sqlite` to avoid OneDrive placeholder issues.

## Troubleshooting

- SQLite native addon errors (e.g. `node_sqlite3.node is not a valid Win32 application` or `ERR_DLOPEN_FAILED`):
  - Rebuild the addon as shown above using `npm rebuild sqlite3 --build-from-source` and ensure `npm_config_python` points to a Python 3.11 executable that includes the build tools (`distutils`) on Windows.
  - Install Visual Studio Build Tools (C++ workload) if compilation fails.

- OneDrive placeholder / SQLITE_CANTOPEN (zero-byte DB file in repo):
  - The services are configured to create and use the DB in `%LOCALAPPDATA%/TigerTix` to avoid OneDrive placeholders. If you manually created `backend/shared-db/database.sqlite` and it is zero bytes, remove it and let the admin service create the real DB, or run the seed script.

- Port already in use (EADDRINUSE):
  - Find the owner: `netstat -ano | findstr ":<port>"`
  - Get command line for PID: `Get-CimInstance Win32_Process -Filter "ProcessId=<PID>" | Select-Object ProcessId, CommandLine`
  - Kill it (PowerShell): `Stop-Process -Id <PID> -Force`

- Auth service not reachable after start (connections refused):
  - Check the service startup logs in the terminal started by `npm run start:all` or the individual service terminal. The auth server has a `/health` endpoint at `/health` that returns `{ ok: true, service: 'user-authentication' }` for quick checks.

## Environment variables
- `PORT` — Override service port when starting (example: `$env:PORT='4101'; npm start`).
- `NODE_ENV=test` — Use the in-memory DB and avoid native sqlite usage (useful for tests or if you can't build sqlite locally).
- `npm_config_python` — When building native modules, point this to a Python executable (e.g. Python 3.11) used by node-gyp.

## Notes / Recommendations
- For everyday dev, run `npm run start:all` in a single terminal. If you need to attach a debugger or inspect a single service, start that one individually.
- If you frequently hit native-build issues, consider using Docker with a known-good image or switching to a pure-JS SQLite driver for portability.

If anything here fails on your machine I can add platform-specific helper scripts (PowerShell start-all with per-service logs) or help rebuild the sqlite3 addon step-by-step.

---
Last updated: 2025-11-06
