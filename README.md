# CasePilot

CasePilot is a Smart India Hackathon 2026 prototype for PS 26262: AICTE approval workflow coordination, compliance monitoring and alert management. It contains **no institutional, case, officer, document, undertaking, alert or audit seed records**. A new browser workspace is empty.

Automation can coordinate routing, workload, timelines and reminders. Statutory scrutiny, verification, inspection and decisions remain actions for competent human officials. This prototype is not an official AICTE system and its local role picker does not authenticate a person.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm install
npm run dev
```

Open `/` for the public overview, `/login` to choose a local role and attribution name, or `/app` for the workspace. No live service is configured by default. The app removes the previous `casepilot-demo-v1` browser storage entry and starts under the empty `casepilot-workspace-v1` key.

Checks:

```sh
npm test
npm run lint
npm run build
```

## Connect an approved data service

Set `VITE_CASEPILOT_API_BASE_URL` in a local `.env.local` file to the approved API base URL. The REST client validates response payloads against the Zod schemas in `src/data/schemas.ts`. It expects:

- `GET /dataset` to return a complete `CasePilotDataset` object.
- `GET /cases` to return an array of cases.
- `GET /cases/:id` to return a case object or `null`.
- `PUT /cases/:id` to accept and return a validated case object.
- `GET /audit-events` to return an array of audit events.

The browser sends same-origin credentials. The service must authenticate the caller, authorize every request and scope returned records to that caller. The prototype role picker is self-declared and must not be used as an access-control boundary. Case intake, evidence upload and other workflow writes are not connected to a service yet; the current intake page intentionally does not create local placeholder records.

## Project structure

```text
src/
  api/          Configurable REST client; no bundled backend records
  components/   Shared primitives and React Bits source
  data/         Zod contracts, empty workspace and ID utilities
  design/       Forest/cream tokens and global/landing styles
  engine/       Pure routing, stage, SLA, escalation and compliance rules
  pages/        Public overview and role-specific workflow screens
  store/        Persisted Zustand workspace and source connection state
  utils/        CSV export helpers
```

## Workflow engines

- `routeResolver.ts` resolves a route from supplied rule configuration.
- `stageMachine.ts` validates stage transitions. Returns and reverts require authorized roles and a reason.
- `slaEngine.ts` evaluates ageing against an injected current time and configured timelines.
- `escalationEngine.ts` evaluates configured thresholds for Regional Officer, Bureau Officer and Authority escalation.
- `complianceEngine.ts` evaluates document expiry, undertaking deadlines, evidence status and configured reminders.
- `humanActions.ts` records explicit human decisions and verification, including the acting person and reason.
- `rulesEngine.ts` versions rule proposals and requires a second authorized role for approval.

Engines accept `now` as an argument, which keeps time-dependent rules testable without a simulated clock in the product UI. Rules in the empty workspace are local engine defaults, not an AICTE-approved operational configuration. A connected service must provide the approved rule configuration before operational use.

## Current integration boundary

The project does not include real AICTE records, a backend, an identity provider, document storage or notification delivery. The public overview shows process concepts only; it contains no institution names, case IDs, case counts or example alert records. The API URL and server contract must be supplied by the project owner before actual records can load. The connected read client is not a substitute for an authenticated, authorized production service.

Alerts and recommendations support the approval process; they do not replace statutory scrutiny, verification, inspection or decisions by the competent authority.
